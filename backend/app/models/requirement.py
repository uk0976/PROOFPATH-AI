from sqlalchemy import Column, String, Text, Float, Integer, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class Requirement(BaseModel):
    __tablename__ = "requirements"

    session_id = Column(String(36), ForeignKey("research_sessions.id", ondelete="CASCADE"), nullable=False)
    requirement_text = Column(Text, nullable=False)
    category = Column(String(100), default="functional")  # functional, cost, security, compliance, performance, legal
    weight = Column(Float, default=1.0)
    status = Column(String(50), default="uncovered")  # covered, partial, uncovered, conflict
    order_index = Column(Integer, default=0)

    # Relationships
    session = relationship("ResearchSession", back_populates="requirements")
    evidence_links = relationship("EvidenceLink", back_populates="requirement", cascade="all, delete-orphan")
    contradictions = relationship("Contradiction", back_populates="requirement", cascade="all, delete-orphan")
