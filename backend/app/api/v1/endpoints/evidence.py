from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models import (
    ResearchSession,
    Requirement,
    Source,
    DocumentChunk,
    AtomicClaim,
    EvidenceLink,
    Contradiction,
    BlindSpot,
)
from app.schemas.evidence import (
    AtomicClaimResponse,
    EvidenceGraphResponse,
    MatrixViewResponse,
    MatrixCell,
)
from app.intelligence.graph_builder import GraphBuilder
from app.core.exceptions import NotFoundError

router = APIRouter(tags=["Evidence"])


@router.get("/research/{research_id}/evidence", response_model=MatrixViewResponse)
def get_research_evidence_matrix(research_id: str, db: Session = Depends(get_db)):
    session = db.query(ResearchSession).filter(ResearchSession.id == research_id).first()
    if not session:
        raise NotFoundError("ResearchSession", research_id)

    reqs = db.query(Requirement).filter(Requirement.session_id == research_id).order_by(Requirement.order_index).all()
    sources = db.query(Source).filter(Source.session_id == research_id).all()
    links = db.query(EvidenceLink).join(Requirement).filter(Requirement.session_id == research_id).all()
    conflicts = db.query(Contradiction).filter(Contradiction.session_id == research_id).all()

    req_dicts = [{"id": r.id, "text": r.requirement_text, "category": r.category, "status": r.status} for r in reqs]
    source_dicts = [{"id": s.id, "title": s.title, "type": s.source_type} for s in sources]

    conflict_req_ids = {c.requirement_id for c in conflicts if c.requirement_id}

    cells = []
    for r in reqs:
        for s in sources:
            cell_claims = []
            for link in links:
                if link.requirement_id == r.id and link.claim and link.claim.chunk and link.claim.chunk.source_id == s.id:
                    cell_claims.append(
                        AtomicClaimResponse(
                            id=link.claim.id,
                            chunk_id=link.claim.chunk_id,
                            source_id=s.id,
                            source_title=s.title,
                            source_type=s.source_type,
                            page_number=link.claim.chunk.page_number,
                            claim_text=link.claim.claim_text,
                            exact_quote=link.claim.exact_quote,
                            claim_type=link.claim.claim_type,
                            date_reference=link.claim.date_reference,
                            confidence_score=link.claim.confidence_score,
                            is_verified=link.claim.is_verified
                        )
                    )

            has_conf = (r.id in conflict_req_ids) and (len(cell_claims) > 0)
            if has_conf:
                status = "conflict"
            elif len(cell_claims) >= 2:
                status = "supported"
            elif len(cell_claims) == 1:
                status = "partial"
            else:
                status = "empty"

            cells.append(
                MatrixCell(
                    requirement_id=r.id,
                    source_id=s.id,
                    claim_count=len(cell_claims),
                    has_conflict=has_conf,
                    status=status,
                    claims=cell_claims
                )
            )

    return MatrixViewResponse(
        requirements=req_dicts,
        sources=source_dicts,
        cells=cells
    )


@router.get("/research/{research_id}/graph", response_model=EvidenceGraphResponse)
@router.get("/evidence/{research_id}/graph", response_model=EvidenceGraphResponse)
def get_research_evidence_graph(research_id: str, db: Session = Depends(get_db)):
    session = db.query(ResearchSession).filter(ResearchSession.id == research_id).first()
    if not session:
        raise NotFoundError("ResearchSession", research_id)

    reqs = db.query(Requirement).filter(Requirement.session_id == research_id).all()
    sources = db.query(Source).filter(Source.session_id == research_id).all()
    links = db.query(EvidenceLink).join(Requirement).filter(Requirement.session_id == research_id).all()
    conflicts = db.query(Contradiction).filter(Contradiction.session_id == research_id).all()
    blindspots = db.query(BlindSpot).filter(BlindSpot.session_id == research_id).all()

    return GraphBuilder.build_evidence_graph(
        session_title=session.title,
        research_goal=session.research_goal,
        requirements=reqs,
        sources=sources,
        evidence_links=links,
        contradictions=conflicts,
        blindspots=blindspots,
        session=session
    )


@router.get("/evidence/{research_id}/matrix", response_model=MatrixViewResponse)
def get_evidence_matrix_alias(research_id: str, db: Session = Depends(get_db)):
    return get_research_evidence_matrix(research_id, db)


@router.get("/evidence/{research_id}/claims", response_model=List[AtomicClaimResponse])
def get_evidence_claims_alias(research_id: str, db: Session = Depends(get_db)):
    claims = db.query(AtomicClaim).join(DocumentChunk).join(Source).filter(Source.session_id == research_id).all()
    results = []
    for c in claims:
        chunk = c.chunk
        source = chunk.source if chunk else None
        results.append(
            AtomicClaimResponse(
                id=c.id,
                chunk_id=c.chunk_id,
                source_id=source.id if source else "",
                source_title=source.title if source else "Source",
                source_type=source.source_type if source else "text",
                page_number=chunk.page_number if chunk else None,
                claim_text=c.claim_text,
                exact_quote=c.exact_quote,
                claim_type=c.claim_type,
                date_reference=c.date_reference,
                confidence_score=c.confidence_score,
                is_verified=c.is_verified
            )
        )
    return results
