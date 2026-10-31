import re
import json
import logging
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.models import (
    ResearchSession,
    Requirement,
    AtomicClaim,
    EvidenceLink,
    Source,
    Contradiction,
    GapFinding,
)
from app.schemas.findings import GapFindingResponse, EvidenceReference
from app.intelligence.embeddings import generate_embeddings
import numpy as np

logger = logging.getLogger(__name__)

# The 6 canonical finding types
FINDING_COVERED = "COVERED"
FINDING_MISSING = "MISSING"
FINDING_INCOMPLETE = "INCOMPLETE"
FINDING_POTENTIAL_CONFLICT = "POTENTIAL CONFLICT"
FINDING_POTENTIALLY_OUTDATED = "POTENTIALLY OUTDATED"
FINDING_UNVERIFIED = "UNVERIFIED"

REFERENCE_CURRENT_YEAR = 2026


class GapDetectionEngine:
    """
    Central Information Gap Detection Engine for PROOFPATH AI.
    Executes the 10-step intelligence algorithm across all research requirements,
    detecting: COVERED, MISSING, INCOMPLETE, POTENTIAL CONFLICT, POTENTIALLY OUTDATED, and UNVERIFIED.
    Strictly enforces that absence of evidence is never framed as proof of falsehood.
    """

    @classmethod
    def evaluate_session(
        cls,
        db: Session,
        session_id: str,
        persist: bool = True
    ) -> List[GapFinding]:
        """
        Executes end-to-end gap analysis for a research session.
        Applies the 10-step algorithm to every requirement and optionally persists findings to SQLite.
        """
        session = db.query(ResearchSession).filter(ResearchSession.id == session_id).first()
        if not session:
            raise ValueError(f"Session '{session_id}' not found.")

        requirements = (
            db.query(Requirement)
            .filter(Requirement.session_id == session_id)
            .order_by(Requirement.order_index)
            .all()
        )
        sources = db.query(Source).filter(Source.session_id == session_id).all()
        claims = (
            db.query(AtomicClaim)
            .join(AtomicClaim.chunk)
            .join(Source)
            .filter(Source.session_id == session_id)
            .all()
        )
        evidence_links = (
            db.query(EvidenceLink)
            .join(Requirement)
            .filter(Requirement.session_id == session_id)
            .all()
        )
        contradictions = (
            db.query(Contradiction)
            .filter(Contradiction.session_id == session_id)
            .all()
        )

        findings: List[GapFinding] = []

        for req in requirements:
            finding = cls.evaluate_requirement(
                requirement=req,
                session_sources=sources,
                session_claims=claims,
                session_links=evidence_links,
                session_conflicts=contradictions,
                session_id=session_id
            )
            findings.append(finding)

        if persist:
            # Delete old findings for this session for idempotency
            db.query(GapFinding).filter(GapFinding.session_id == session_id).delete()
            db.commit()

            for f in findings:
                db.add(f)
            db.commit()

            # Refresh persisted findings
            for f in findings:
                db.refresh(f)

        return findings

    @classmethod
    def evaluate_requirement(
        cls,
        requirement: Requirement,
        session_sources: List[Source],
        session_claims: List[AtomicClaim],
        session_links: List[EvidenceLink],
        session_conflicts: List[Contradiction],
        session_id: str
    ) -> GapFinding:
        """
        Executes the 10-step gap detection algorithm for an individual research requirement.
        """
        req_text = requirement.requirement_text
        req_query = f"{req_text} {requirement.question or ''} {requirement.category or ''}".strip()

        # Step 1: Retrieve relevant evidence
        linked_claims = [
            link.claim for link in session_links
            if link.requirement_id == requirement.id and link.claim is not None
        ]

        # Step 2: Evaluate semantic relevance
        relevant_claims: List[Tuple[AtomicClaim, float]] = []
        for claim in linked_claims:
            link = next((l for l in session_links if l.requirement_id == requirement.id and l.claim_id == claim.id), None)
            score = link.similarity_score if link else 0.5
            if score >= 0.28:
                relevant_claims.append((claim, score))

        # If no linked claims, test session claims directly
        if not relevant_claims and session_claims:
            for claim in session_claims:
                if claim.category and requirement.category and claim.category.lower() == requirement.category.lower():
                    relevant_claims.append((claim, 0.40))

        # Step 3: Check answer completeness
        claim_count = len(relevant_claims)

        # Step 4: Compare related claims (Conflict Check)
        has_direct_conflict = any(
            c.requirement_id == requirement.id for c in session_conflicts
        )
        conflicting_claims_detected = has_direct_conflict

        if not conflicting_claims_detected and claim_count >= 2:
            # Check for divergent quantitative metrics or opposing assertions
            texts = [c[0].claim_text.lower() for c in relevant_claims]
            has_refute = any("refutes" in getattr(l, "relation_type", "") for l in session_links if l.requirement_id == requirement.id)
            if has_refute:
                conflicting_claims_detected = True

        # Step 5: Evaluate dates and applicable periods (Temporal Outdated Check)
        is_outdated = False
        outdated_details = []
        for claim, _ in relevant_claims:
            period_str = str(claim.applicable_period or claim.date_reference or "")
            year_match = re.search(r'\b(20[0-2][0-9])\b', period_str)
            if year_match:
                year = int(year_match.group(1))
                if year < REFERENCE_CURRENT_YEAR - 2:  # E.g. older than 2024
                    is_outdated = True
                    outdated_details.append(f"Claim cites expired period ({year}).")

            # Check source publication date
            chunk = claim.chunk
            src = chunk.source if chunk else None
            if src and src.publication_date:
                pub_year = src.publication_date.year
                if pub_year < REFERENCE_CURRENT_YEAR - 3:
                    is_outdated = True
                    outdated_details.append(f"Source '{src.title}' published in {pub_year}.")

        # Step 6: Evaluate source quality (Unverified Check)
        is_unverified = False
        unverified_reasons = []
        if claim_count > 0:
            for claim, _ in relevant_claims:
                if not claim.is_verified:
                    is_unverified = True
                    unverified_reasons.append(f"Claim '{claim.claim_text[:40]}...' lacks exact verbatim substring grounding.")
                elif claim.extraction_confidence and claim.extraction_confidence < 0.70:
                    is_unverified = True
                    unverified_reasons.append(f"Low extraction confidence ({claim.extraction_confidence:.2f}).")

        # Step 7: Assign finding status (Priority Order)
        if conflicting_claims_detected:
            finding_type = FINDING_POTENTIAL_CONFLICT
            priority = "critical" if requirement.is_decision_critical else "high"
            confidence = 0.92
        elif is_outdated:
            finding_type = FINDING_POTENTIALLY_OUTDATED
            priority = "high"
            confidence = 0.88
        elif is_unverified:
            finding_type = FINDING_UNVERIFIED
            priority = "medium"
            confidence = 0.85
        elif claim_count == 0:
            finding_type = FINDING_MISSING
            priority = "critical" if requirement.is_decision_critical else "high"
            confidence = 0.95
        elif claim_count == 1:
            finding_type = FINDING_INCOMPLETE
            priority = "medium"
            confidence = 0.89
        else:
            finding_type = FINDING_COVERED
            priority = "low"
            confidence = 0.94

        # Step 8: Generate explanation (Enforcing strict anti-hallucination mandate)
        if finding_type == FINDING_MISSING:
            explanation = (
                f"No relevant evidence was found in the reviewed sources to answer: '{req_text}'. "
                "IMPORTANT: This absence of evidence must not be presented as proof that the condition is false or nonexistent; "
                "it strictly signifies that the provided source documents are completely silent on this criterion."
            )
        elif finding_type == FINDING_INCOMPLETE:
            single_claim = relevant_claims[0][0].claim_text if relevant_claims else "Single citation"
            explanation = (
                f"Partial evidence exists ({single_claim}), but critical parameters, thresholds, or procedural stipulations "
                "remain unanswered across the reviewed sources. Independent corroboration is missing."
            )
        elif finding_type == FINDING_POTENTIAL_CONFLICT:
            explanation = (
                f"Multiple claims retrieved for '{req_text}' present incompatible or contradictory assertions. "
                "Conflicting benchmarks or divergent conditions require direct comparative reconciliation."
            )
        elif finding_type == FINDING_POTENTIALLY_OUTDATED:
            explanation = (
                f"Retrieved evidence for '{req_text}' relates to an older or potentially expired temporal period "
                f"({', '.join(outdated_details[:2]) or 'pre-2024'}). It may no longer reflect active operational guidelines."
            )
        elif finding_type == FINDING_UNVERIFIED:
            explanation = (
                f"A claim addressing '{req_text}' was identified, but its authenticity, exact verbatim grounding, or source authority "
                "could not be reliably validated against primary document text."
            )
        else:  # COVERED
            explanation = (
                f"Sufficient relevant evidence ({claim_count} corroborated statements) addresses this requirement. "
                "The criterion is thoroughly substantiated across reviewed documents."
            )

        # Step 9: Attach evidence
        evidence_refs: List[Dict[str, Any]] = []
        supporting_claim_ids = []
        source_ids = []

        for claim, sim_score in relevant_claims:
            supporting_claim_ids.append(claim.id)
            chunk = claim.chunk
            src = chunk.source if chunk else None
            src_id = src.id if src else (claim.source_id or "")
            if src_id and src_id not in source_ids:
                source_ids.append(src_id)

            evidence_refs.append({
                "claim_id": claim.id,
                "claim_text": claim.claim_text,
                "exact_quote": claim.original_evidence_text or claim.exact_quote,
                "source_id": src_id,
                "source_title": src.title if src else "Source Document",
                "source_type": src.source_type if src else "text",
                "page_number": claim.page_number or (chunk.page_number if chunk else None),
                "paragraph_reference": claim.paragraph_reference,
                "source_uri": src.uri if src else None,
                "confidence": claim.confidence_score,
            })

        # Step 10: Recommend a verification action & state limitations
        if finding_type == FINDING_MISSING:
            recommended_action = (
                f"Directly consult the issuing authority or request primary policy guidelines for '{requirement.category}'. "
                "Submit a specific inquiry regarding unstated parameters."
            )
            limitations = (
                "Conclusion is strictly bounded by the ingested corpus. Absence of evidence does not indicate "
                "policy invalidity, but source silence."
            )
        elif finding_type == FINDING_INCOMPLETE:
            recommended_action = (
                "Request supplementary documentation or official annexes to substantiate missing secondary parameters."
            )
            limitations = "Available sources only provide partial context without comprehensive operational clauses."
        elif finding_type == FINDING_POTENTIAL_CONFLICT:
            recommended_action = (
                "Request formal clarification from project stakeholders to determine which document takes legal or architectural precedence."
            )
            limitations = "Algorithm detected divergent assertions across sources; cannot resolve conflict without stakeholder ruling."
        elif finding_type == FINDING_POTENTIALLY_OUTDATED:
            recommended_action = (
                f"Acquire the active {REFERENCE_CURRENT_YEAR} edition of the documentation to verify whether prior stipulations were superseded."
            )
            limitations = "Temporal evaluation is based on extracted date strings and metadata headers."
        elif finding_type == FINDING_UNVERIFIED:
            recommended_action = (
                "Locate the primary unedited document to confirm verbatim text and verify publisher authority."
            )
            limitations = "Claim text lacks 100% exact substring match in extracted source chunks."
        else:  # COVERED
            recommended_action = "Archive citations in the audit dossier for human compliance sign-off."
            limitations = "Based on mutual corroboration in current ingested documents."

        return GapFinding(
            session_id=session_id,
            requirement_id=requirement.id,
            finding_type=finding_type,
            explanation=explanation,
            supporting_claim_ids=json.dumps(supporting_claim_ids),
            source_ids=json.dumps(source_ids),
            evidence_references=json.dumps(evidence_refs),
            confidence=confidence,
            priority=priority,
            recommended_action=recommended_action,
            limitations=limitations,
        )
