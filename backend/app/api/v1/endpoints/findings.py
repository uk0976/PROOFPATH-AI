import json
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models import (
    ResearchSession,
    Contradiction,
    Requirement,
    EvidenceLink,
    Source,
    AtomicClaim,
    GapFinding,
)
from app.schemas.findings import (
    ContradictionResponse,
    InformationGapResponse,
    TemporalDecayResponse,
    TemporalAuditResponse,
    TemporalAuditItem,
    ClaimSnippet,
    ScopeComparison,
    GapFindingResponse,
    EvidenceReference,
    GapAnalysisOverview,
)
from app.intelligence.gap_detection_engine import (
    GapDetectionEngine,
    FINDING_COVERED,
    FINDING_MISSING,
    FINDING_INCOMPLETE,
    FINDING_POTENTIAL_CONFLICT,
    FINDING_POTENTIALLY_OUTDATED,
    FINDING_UNVERIFIED,
)
from app.intelligence.contradiction_intelligence_engine import ContradictionIntelligenceEngine
from app.intelligence.temporal_intelligence_engine import TemporalIntelligenceEngine
from app.agents.temporal_analyzer import TemporalAnalyzerAgent
from app.core.exceptions import NotFoundError

router = APIRouter(tags=["Findings"])


def _to_gap_finding_response(f: GapFinding) -> GapFindingResponse:
    req_text = f.requirement.requirement_text if f.requirement else "Evaluation Criterion"
    category = f.requirement.category if f.requirement else "General"

    claim_ids = json.loads(f.supporting_claim_ids) if f.supporting_claim_ids else []
    source_ids = json.loads(f.source_ids) if f.source_ids else []
    raw_refs = json.loads(f.evidence_references) if f.evidence_references else []

    evidence_refs = [
        EvidenceReference(
            claim_id=r.get("claim_id"),
            claim_text=r.get("claim_text"),
            exact_quote=r.get("exact_quote", ""),
            source_id=r.get("source_id", ""),
            source_title=r.get("source_title", "Source Document"),
            source_type=r.get("source_type", "text"),
            page_number=r.get("page_number"),
            paragraph_reference=r.get("paragraph_reference"),
            source_uri=r.get("source_uri"),
            confidence=float(r.get("confidence", 1.0)),
        )
        for r in raw_refs
    ]

    return GapFindingResponse(
        id=f.id,
        session_id=f.session_id,
        requirement_id=f.requirement_id,
        requirement_text=req_text,
        category=category,
        finding_type=f.finding_type,
        explanation=f.explanation,
        supporting_claim_ids=claim_ids,
        source_ids=source_ids,
        evidence_references=evidence_refs,
        confidence=f.confidence,
        priority=f.priority,
        recommended_action=f.recommended_action,
        limitations=f.limitations,
        created_at=f.created_at,
    )


