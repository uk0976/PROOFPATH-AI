from typing import List, Dict, Any
from fastapi import APIRouter, Depends
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
from app.core.exceptions import NotFoundError

router = APIRouter(tags=["Findings"])


def _build_contradiction_response(c: Contradiction) -> ContradictionResponse:
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

    return ContradictionResponse(
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


@router.get("/research/{research_id}/findings")
async def get_all_research_findings(research_id: str, db: Session = Depends(get_db)):
    session = db.query(ResearchSession).filter(ResearchSession.id == research_id).first()
    if not session:
        raise NotFoundError("ResearchSession", research_id)

    # 1. Contradictions
    conflicts = db.query(Contradiction).filter(Contradiction.session_id == research_id).all()
    conflict_list = [_build_contradiction_response(c).model_dump() for c in conflicts]

    # 2. Gaps
    reqs = db.query(Requirement).filter(Requirement.session_id == research_id).all()
    evidence_counts = {r.id: db.query(EvidenceLink).filter(EvidenceLink.requirement_id == r.id).count() for r in reqs}
    req_dicts = [{"id": r.id, "requirement_text": r.requirement_text, "category": r.category} for r in reqs]
    gap_agent = GapDetectorAgent()
    gaps = await gap_agent.detect_gaps(req_dicts, evidence_counts)

    # 3. Temporal
    sources = db.query(Source).filter(Source.session_id == research_id).all()
    claims = db.query(AtomicClaim).join(AtomicClaim.chunk).filter(AtomicClaim.chunk.has(source_id=Source.id)).all()
    temporal_flags = TemporalAnalyzerAgent.audit_temporal_freshness(sources, claims)

    return {
        "research_id": research_id,
        "total_conflicts": len(conflict_list),
        "total_gaps": len(gaps),
        "total_temporal_flags": len(temporal_flags),
        "contradictions": conflict_list,
        "information_gaps": gaps,
        "temporal_audit": temporal_flags
    }


@router.get("/findings/{research_id}/conflicts", response_model=List[ContradictionResponse])
def get_findings_conflicts(research_id: str, db: Session = Depends(get_db)):
    session = db.query(ResearchSession).filter(ResearchSession.id == research_id).first()
    if not session:
        raise NotFoundError("ResearchSession", research_id)

    conflicts = db.query(Contradiction).filter(Contradiction.session_id == research_id).all()
    return [_build_contradiction_response(c) for c in conflicts]


@router.get("/findings/{research_id}/gaps")
async def get_findings_gaps(research_id: str, db: Session = Depends(get_db)):
    session = db.query(ResearchSession).filter(ResearchSession.id == research_id).first()
    if not session:
        raise NotFoundError("ResearchSession", research_id)

    reqs = db.query(Requirement).filter(Requirement.session_id == research_id).all()
    evidence_counts = {r.id: db.query(EvidenceLink).filter(EvidenceLink.requirement_id == r.id).count() for r in reqs}
    req_dicts = [{"id": r.id, "requirement_text": r.requirement_text, "category": r.category} for r in reqs]
    gap_agent = GapDetectorAgent()
    return await gap_agent.detect_gaps(req_dicts, evidence_counts)


@router.get("/findings/{research_id}/temporal")
def get_findings_temporal(research_id: str, db: Session = Depends(get_db)):
    session = db.query(ResearchSession).filter(ResearchSession.id == research_id).first()
    if not session:
        raise NotFoundError("ResearchSession", research_id)

    sources = db.query(Source).filter(Source.session_id == research_id).all()
    claims = db.query(AtomicClaim).join(AtomicClaim.chunk).filter(AtomicClaim.chunk.has(source_id=Source.id)).all()
    return TemporalAnalyzerAgent.audit_temporal_freshness(sources, claims)


@router.get("/findings/{finding_id}", response_model=ContradictionResponse)
def get_finding_detail(finding_id: str, db: Session = Depends(get_db)):
    c = db.query(Contradiction).filter(Contradiction.id == finding_id).first()
    if not c:
        raise NotFoundError("Finding", finding_id)

    return _build_contradiction_response(c)
