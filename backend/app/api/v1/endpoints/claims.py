from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models import ResearchSession, AtomicClaim, DocumentChunk, Source
from app.schemas.claims import ClaimResponse
from app.core.exceptions import NotFoundError

router = APIRouter(tags=["Claims"])


@router.get("/research/{research_id}/claims", response_model=List[ClaimResponse])
def get_research_claims(research_id: str, db: Session = Depends(get_db)):
    session = db.query(ResearchSession).filter(ResearchSession.id == research_id).first()
    if not session:
        raise NotFoundError("ResearchSession", research_id)

    claims = db.query(AtomicClaim).join(DocumentChunk).join(Source).filter(Source.session_id == research_id).all()
    results = []
    for c in claims:
        chunk = c.chunk
        source = chunk.source if chunk else None
        results.append(
            ClaimResponse(
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
                is_verified=c.is_verified,
                created_at=c.created_at
            )
        )
    return results


@router.get("/claims/{claim_id}", response_model=ClaimResponse)
def get_claim(claim_id: str, db: Session = Depends(get_db)):
    c = db.query(AtomicClaim).filter(AtomicClaim.id == claim_id).first()
    if not c:
        raise NotFoundError("AtomicClaim", claim_id)

    chunk = c.chunk
    source = chunk.source if chunk else None
    return ClaimResponse(
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
        is_verified=c.is_verified,
        created_at=c.created_at
    )
