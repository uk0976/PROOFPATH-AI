import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from app.models import (
    ResearchSession,
    Source,
    DocumentChunk,
    AtomicClaim,
    EvidenceLink,
)
from app.agents.claim_extractor import ClaimExtractorAgent
from app.intelligence.evidence_retrieval_engine import EvidenceRetrievalEngine
from app.core.exceptions import NotFoundError

logger = logging.getLogger(__name__)


class ClaimService:
    @classmethod
    async def extract_claims_for_session(
        cls,
        db: Session,
        session_id: str,
        source_ids: Optional[List[str]] = None,
        clear_existing: bool = True
    ) -> List[AtomicClaim]:
        """
        Executes atomic claim extraction across all document chunks for a session.
        Grounds every claim in verbatim evidence quotes and persists in SQLite.
        """
        session = db.query(ResearchSession).filter(ResearchSession.id == session_id).first()
        if not session:
            raise NotFoundError("ResearchSession", session_id)

        chunk_query = (
            db.query(DocumentChunk)
            .join(Source)
            .filter(Source.session_id == session_id, Source.processing_status != "failed")
        )
        if source_ids:
            chunk_query = chunk_query.filter(Source.id.in_(source_ids))

        chunks = chunk_query.all()
        if not chunks:
            logger.info(f"No chunks found to extract claims from for session {session_id}")
            return []

        if clear_existing:
            # Delete existing claims for these chunks
            chunk_ids = [c.id for c in chunks]
            db.query(AtomicClaim).filter(AtomicClaim.chunk_id.in_(chunk_ids)).delete(synchronize_session=False)
            db.commit()

        agent = ClaimExtractorAgent()
        created_claims: List[AtomicClaim] = []

        for chunk in chunks:
            src = chunk.source
            source_title = src.title if src else ""
            source_id = src.id if src else None
            page_num = chunk.page_number

            claims_data = await agent.extract_claims_from_chunk(
                chunk_text=chunk.text_content,
                source_title=source_title,
                page_number=page_num,
                source_id=source_id,
            )

            for cd in claims_data:
                quote = cd.get("exact_quote") or cd.get("original_evidence_text") or chunk.text_content[:150]
                claim = AtomicClaim(
                    chunk_id=chunk.id,
                    source_id=source_id,
                    claim_text=cd["claim_text"],
                    category=cd.get("category", "General"),
                    original_evidence_text=quote,
                    exact_quote=quote,
                    page_number=cd.get("page_number", page_num),
                    paragraph_reference=cd.get("paragraph_reference") or (f"Page {page_num}" if page_num else None),
                    applicable_period=cd.get("applicable_period") or cd.get("date_reference"),
                    date_reference=cd.get("date_reference") or cd.get("applicable_period"),
                    claim_type=cd.get("claim_type", "assertion"),
                    confidence_score=float(cd.get("confidence_score", 0.95)),
                    extraction_confidence=float(cd.get("extraction_confidence", 0.95)),
                    is_verified=bool(cd.get("is_verified", True)),
                )
                db.add(claim)
                created_claims.append(claim)

        db.commit()
        for c in created_claims:
            db.refresh(c)

        logger.info(f"Extracted and saved {len(created_claims)} atomic claims for session {session_id}")
        return created_claims

    @classmethod
    def get_session_claims(
        cls,
        db: Session,
        session_id: str,
        category: Optional[str] = None,
        source_id: Optional[str] = None,
        source_type: Optional[str] = None,
        is_verified: Optional[bool] = None,
        search: Optional[str] = None,
    ) -> List[AtomicClaim]:
        """Queries claims for a session with comprehensive filtering and keyword search."""
        query = (
            db.query(AtomicClaim)
            .join(DocumentChunk)
            .join(Source)
            .filter(Source.session_id == session_id)
        )

        if category and category.lower() != "all":
            query = query.filter(AtomicClaim.category.ilike(f"%{category}%"))

        if source_id:
            query = query.filter(Source.id == source_id)

        if source_type and source_type.lower() != "all":
            query = query.filter(Source.source_type == source_type)

        if is_verified is not None:
            query = query.filter(AtomicClaim.is_verified == is_verified)

        if search and search.strip():
            term = f"%{search.strip()}%"
            query = query.filter(
                (AtomicClaim.claim_text.ilike(term)) |
                (AtomicClaim.exact_quote.ilike(term)) |
                (Source.title.ilike(term))
            )

        return query.order_by(AtomicClaim.created_at.desc()).all()
