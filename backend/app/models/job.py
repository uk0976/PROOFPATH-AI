from sqlalchemy import Column, String, Text, Integer, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class InvestigationJob(BaseModel):
    __tablename__ = "investigation_jobs"

    session_id = Column(String(36), ForeignKey("research_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(50), default="pending", nullable=False, index=True)  # pending, running, completed, failed, cancelled
    current_stage = Column(String(100), default="QUEUED", nullable=False)
    stage_index = Column(Integer, default=0, nullable=False)
    total_stages = Column(Integer, default=15, nullable=False)
    progress_percent = Column(Float, default=0.0, nullable=False)
    message = Column(Text, default="Investigation job queued.")
    error_message = Column(Text, nullable=True)
    retry_count = Column(Integer, default=0, nullable=False)
    max_retries = Column(Integer, default=2, nullable=False)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    heartbeat_at = Column(DateTime(timezone=True), nullable=True)
    stage_data_json = Column(Text, nullable=True)

    # Relationships
    session = relationship("ResearchSession", back_populates="jobs")
