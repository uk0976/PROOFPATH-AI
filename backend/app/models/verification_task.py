from sqlalchemy import Column, String, Text, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class VerificationTask(BaseModel):
    __tablename__ = "verification_tasks"

    session_id = Column(String(36), ForeignKey("research_sessions.id", ondelete="CASCADE"), nullable=False)
    task_type = Column(String(60), default="investigate_conflicting_claims")
    # Types: verify_missing_information, resolve_incomplete_requirements, investigate_conflicting_claims,
    #        check_outdated_information, validate_unverified_claims, custom
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    priority = Column(String(20), default="high")  # critical, high, medium, low
    related_requirement_id = Column(String(36), nullable=True)
    related_requirement_text = Column(Text, nullable=True)
    related_finding_id = Column(String(36), nullable=True)
    evidence_references_json = Column(Text, nullable=True)
    recommended_action = Column(Text, nullable=True)
    is_completed = Column(Boolean, default=False)
    is_custom = Column(Boolean, default=False)
    notes = Column(Text, nullable=True)

    # Relationships
    session = relationship("ResearchSession", back_populates="verification_tasks")