def _build_contradiction_response(c: Contradiction) -> ContradictionResponse:
    req_text = c.requirement.requirement_text if c.requirement else "Cross-cutting requirement"
    claim_a = c.claim_a
    claim_b = c.claim_b

    source_a_title = claim_a.source.title if claim_a and claim_a.source else (claim_a.chunk.source.title if claim_a and claim_a.chunk and claim_a.chunk.source else "Source A")
    source_a_id = claim_a.source_id or (claim_a.chunk.source_id if claim_a and claim_a.chunk else "")
    source_a_type = claim_a.source.source_type if claim_a and claim_a.source else (claim_a.chunk.source.source_type if claim_a and claim_a.chunk and claim_a.chunk.source else "pdf")
    source_a_uri = claim_a.source.uri if claim_a and claim_a.source else (claim_a.chunk.source.uri if claim_a and claim_a.chunk and claim_a.chunk.source else None)
    page_a = claim_a.page_number or (claim_a.chunk.page_number if claim_a and claim_a.chunk else None)

    source_b_title = claim_b.source.title if claim_b and claim_b.source else (claim_b.chunk.source.title if claim_b and claim_b.chunk and claim_b.chunk.source else "Source B")
    source_b_id = claim_b.source_id or (claim_b.chunk.source_id if claim_b and claim_b.chunk else "")
    source_b_type = claim_b.source.source_type if claim_b and claim_b.source else (claim_b.chunk.source.source_type if claim_b and claim_b.chunk and claim_b.chunk.source else "url")
    source_b_uri = claim_b.source.uri if claim_b and claim_b.source else (claim_b.chunk.source.uri if claim_b and claim_b.chunk and claim_b.chunk.source else None)
    page_b = claim_b.page_number or (claim_b.chunk.page_number if claim_b and claim_b.chunk else None)

    # Parse 10-dimension scope comparison
    scope_comp = None
    if getattr(c, "scope_comparison_json", None):
        try:
            scope_dict = json.loads(c.scope_comparison_json)
            scope_comp = ScopeComparison(**scope_dict)
        except Exception:
            scope_comp = None

    return ContradictionResponse(
        id=c.id,
        session_id=c.session_id,
        requirement_id=c.requirement_id,
        requirement_text=req_text,
        severity=c.severity,
        conflicting_aspect=c.conflicting_aspect,
        synthesis_verdict=c.synthesis_verdict,
        is_genuine=getattr(c, "is_genuine", True),
        conflict_type=getattr(c, "conflict_type", "direct_factual_clash"),
        scope_comparison=scope_comp,
        explanation=getattr(c, "explanation", c.synthesis_verdict),
        recommended_action=getattr(c, "recommended_action", None),
        claim_a=ClaimSnippet(
            id=claim_a.id,
            source_id=source_a_id,
            source_title=source_a_title,
            source_type=source_a_type,
            source_uri=source_a_uri,
            page_number=page_a,
            paragraph_reference=getattr(claim_a, "paragraph_reference", None),
            category=getattr(claim_a, "category", "General"),
            claim_text=claim_a.claim_text,
            exact_quote=claim_a.exact_quote,
            date_reference=claim_a.date_reference,
            applicable_period=getattr(claim_a, "applicable_period", None),
            confidence_score=claim_a.confidence_score or 1.0,
        ),
        claim_b=ClaimSnippet(
            id=claim_b.id,
            source_id=source_b_id,
            source_title=source_b_title,
            source_type=source_b_type,
            source_uri=source_b_uri,
            page_number=page_b,
            paragraph_reference=getattr(claim_b, "paragraph_reference", None),
            category=getattr(claim_b, "category", "General"),
            claim_text=claim_b.claim_text,
            exact_quote=claim_b.exact_quote,
            date_reference=claim_b.date_reference,
            applicable_period=getattr(claim_b, "applicable_period", None),
            confidence_score=claim_b.confidence_score or 1.0,
        ),
        created_at=c.created_at,
    )


@router.get("/research/{research_id}/findings")
async def get_all_research_findings(research_id: str, db: Session = Depends(get_db)):
    """Retrieves all findings, contradictions, and 6-category gap analyses for a session."""
    session = db.query(ResearchSession).filter(ResearchSession.id == research_id).first()
    if not session and research_id in ["demo", "demo-scholarship-investigation"]:
        from app.utils.mock_data import seed_demo_investigation
        seed_demo_investigation(db)
        session = db.query(ResearchSession).filter(
            ResearchSession.id.in_(["demo", "demo-scholarship-investigation"])
        ).first()

    if not session:
        raise NotFoundError("ResearchSession", research_id)

    # 1. Fetch or generate gap findings
    db_findings = db.query(GapFinding).filter(GapFinding.session_id == research_id).all()
    if not db_findings:
        db_findings = GapDetectionEngine.evaluate_session(db, research_id, persist=True)

    findings_responses = [_to_gap_finding_response(f) for f in db_findings]

    # Count by type
    counts_by_type = {
        FINDING_COVERED: 0,
        FINDING_MISSING: 0,
        FINDING_INCOMPLETE: 0,
        FINDING_POTENTIAL_CONFLICT: 0,
        FINDING_POTENTIALLY_OUTDATED: 0,
        FINDING_UNVERIFIED: 0,
    }
    for f in findings_responses:
        counts_by_type[f.finding_type] = counts_by_type.get(f.finding_type, 0) + 1

    # 2. Contradictions
    conflicts = db.query(Contradiction).filter(Contradiction.session_id == research_id).all()
    conflict_list = [_build_contradiction_response(c).model_dump() for c in conflicts]

    # 3. Temporal
    sources = db.query(Source).filter(Source.session_id == research_id).all()
    claims = db.query(AtomicClaim).join(AtomicClaim.chunk).filter(AtomicClaim.chunk.has(source_id=Source.id)).all()
    temporal_flags = TemporalAnalyzerAgent.audit_temporal_freshness(sources, claims)

    # Legacy gap view compatibility
    legacy_gaps = [
        {
            "requirement_id": f.requirement_id,
            "requirement_text": f.requirement_text,
            "category": f.category,
            "status": f.finding_type.lower(),
            "gap_summary": f.explanation,
            "missing_aspects": [f.recommended_action],
            "impact_level": f.priority,
            "suggested_action": f.recommended_action,
        }
        for f in findings_responses
        if f.finding_type in (FINDING_MISSING, FINDING_INCOMPLETE)
    ]

    return {
        "research_id": research_id,
        "total_conflicts": len(conflict_list),
        "total_gaps": len(findings_responses),
        "total_temporal_flags": len(temporal_flags),
        "counts_by_type": counts_by_type,
        "findings": findings_responses,
        "contradictions": conflict_list,
        "information_gaps": legacy_gaps,
        "temporal_audit": temporal_flags,
    }


