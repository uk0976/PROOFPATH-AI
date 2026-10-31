import re
import json
import logging
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from app.models import Source, AtomicClaim, ResearchSession

logger = logging.getLogger("proofpath.temporal_engine")

# Regex patterns for temporal metadata extraction
EFFECTIVE_DATE_PATTERNS = [
    re.compile(r"\b(?:effective\s+(?:from|as of|on)?|takes effect|in force from)\s+([A-Za-z]+ \d{1,2},? \d{4}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2})", re.IGNORECASE),
    re.compile(r"\b(?:commencing|operative from)\s+([A-Za-z]+ \d{4}|\d{4})", re.IGNORECASE),
]

EXPIRY_DATE_PATTERNS = [
    re.compile(r"\b(?:expires?(?: on)?|valid (?:until|through|to)|deadline(?:\s+is)?|last date(?:\s+for)?)\s+([A-Za-z]+ \d{1,2},? \d{4}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2})", re.IGNORECASE),
    re.compile(r"\b(?:validity expires)\s+([A-Za-z]+ \d{4}|\d{4})", re.IGNORECASE),
]

ACADEMIC_YEAR_PATTERNS = [
    re.compile(r"\bacademic\s+(?:year|session)\s*(?:of\s*)?(\d{4}[-–/]\d{2,4})\b", re.IGNORECASE),
    re.compile(r"\b(?:ay|session)\s*[:\-]?\s*(\d{4}[-–/]\d{2,4})\b", re.IGNORECASE),
    re.compile(r"\b(202[0-9][-–]20?2[0-9])\b"),
]

APPLICATION_CYCLE_PATTERNS = [
    re.compile(r"\b(fall|spring|summer|winter)\s+(?:intake|semester|term|cycle)?\s*(\d{4})\b", re.IGNORECASE),
    re.compile(r"\b(cycle\s*[0-9]|round\s*[0-9]|phase\s*[0-9]|intake\s*202[0-9])\b", re.IGNORECASE),
    re.compile(r"\b(202[0-9]\s*(?:annual|admissions?|scholarship)\s*cycle)\b", re.IGNORECASE),
]

SUPERSEDES_PATTERNS = [
    re.compile(r"\b(?:supersedes|replaces|repeals|overrides|rescinds)\s+(?:circular|notice|guidelines?|order|policy|version)?\s*(?:no\.?|#)?\s*([A-Za-z0-9\-/_.]+)", re.IGNORECASE),
    re.compile(r"\bthis\s+document\s+supersedes\s+all\s+previous\s+(?:versions|editions|guidelines)", re.IGNORECASE),
]

DRAFT_PATTERNS = [
    re.compile(r"\b(draft|provisional|for review only|subject to (?:approval|change))\b", re.IGNORECASE)
]


class TemporalMetadataExtractor:
    """
    Extracts publication date, last modified date, effective date, expiry date,
    academic year, application cycle, and access date from source text and metadata.
    """

    @classmethod
    def extract_dates_from_text(cls, text: str) -> Dict[str, Any]:
        result = {
            "effective_date_str": None,
            "expiry_date_str": None,
            "academic_year": None,
            "application_cycle": None,
            "supersedes_reference": None,
            "is_draft": False,
        }

        if not text:
            return result

        # Effective date
        for pat in EFFECTIVE_DATE_PATTERNS:
            m = pat.search(text)
            if m:
                result["effective_date_str"] = m.group(1)
                break

        # Expiry date
        for pat in EXPIRY_DATE_PATTERNS:
            m = pat.search(text)
            if m:
                result["expiry_date_str"] = m.group(1)
                break

        # Academic year
        for pat in ACADEMIC_YEAR_PATTERNS:
            m = pat.search(text)
            if m:
                result["academic_year"] = m.group(1)
                break

        # Application cycle
        for pat in APPLICATION_CYCLE_PATTERNS:
            m = pat.search(text)
            if m:
                result["application_cycle"] = m.group(0).strip().title()
                break

        # Supersedes
        for pat in SUPERSEDES_PATTERNS:
            m = pat.search(text)
            if m:
                result["supersedes_reference"] = m.group(1) if m.lastindex else "All previous editions"
                break

        # Draft
        for pat in DRAFT_PATTERNS:
            if pat.search(text):
                result["is_draft"] = True
                break

        return result


