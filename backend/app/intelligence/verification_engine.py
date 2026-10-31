import json
import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models import (
    ResearchSession,
    VerificationTask,
    GapFinding,
    Contradiction,
    Requirement,
)
from app.intelligence.gap_detection_engine import (
    FINDING_MISSING,
    FINDING_INCOMPLETE,
    FINDING_POTENTIAL_CONFLICT,
    FINDING_POTENTIALLY_OUTDATED,
    FINDING_UNVERIFIED,
)

logger = logging.getLogger("proofpath.verification")


class VerificationPlannerEngine:
    """
    Intelligent Task Generation Engine for PROOFPATH AI.
    Converts forensic investigation findings (missing evidence, incomplete criteria,
    contradictions, temporal decay, unverified claims) into prioritized, actionable verification tasks.
    """

    TASK_MISSING = "verify_missing_information"
    TASK_INCOMPLETE = "resolve_incomplete_requirements"
    TASK_CONFLICT = "investigate_conflicting_claims"
    TASK_OUTDATED = "check_outdated_information"
    TASK_UNVERIFIED = "validate_unverified_claims"
    TASK_CUSTOM = "custom"

    @classmethod
    def generate_tasks_for_session(
        cls,
        db: Session,
        session_id: str,
        persist: bool = True
    ) -> List[VerificationTask]:
        """
        Synthesizes structured verification tasks from all session findings,
        deduplicating against existing tasks and preserving user-modified states.
        """
        session = db.query(ResearchSession).filter(ResearchSession.id == session_id).first()
        if not session:
            return []

        # 1. Fetch existing tasks
        existing_tasks = db.query(VerificationTask).filter(VerificationTask.session_id == session_id).all()
        existing_signatures = {
            (t.task_type, t.related_requirement_id or t.title): t
            for t in existing_tasks
        }

        generated_tasks: List[VerificationTask] = []

        # 2. Derive tasks from GapFinding entities
        gap_findings = db.query(GapFinding).filter(GapFinding.session_id == session_id).all()

        for f in gap_findings:
            req = f.requirement
            req_text = req.requirement_text if req else "Evaluation Criterion"
            req_id = f.requirement_id

            evidence_refs = []
            if f.evidence_references:
                try:
                    raw_refs = json.loads(f.evidence_references) if isinstance(f.evidence_references, str) else f.evidence_references
                    evidence_refs = [
                        {
                            "source_title": r.get("source_title", "Evidence Source"),
                            "exact_quote": r.get("exact_quote", ""),
                            "page_number": r.get("page_number"),
                            "source_id": r.get("source_id"),
                            "source_type": r.get("source_type", "pdf"),
                            "confidence": float(r.get("confidence", 1.0)),
                        }
                        for r in raw_refs
                    ]
                except Exception:
                    evidence_refs = []

            evidence_json = json.dumps(evidence_refs) if evidence_refs else None

            # Map finding_type to task_type and priority
            if f.finding_type == FINDING_MISSING:
                task_type = cls.TASK_MISSING
                priority = "critical" if getattr(req, "is_decision_critical", False) else "high"
                title = f"Verify Missing Information: {req_text}"
                description = (
                    f"No empirical evidence was located in provided sources for '{req_text}'. "
                    f"Action: Consult official program authorities, program guidelines, or request secondary documentation."
                )
                recommended_action = f.recommended_action or "Submit formal inquiry to program officers."

            elif f.finding_type == FINDING_INCOMPLETE:
                task_type = cls.TASK_INCOMPLETE
                priority = "medium"
                title = f"Resolve Incomplete Requirement: {req_text}"
                description = (
                    f"Only partial evidentiary support was found for '{req_text}'. "
                    f"Key sub-criteria or specific application conditions remain unaddressed."
                )
                recommended_action = f.recommended_action or "Review secondary addenda for omitted sub-clauses."

            elif f.finding_type == FINDING_POTENTIAL_CONFLICT:
                task_type = cls.TASK_CONFLICT
                priority = "critical" if f.priority == "critical" else "high"
                title = f"Investigate Conflicting Claims: {req_text}"
                description = f.explanation or f"Incompatible claims exist across sources for '{req_text}'. Direct reconciliation required."
                recommended_action = f.recommended_action or "Compare document effective dates and stakeholder jurisdiction."

            elif f.finding_type == FINDING_POTENTIALLY_OUTDATED:
                task_type = cls.TASK_OUTDATED
                priority = "medium"
                title = f"Check Outdated Information: {req_text}"
                description = (
                    f"Evidence regarding '{req_text}' may be outdated, expired, or superseded by a newer application cycle."
                )
                recommended_action = f.recommended_action or "Check governing website for latest policy gazette."

            elif f.finding_type == FINDING_UNVERIFIED:
                task_type = cls.TASK_UNVERIFIED
                priority = "low"
                title = f"Validate Unverified Claims: {req_text}"
                description = (
                    f"Assertions for '{req_text}' have lower extraction confidence or lack independent cross-source corroboration."
                )
                recommended_action = f.recommended_action or "Locate secondary confirming source."

            else:
                continue

            sig = (task_type, req_id or title)
            if sig in existing_signatures:
                # Update existing task metadata without overwriting completion status or notes
                t = existing_signatures[sig]
                t.description = description
                t.evidence_references_json = evidence_json
                t.recommended_action = recommended_action
                generated_tasks.append(t)
            else:
                task = VerificationTask(
                    session_id=session_id,
                    task_type=task_type,
                    title=title,
                    description=description,
                    priority=priority,
                    related_requirement_id=req_id,
                    related_requirement_text=req_text,
                    related_finding_id=f.id,
                    evidence_references_json=evidence_json,
                    recommended_action=recommended_action,
                    is_completed=False,
                    is_custom=False,
                )
                if persist:
                    db.add(task)
                generated_tasks.append(task)
                existing_signatures[sig] = task

        # 3. Derive tasks from standalone Contradiction entities
        contradictions = db.query(Contradiction).filter(Contradiction.session_id == session_id).all()
        for c in contradictions:
            task_type = cls.TASK_CONFLICT
            title = f"Investigate Conflicting Claims: {c.conflicting_aspect}"
            sig = (task_type, c.requirement_id or title)
            if sig in existing_signatures:
                continue

            evidence_refs = []
            if c.claim_a:
                src_a = c.claim_a.source.title if c.claim_a.source else (c.claim_a.chunk.source.title if c.claim_a.chunk and c.claim_a.chunk.source else "Source A")
                evidence_refs.append({
                    "source_title": src_a,
                    "exact_quote": c.claim_a.exact_quote or c.claim_a.claim_text,
                    "page_number": c.claim_a.page_number or (c.claim_a.chunk.page_number if c.claim_a.chunk else None),
                    "source_id": c.claim_a.source_id or (c.claim_a.chunk.source_id if c.claim_a.chunk else None),
                    "confidence": float(c.claim_a.confidence_score or 1.0),
                })
            if c.claim_b:
                src_b = c.claim_b.source.title if c.claim_b.source else (c.claim_b.chunk.source.title if c.claim_b.chunk and c.claim_b.chunk.source else "Source B")
                evidence_refs.append({
                    "source_title": src_b,
                    "exact_quote": c.claim_b.exact_quote or c.claim_b.claim_text,
                    "page_number": c.claim_b.page_number or (c.claim_b.chunk.page_number if c.claim_b.chunk else None),
                    "source_id": c.claim_b.source_id or (c.claim_b.chunk.source_id if c.claim_b.chunk else None),
                    "confidence": float(c.claim_b.confidence_score or 1.0),
                })

            req_text = c.requirement.requirement_text if c.requirement else c.conflicting_aspect
            task = VerificationTask(
                session_id=session_id,
                task_type=task_type,
                title=title,
                description=c.explanation or c.synthesis_verdict or f"Conflicting assertions detected between {evidence_refs[0]['source_title'] if evidence_refs else 'sources'} and other sources.",
                priority="critical" if c.severity == "high" else "high",
                related_requirement_id=c.requirement_id,
                related_requirement_text=req_text,
                related_finding_id=c.id,
                evidence_references_json=json.dumps(evidence_refs) if evidence_refs else None,
                recommended_action=getattr(c, "recommended_action", None) or "Arbitrate conflict based on publication timeline and jurisdiction.",
                is_completed=False,
                is_custom=False,
            )
            if persist:
                db.add(task)
            generated_tasks.append(task)
            existing_signatures[sig] = task

        # 4. Include existing custom tasks
        for t in existing_tasks:
            if t.is_custom and t not in generated_tasks:
                generated_tasks.append(t)

        if persist:
            db.commit()

        # Sort tasks: critical first, then high, medium, low; then pending before completed
        priority_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
        generated_tasks.sort(key=lambda x: (x.is_completed, priority_order.get(x.priority.lower(), 4)))
        return generated_tasks
