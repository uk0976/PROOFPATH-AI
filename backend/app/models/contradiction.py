from sqlalchemy import Column, String, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class Contradiction(BaseModel):
    __tablename__ = "contradictions"

    session_id = Column(String(36), ForeignKey("research_sessions.id", ondelete="CASCADE"), nullable=False)
    requirement_id = Column(String(36), ForeignKey("requirements.id", ondelete="SET NULL"), nullable=True)
    claim_a_id = Column(String(36), ForeignKey("atomic_claims.id", ondelete="CASCADE"), nullable=False)
    claim_b_id = Column(String(36), ForeignKey("atomic_claims.id", ondelete="CASCADE"), nullable=False)
    severity = Column(String(50), default="medium")  # high, medium, low
    conflicting_aspect = Column(Text, nullable=False)
    synthesis_verdict = Column(Text, nullable=True)

    # Relationships
    session = relationship("ResearchSession", back_populates="contradictions")
    requirement = relationship("Requirement", back_populates="contradictions")
    claim_a = relationship("AtomicClaim", foreign_keys=[claim_a_id])
    claim_b = relationship("AtomicClaim", foreign_keys=[claim_b_id])