@router.post("/research/{research_id}/evaluate-gaps", response_model=GapAnalysisOverview, status_code=status.HTTP_200_OK)
def trigger_gap_evaluation(research_id: str, db: Session = Depends(get_db)):
    """Triggers the 10-step information gap detection engine across all research requirements."""
    session = db.query(ResearchSession).filter(ResearchSession.id == research_id).first()
    if not session:
        raise NotFoundError("ResearchSession", research_id)

    db_findings = GapDetectionEngine.evaluate_session(db, research_id, persist=True)
    findings_responses = [_to_gap_finding_response(f) for f in db_findings]

    counts = {
        FINDING_COVERED: 0,
        FINDING_MISSING: 0,
        FINDING_INCOMPLETE: 0,
        FINDING_POTENTIAL_CONFLICT: 0,
        FINDING_POTENTIALLY_OUTDATED: 0,
        FINDING_UNVERIFIED: 0,
    }
    for f in findings_responses:
        counts[f.finding_type] = counts.get(f.finding_type, 0) + 1

    return GapAnalysisOverview(
        research_id=research_id,
        total_findings=len(findings_responses),
        counts_by_type=counts,
        findings=findings_responses,
    )


@router.get("/findings/{research_id}/gaps", response_model=List[GapFindingResponse])
def get_findings_gaps(
    research_id: str,
    finding_type: Optional[str] = Query(None, description="Filter by finding category: COVERED, MISSING, INCOMPLETE, etc."),
    db: Session = Depends(get_db)
):
    """Retrieves gap findings with optional filtering by finding category."""
    session = db.query(ResearchSession).filter(ResearchSession.id == research_id).first()
    if not session and research_id in ["demo", "demo-scholarship-investigation"]:
        from app.utils.mock_data import seed_demo_investigation
        seed_demo_investigation(db)
        session = db.query(ResearchSession).filter(
            ResearchSession.id.in_(["demo", "demo-scholarship-investigation"])
        ).first()

    if not session:
        raise NotFoundError("ResearchSession", research_id)

    query = db.query(GapFinding).filter(GapFinding.session_id == research_id)
    if finding_type and finding_type.upper() != "ALL":
        query = query.filter(GapFinding.finding_type == finding_type.upper())

    findings = query.all()
    if not findings:
        findings = GapDetectionEngine.evaluate_session(db, research_id, persist=True)
        if finding_type and finding_type.upper() != "ALL":
            findings = [f for f in findings if f.finding_type == finding_type.upper()]

    return [_to_gap_finding_response(f) for f in findings]


