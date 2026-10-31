from sqlalchemy import Column, String, Text, Float, Boolean, Integer, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class AtomicClaim(BaseModel):
    __tablename__ = "atomic_claims"

    chunk_id = Column(String(36), ForeignKey("document_chunks.id", ondelete="CASCADE"), nullable=False)
    source_id = Column(String(36), ForeignKey("sources.id", ondelete="CASCADE"), nullable=True)
    claim_text = Column(Text, nullable=False)
    exact_quote = Column(Text, nullable=False)
    original_evidence_text = Column(Text, nullable=True)  # Full verbatim grounding quote
    category = Column(String(100), default="General")  # Eligibility, Academic, Income, Documentation, Deadlines, Financial, Technical, Governance
    claim_type = Column(String(50), default="assertion")  # quantitative, assertion, temporal, caveat, recommendation
    date_reference = Column(String(100), nullable=True)  # e.g. "2024", "Q3 2023"
    applicable_period = Column(String(100), nullable=True)  # Applicable time window or eligibility period
    page_number = Column(Integer, nullable=True)  # PDF page number or physical document page
    paragraph_reference = Column(String(100), nullable=True)  # e.g. "Para 3", "Section 4.1"
    confidence_score = Column(Float, default=1.0)
    extraction_confidence = Column(Float, default=0.95)  # AI extraction confidence metric
    is_verified = Column(Boolean, default=False)  # True if exact_quote validated against source text

    # Relationships
    chunk = relationship("DocumentChunk", back_populates="claims")
    source = relationship("Source", foreign_keys=[source_id])
    evidence_links = relationship("EvidenceLink", back_populates="claim", cascade="all, delete-orphan")