class TemporalIntelligenceEngine:
    """
    Forensic Temporal Intelligence Engine.
    Evaluates document applicability, identifies superseded notices, expired information,
    application cycle differences, missing date metadata, and temporal decay risks.
    STRICT MANDATE:
    - Does not assume that the newest source is automatically correct.
    - Does not assume that an older document is automatically invalid.
    - Evaluates applicability, governing scope, and official status rather than raw publication age.
    """

    @classmethod
    def audit_session_temporal(
        cls,
        db: Session,
        session_id: str,
        persist: bool = True
    ) -> Dict[str, Any]:
        """
        Audits all sources and claims in a research session for temporal integrity.
        """
        sources = db.query(Source).filter(Source.session_id == session_id).all()
        source_ids = [s.id for s in sources]
        if source_ids:
            from app.models import DocumentChunk
            claims = (
                db.query(AtomicClaim)
                .filter(
                    (AtomicClaim.source_id.in_(source_ids)) |
                    (AtomicClaim.chunk.has(DocumentChunk.source_id.in_(source_ids)))
                )
                .all()
            )
        else:
            claims = []

        now = datetime.now(timezone.utc)
        audits = []

        active_count = 0
        superseded_count = 0
        expired_count = 0
        differing_cycle_count = 0
        missing_metadata_count = 0

        # Build map of sources by title/domain to detect superseding versions
        for s in sources:
            content = (s.cleaned_content or s.raw_content or "")[:15000]
            extracted = TemporalMetadataExtractor.extract_dates_from_text(content)

            # Assign extracted metadata if not already present
            if not s.academic_year and extracted["academic_year"]:
                s.academic_year = extracted["academic_year"]
            if not s.application_cycle and extracted["application_cycle"]:
                s.application_cycle = extracted["application_cycle"]
            if not s.access_date:
                s.access_date = s.extraction_timestamp or now

            # Parse dates
            pub_date = s.publication_date
            last_mod = s.last_modified_date
            effective_date = s.effective_date
            expiry_date = s.expiry_date

            # Calculate age in months
            age_months = None
            ref_date = pub_date or last_mod
            if ref_date:
                if ref_date.tzinfo is None:
                    ref_date = ref_date.replace(tzinfo=timezone.utc)
                age_months = round((now - ref_date).days / 30.0, 1)

            # Evaluate Applicability Status
            status = "CURRENT_ACTIVE"
            decay_risk = "none"
            verdict = ""
            action = "Source is considered legally and operationally active for the current research cycle."
            superseded_by_id = None
            superseded_by_title = None

            # 1. Check if explicitly expired
            exp_check = expiry_date
            if exp_check:
                if exp_check.tzinfo is None:
                    exp_check = exp_check.replace(tzinfo=timezone.utc)
                if exp_check < now:
                    status = "EXPIRED"
                    decay_risk = "high"
                    expired_count += 1
                    verdict = (
                        f"Information Expired: Source specifies a formal expiry deadline ({exp_check.strftime('%Y-%m-%d')}) "
                        f"which has elapsed. Provisions in this document may no longer be legally enforceable."
                    )
                    action = "Do not rely on expired deadlines or fee schedules; procure the latest renewal notification."

            if status != "EXPIRED":
                # 2. Missing Metadata Check
                if not pub_date and not last_mod and not effective_date and not extracted["effective_date_str"] and not extracted["academic_year"]:
                    status = "MISSING_METADATA"
                    decay_risk = "medium"
                    missing_metadata_count += 1
                    verdict = (
                        "Source lacks explicit publication timestamps, effective dates, or academic session numbers. "
                        "Recency and operative validity cannot be verified from document headers alone."
                    )
                    action = "Verify publication date with issuing department or official web domain."

                # 3. Check if provisional or future effective
                elif extracted["is_draft"]:
                    status = "PROVISIONAL_FUTURE"
                    decay_risk = "medium"
                    verdict = (
                        "Provisional / Draft Status: Document indicates draft status or is subject to formal governmental approval. "
                        "Current active policy remains in force until this draft is formally gazetted."
                    )
                    action = "Check whether final gazette approval has been issued before basing decisions on draft provisions."

                # 4. Check for Cross-Source Supersession
                else:
                    # Check if another source in the same session supersedes this source
                    is_superseded = False
                    for other_s in sources:
                        if other_s.id == s.id:
                            continue
                        other_content = (other_s.cleaned_content or "")[:15000].lower()
                        # Check if other source mentions s.title or supersedes pattern
                        if s.title.lower() in other_content and ("supersedes" in other_content or "replaces" in other_content):
                            is_superseded = True
                            superseded_by_id = other_s.id
                            superseded_by_title = other_s.title
                            break
                        # Also check if same publisher and newer cycle exists
                        if (s.author_or_publisher and other_s.author_or_publisher and
                            s.author_or_publisher == other_s.author_or_publisher and
                            s.academic_year and other_s.academic_year and
                            s.academic_year < other_s.academic_year):
                            is_superseded = True
                            superseded_by_id = other_s.id
                            superseded_by_title = other_s.title
                            break

                    if is_superseded:
                        status = "SUPERSEDED"
                        decay_risk = "high"
                        superseded_count += 1
                        verdict = (
                            f"Superseded Notice: This document has been formally superseded by newer circular '{superseded_by_title}'. "
                            f"Its figures represent historical guidelines rather than current requirements."
                        )
                        action = f"Switch primary reference to newer document '{superseded_by_title}'."

                    # 5. Check if different historical application cycle
                    elif s.academic_year and any(yr in str(s.academic_year) for yr in ["2020", "2021", "2022", "2023"]):
                        status = "DIFFERENT_CYCLE"
                        decay_risk = "medium"
                        differing_cycle_count += 1
                        verdict = (
                            f"Historical Cycle: Document specifies academic session '{s.academic_year}'. While structurally informative, "
                            f"procedural deadlines and eligibility percentages may differ for current 2026 admissions."
                        )
                        action = f"Confirm whether the governing body has issued an update for the 2026-2027 cycle."

                    # 6. Older document but NOT superseded -> evaluate applicability
                    elif age_months and age_months > 36:
                        # Epistemic safeguard: Do not assume older is automatically invalid!
                        status = "CURRENT_ACTIVE"
                        decay_risk = "low"
                        active_count += 1
                        verdict = (
                            f"Active Foundational Document ({age_months} months old): Although published in "
                            f"{pub_date.strftime('%Y') if pub_date else 'earlier years'}, no superseding notice exists. "
                            f"Foundational institutional statutes and core frameworks remain authoritative until repealed."
                        )
                        action = "Verify if any recent amendments or administrative circulars modify specific sub-clauses."

                    else:
                        status = "CURRENT_ACTIVE"
                        decay_risk = "none"
                        active_count += 1
                        verdict = (
                            f"Current and Operative: Source is fresh (approx. {age_months or 0} months old), "
                            f"aligns with active application cycle '{s.academic_year or s.application_cycle or '2026'}', "
                            f"and carries complete provenance."
                        )

            # Identify stale or cycle-specific claims for this source
            source_claims = [c for c in claims if c.source_id == s.id or (c.chunk and c.chunk.source_id == s.id)]
            stale_claims_list = []
            for sc in source_claims:
                date_ref = sc.date_reference or sc.applicable_period
                if date_ref and any(yr in str(date_ref) for yr in ["2020", "2021", "2022", "2023"]):
                    stale_claims_list.append({
                        "id": sc.id,
                        "source_id": s.id,
                        "source_title": s.title,
                        "source_type": s.source_type,
                        "source_uri": s.uri,
                        "page_number": sc.page_number,
                        "paragraph_reference": sc.paragraph_reference,
                        "category": sc.category,
                        "claim_text": sc.claim_text,
                        "exact_quote": sc.exact_quote,
                        "date_reference": sc.date_reference,
                        "applicable_period": sc.applicable_period,
                        "confidence_score": sc.confidence_score or 1.0,
                    })

            audit_item = {
                "source_id": s.id,
                "source_title": s.title,
                "source_type": s.source_type,
                "uri": s.uri,
                "publication_date": pub_date.strftime("%Y-%m-%d") if pub_date else None,
                "last_modified_date": last_mod.strftime("%Y-%m-%d") if last_mod else None,
                "effective_date": effective_date.strftime("%Y-%m-%d") if effective_date else extracted["effective_date_str"],
                "expiry_date": expiry_date.strftime("%Y-%m-%d") if expiry_date else extracted["expiry_date_str"],
                "academic_year": s.academic_year,
                "application_cycle": s.application_cycle,
                "access_date": s.access_date.strftime("%Y-%m-%d") if s.access_date else None,
                "age_in_months": age_months,
                "status": status,
                "applicability_verdict": verdict,
                "decay_risk": decay_risk,
                "superseded_by_source_id": superseded_by_id,
                "superseded_by_title": superseded_by_title,
                "stale_claims": stale_claims_list,
                "recommended_action": action,
            }
            audits.append(audit_item)

        if persist:
            db.commit()

        return {
            "research_id": session_id,
            "total_sources": len(sources),
            "active_sources": active_count,
            "superseded_sources": superseded_count,
            "expired_sources": expired_count,
            "differing_cycle_sources": differing_cycle_count,
            "missing_metadata_sources": missing_metadata_count,
            "audits": audits,
        }
