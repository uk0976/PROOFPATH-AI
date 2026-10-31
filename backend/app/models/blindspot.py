from sqlalchemy import Column, String, Text, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class BlindSpot(BaseModel):
    __tablename__ = "blindspots"

    session_id = Column(String(36), ForeignKey("research_sessions.id", ondelete="CASCADE"), nullable=False)
    question = Column(Text, nullable=False)
    rationale = Column(Text, nullable=False)
    explanation = Column(Text, nullable=True)  # Detailed decision impact narrative
    relevance = Column(String(100), default="high")  # critical, high, medium
    risk_level = Column(String(50), default="medium")  # high, medium, low
    priority = Column(String(50), default="P1")  # P1, P2, P3
    category = Column(String(100), default="unaddressed_risk")

    # Traceability to research requirements & evidence
    related_requirement_id = Column(String(36), ForeignKey("requirements.id", ondelete="SET NULL"), nullable=True)
    related_requirement_text = Column(Text, nullable=True)
    evidence_coverage = Column(String(50), default="uncovered")  # uncovered, partially_answered, answered_in_sources
    source_references_json = Column(Text, nullable=True)  # JSON list of relevant excerpts/sources
    recommended_action = Column(Text, nullable=True)

    # User interaction states
    is_resolved = Column(Boolean, default=False, nullable=False)
    is_starred = Column(Boolean, default=False, nullable=False)  # User marked as important
    is_dismissed = Column(Boolean, default=False, nullable=False)  # User dismissed suggestion
    is_added_to_plan = Column(Boolean, default=False, nullable=False)  # Added as active requirement
    added_requirement_id = Column(String(36), nullable=True)  # ID of created requirement

    # Relationships
    session = relationship("ResearchSession", back_populates="blindspots")
    related_requirement = relationship("Requirement", foreign_keys=[related_requirement_id])
