from sqlalchemy import Column, String, Text, Float, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class EvidenceLink(BaseModel):
    __tablename__ = "evidence_links"

    requirement_id = Column(String(36), ForeignKey("requirements.id", ondelete="CASCADE"), nullable=False)
    claim_id = Column(String(36), ForeignKey("atomic_claims.id", ondelete="CASCADE"), nullable=False)
    relation_type = Column(String(50), default="supports")  # supports, refutes, partial, neutral
    relevance_rationale = Column(Text, nullable=True)
    similarity_score = Column(Float, default=0.0)

    # Relationships
    requirement = relationship("Requirement", back_populates="evidence_links")
    claim = relationship("AtomicClaim", back_populates="evidence_links")
