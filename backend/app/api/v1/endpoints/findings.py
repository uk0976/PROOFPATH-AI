from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models import (
    ResearchSession,
    Contradiction,
    Requirement,
    EvidenceLink,
    Source,
    AtomicClaim,
)
from app.schemas.findings import (
    ContradictionResponse,
    InformationGapResponse,
    TemporalDecayResponse,
    ClaimSnippet,
)
from app.agents.gap_detector import GapDetectorAgent
from app.agents.temporal_analyzer import TemporalAnalyzerAgent

router = APIRouter(prefix="/findings", tags=["Findings & Forensic Audits"])


@router.get("/{session_id}/conflicts", response_model=List[ContradictionResponse])
def get_conflicts(session_id: str, db: Session = Depends(get_db)):
    conflicts = db.query(Contradiction).filter(Contradiction.session_id == session_id).all()
    results = []

    for c in conflicts:
        req_text = c.requirement.requirement_text if c.requirement else "Cross-cutting requirement"
        claim_a = c.claim_a
        claim_b = c.claim_b

        source_a_title = claim_a.chunk.source.title if claim_a and claim_a.chunk and claim_a.chunk.source else "Source A"
        source_a_id = claim_a.chunk.source_id if claim_a and claim_a.chunk else ""
        source_a_type = claim_a.chunk.source.source_type if claim_a and claim_a.chunk and claim_a.chunk.source else "pdf"
        page_a = claim_a.chunk.page_number if claim_a and claim_a.chunk else None

        source_b_title = claim_b.chunk.source.title if claim_b and claim_b.chunk and claim_b.chunk.source else "Source B"
        source_b_id = claim_b.chunk.source_id if claim_b and claim_b.chunk else ""
        source_b_type = claim_b.chunk.source.source_type if claim_b and claim_b.chunk and claim_b.chunk.source else "url"
        page_b = claim_b.chunk.page_number if claim_b and claim_b.chunk else None

        results.append(
            ContradictionResponse(
                id=c.id,
                session_id=c.session_id,
                requirement_id=c.requirement_id,
                requirement_text=req_text,
                severity=c.severity,
                conflicting_aspect=c.conflicting_aspect,
                synthesis_verdict=c.synthesis_verdict,
                claim_a=ClaimSnippet(
                    id=claim_a.id,
                    source_id=source_a_id,
                    source_title=source_a_title,
                    source_type=source_a_type,
                    page_number=page_a,
                    claim_text=claim_a.claim_text,
                    exact_quote=claim_a.exact_quote,
                    date_reference=claim_a.date_reference,
                    confidence_score=claim_a.confidence_score
                ),
                claim_b=ClaimSnippet(
                    id=claim_b.id,
                    source_id=source_b_id,
                    source_title=source_b_title,
                    source_type=source_b_type,
                    page_number=page_b,
                    claim_text=claim_b.claim_text,
                    exact_quote=claim_b.exact_quote,
                    date_reference=claim_b.date_reference,
                    confidence_score=claim_b.confidence_score
                ),
                created_at=c.created_at
            )
        )
    return results


@router.get("/{session_id}/gaps", response_model=List[InformationGapResponse])
async def get_information_gaps(session_id: str, db: Session = Depends(get_db)):
    reqs = db.query(Requirement).filter(Requirement.session_id == session_id).all()
    if not reqs:
        return []

    evidence_counts = {}
    req_dicts = []
    for r in reqs:
        count = db.query(EvidenceLink).filter(EvidenceLink.requirement_id == r.id).count()
        evidence_counts[r.id] = count
        req_dicts.append({
            "id": r.id,
            "requirement_text": r.requirement_text,
            "category": r.category
        })

    agent = GapDetectorAgent()
    gaps = await agent.detect_gaps(req_dicts, evidence_counts)

    return [
        InformationGapResponse(
            requirement_id=g["requirement_id"],
            requirement_text=g["requirement_text"],
            category=g["category"],
            status=g["status"],
            gap_summary=g["gap_summary"],
            missing_aspects=g["missing_aspects"],
            impact_level=g["impact_level"],
            suggested_action=g["suggested_action"]
        )
        for g in gaps
    ]


@router.get("/{session_id}/temporal", response_model=List[TemporalDecayResponse])
def get_temporal_audit(session_id: str, db: Session = Depends(get_db)):
    sources = db.query(Source).filter(Source.session_id == session_id).all()
    claims = db.query(AtomicClaim).join(AtomicClaim.chunk).filter(AtomicClaim.chunk.has(source_id=Source.id)).all()

    audit_results = TemporalAnalyzerAgent.audit_temporal_freshness(sources, claims)
    return [
        TemporalDecayResponse(
            source_id=a["source_id"],
            source_title=a["source_title"],
            publication_date=a["publication_date"],
            age_in_months=a["age_in_months"],
            status=a["status"],
            decay_warning=a["decay_warning"],
            stale_claims=[ClaimSnippet(**sc) for sc in a.get("stale_claims", [])]
        )
        for a in audit_results
    ]
