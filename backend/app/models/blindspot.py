from sqlalchemy import Column, String, Text, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class BlindSpot(BaseModel):
    __tablename__ = "blindspots"

    session_id = Column(String(36), ForeignKey("research_sessions.id", ondelete="CASCADE"), nullable=False)
    question = Column(Text, nullable=False)
    rationale = Column(Text, nullable=False)
    risk_level = Column(String(50), default="medium")  # high, medium, low
    category = Column(String(100), default="unaddressed_risk")
    is_resolved = Column(Boolean, default=False)

    # Relationships
    session = relationship("ResearchSession", back_populates="blindspots")
