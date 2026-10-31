from sqlalchemy import Column, String, Text, Integer, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class AuditLog(BaseModel):
    __tablename__ = "audit_logs"

    session_id = Column(String(36), ForeignKey("research_sessions.id", ondelete="CASCADE"), nullable=False)
    stage = Column(String(100), nullable=False)
    progress_percent = Column(Integer, default=0)
    message = Column(Text, nullable=False)
    payload_json = Column(Text, nullable=True)

    # Relationships
    session = relationship("ResearchSession", back_populates="audit_logs")
