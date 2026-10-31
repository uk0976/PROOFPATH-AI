from sqlalchemy import Column, String, Text, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class VerificationTask(BaseModel):
    __tablename__ = "verification_tasks"

    session_id = Column(String(36), ForeignKey("research_sessions.id", ondelete="CASCADE"), nullable=False)
    task_type = Column(String(50), default="contradiction")  # contradiction, gap, blindspot, custom
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    is_completed = Column(Boolean, default=False)
    notes = Column(Text, nullable=True)

    # Relationships
    session = relationship("ResearchSession", back_populates="verification_tasks")
