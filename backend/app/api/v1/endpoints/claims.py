from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models import ResearchSession, AtomicClaim, DocumentChunk, Source
from app.schemas.claims import ClaimResponse, ClaimExtractionRequest
from app.services.claim_service import ClaimService
from app.core.exceptions import NotFoundError

router = APIRouter(tags=["Claims"])


def _to_claim_response(c: AtomicClaim) -> ClaimResponse:
    chunk = c.chunk
    source = c.source or (chunk.source if chunk else None)
    linked_req_ids = [link.requirement_id for link in c.evidence_links] if c.evidence_links else []

    return ClaimResponse(
        id=c.id,
        chunk_id=c.chunk_id,
        source_id=source.id if source else (c.source_id or ""),
        source_title=source.title if source else "Source Document",
        source_type=source.source_type if source else "text",
        source_uri=source.uri if source else None,
        source_domain=getattr(source, "domain", None) if source else None,
        claim_text=c.claim_text,
        category=c.category or "General",
        original_evidence_text=c.original_evidence_text or c.exact_quote,
        exact_quote=c.exact_quote,
        page_number=c.page_number or (chunk.page_number if chunk else None),
        paragraph_reference=c.paragraph_reference,
        applicable_period=c.applicable_period or c.date_reference,
        date_reference=c.date_reference or c.applicable_period,
        claim_type=c.claim_type or "assertion",
        confidence_score=c.confidence_score or 1.0,
        extraction_confidence=c.extraction_confidence or 0.95,
        is_verified=c.is_verified or False,
        linked_requirements_count=len(linked_req_ids),
        linked_requirement_ids=linked_req_ids,
        created_at=c.created_at,
    )


@router.get("/research/{research_id}/claims", response_model=List[ClaimResponse])
def get_research_claims(
    research_id: str,
    category: Optional[str] = Query(None, description="Filter by claim category"),
    source_id: Optional[str] = Query(None, description="Filter by source ID"),
    source_type: Optional[str] = Query(None, description="Filter by source type: pdf, url, text"),
    is_verified: Optional[bool] = Query(None, description="Filter by verification status"),
    search: Optional[str] = Query(None, description="Search term in claim text, quote, or title"),
    db: Session = Depends(get_db)
):
    """Retrieves all atomic claims for a research session with filtering, search, and provenance."""
    session = db.query(ResearchSession).filter(ResearchSession.id == research_id).first()
    if not session:
        raise NotFoundError("ResearchSession", research_id)

    claims = ClaimService.get_session_claims(
        db=db,
        session_id=research_id,
        category=category,
        source_id=source_id,
        source_type=source_type,
        is_verified=is_verified,
        search=search,
    )
    return [_to_claim_response(c) for c in claims]


@router.post("/research/{research_id}/extract-claims", response_model=List[ClaimResponse], status_code=status.HTTP_200_OK)
async def trigger_claim_extraction(
    research_id: str,
    req_data: Optional[ClaimExtractionRequest] = None,
    db: Session = Depends(get_db)
):
    """Triggers atomic claim extraction across attached document chunks for a session."""
    source_ids = req_data.source_ids if req_data else None
    created_claims = await ClaimService.extract_claims_for_session(
        db=db,
        session_id=research_id,
        source_ids=source_ids,
        clear_existing=True,
    )
    return [_to_claim_response(c) for c in created_claims]


@router.get("/claims/{claim_id}", response_model=ClaimResponse)
def get_claim(claim_id: str, db: Session = Depends(get_db)):
    """Retrieves complete details and provenance for a single atomic claim."""
    c = db.query(AtomicClaim).filter(AtomicClaim.id == claim_id).first()
    if not c:
        raise NotFoundError("AtomicClaim", claim_id)
    return _to_claim_response(c)
