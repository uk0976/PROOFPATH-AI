from sqlalchemy import Column, String, Text, Float, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class AtomicClaim(BaseModel):
    __tablename__ = "atomic_claims"

    chunk_id = Column(String(36), ForeignKey("document_chunks.id", ondelete="CASCADE"), nullable=False)
    claim_text = Column(Text, nullable=False)
    exact_quote = Column(Text, nullable=False)
    claim_type = Column(String(50), default="assertion")  # quantitative, assertion, temporal, caveat, recommendation
    date_reference = Column(String(100), nullable=True)  # e.g. "2024", "Q3 2023"
    confidence_score = Column(Float, default=1.0)
    is_verified = Column(Boolean, default=False)  # True if exact_quote validated against source text

    # Relationships
    chunk = relationship("DocumentChunk", back_populates="claims")
    evidence_links = relationship("EvidenceLink", back_populates="claim", cascade="all, delete-orphan")
