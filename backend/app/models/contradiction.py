from sqlalchemy import Column, String, Text, Boolean, ForeignKey
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

    # Cross-Source Contradiction Intelligence Dimensions
    is_genuine = Column(Boolean, default=True, nullable=False)  # True = True contradiction; False = False conflict / Scope divergence
    conflict_type = Column(String(100), default="direct_factual_clash", nullable=False)  # direct_factual_clash, numerical_threshold_divergence, timeline_conflict, scope_divergence
    scope_comparison_json = Column(Text, nullable=True)  # Detailed 10-dimension comparison in JSON
    explanation = Column(Text, nullable=True)  # In-depth forensic rationale
    recommended_action = Column(Text, nullable=True)  # Recommended verification action

    # Relationships
    session = relationship("ResearchSession", back_populates="contradictions")
    requirement = relationship("Requirement", back_populates="contradictions")
    claim_a = relationship("AtomicClaim", foreign_keys=[claim_a_id])
    claim_b = relationship("AtomicClaim", foreign_keys=[claim_b_id])