@router.get("/findings/{research_id}/conflicts", response_model=List[ContradictionResponse])
@router.get("/research/{research_id}/contradictions", response_model=List[ContradictionResponse])
def get_findings_conflicts(
    research_id: str,
    is_genuine: Optional[bool] = Query(None, description="Filter for genuine conflicts (True) vs false conflicts/scope divergence (False)"),
    severity: Optional[str] = Query(None, description="Filter by severity: high, medium, low"),
    db: Session = Depends(get_db)
):
    """Retrieves all cross-source contradictions and scope comparisons for a session."""
    session = db.query(ResearchSession).filter(ResearchSession.id == research_id).first()
    if not session and research_id in ["demo", "demo-scholarship-investigation"]:
        from app.utils.mock_data import seed_demo_investigation
        seed_demo_investigation(db)
        session = db.query(ResearchSession).filter(
            ResearchSession.id.in_(["demo", "demo-scholarship-investigation"])
        ).first()

    if not session:
        raise NotFoundError("ResearchSession", research_id)

    query = db.query(Contradiction).filter(Contradiction.session_id == research_id)
    if is_genuine is not None:
        query = query.filter(Contradiction.is_genuine == is_genuine)
    if severity:
        query = query.filter(Contradiction.severity == severity.lower())

    conflicts = query.all()
    if not conflicts and is_genuine is None:
        # Run intelligence engine if none recorded yet
        conflicts = ContradictionIntelligenceEngine.evaluate_session_contradictions(db, research_id, persist=True)
    return [_build_contradiction_response(c) for c in conflicts]


@router.post("/research/{research_id}/evaluate-contradictions", response_model=List[ContradictionResponse], status_code=status.HTTP_200_OK)
def trigger_contradiction_evaluation(research_id: str, db: Session = Depends(get_db)):
    """Triggers the 10-dimensional cross-source contradiction intelligence engine."""
    session = db.query(ResearchSession).filter(ResearchSession.id == research_id).first()
    if not session:
        raise NotFoundError("ResearchSession", research_id)

    conflicts = ContradictionIntelligenceEngine.evaluate_session_contradictions(db, research_id, persist=True)
    return [_build_contradiction_response(c) for c in conflicts]


@router.get("/findings/{research_id}/temporal", response_model=List[TemporalDecayResponse])
def get_findings_temporal(research_id: str, db: Session = Depends(get_db)):
    """Legacy temporal audit endpoint for backward compatibility."""
    session = db.query(ResearchSession).filter(ResearchSession.id == research_id).first()
    if not session:
        raise NotFoundError("ResearchSession", research_id)

    sources = db.query(Source).filter(Source.session_id == research_id).all()
    claims = db.query(AtomicClaim).join(AtomicClaim.chunk).filter(AtomicClaim.chunk.has(source_id=Source.id)).all()
    return TemporalAnalyzerAgent.audit_temporal_freshness(sources, claims)


@router.get("/research/{research_id}/temporal", response_model=TemporalAuditResponse)
def get_research_temporal_audit(research_id: str, db: Session = Depends(get_db)):
    """Comprehensive forensic temporal intelligence audit across sources and claims."""
    session = db.query(ResearchSession).filter(ResearchSession.id == research_id).first()
    if not session:
        raise NotFoundError("ResearchSession", research_id)

    result = TemporalIntelligenceEngine.audit_session_temporal(db, research_id, persist=False)
    return TemporalAuditResponse(**result)


@router.post("/research/{research_id}/evaluate-temporal", response_model=TemporalAuditResponse, status_code=status.HTTP_200_OK)
def trigger_temporal_evaluation(research_id: str, db: Session = Depends(get_db)):
    """Triggers full temporal extraction and document applicability assessment."""
    session = db.query(ResearchSession).filter(ResearchSession.id == research_id).first()
    if not session:
        raise NotFoundError("ResearchSession", research_id)

    result = TemporalIntelligenceEngine.audit_session_temporal(db, research_id, persist=True)
    return TemporalAuditResponse(**result)


@router.get("/findings/{finding_id}")
def get_finding_detail(finding_id: str, db: Session = Depends(get_db)):
    """Retrieves detailed information, quotes, and limitations for a specific finding."""
    # Check GapFinding first
    f = db.query(GapFinding).filter(GapFinding.id == finding_id).first()
    if f:
        return _to_gap_finding_response(f)

    # Fallback to Contradiction
    c = db.query(Contradiction).filter(Contradiction.id == finding_id).first()
    if c:
        return _build_contradiction_response(c)

    raise NotFoundError("Finding", finding_id)
