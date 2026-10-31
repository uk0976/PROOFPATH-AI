from sqlalchemy import Column, String, Text, Float, Integer, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class Requirement(BaseModel):
    __tablename__ = "requirements"

    session_id = Column(String(36), ForeignKey("research_sessions.id", ondelete="CASCADE"), nullable=False)
    
    # Requirement assertion & interrogative question
    requirement_text = Column(Text, nullable=False)
    question = Column(Text, nullable=True)
    description = Column(Text, nullable=True)
    
    # Categorization
    category = Column(String(100), default="General")  # Eligibility, Academic, Income, Documentation, Deadlines, Procedure, Financial, Governance, Architecture
    
    # Prioritization & Weight
    importance = Column(String(50), default="high")  # critical, high, medium, low
    priority = Column(String(50), default="P1")      # P0 (dealbreaker), P1 (essential), P2 (recommended), P3 (supplementary)
    weight = Column(Float, default=1.0)
    is_decision_critical = Column(Boolean, default=False)
    
    # Provenance (AI suggestion vs Official User Requirement)
    origin = Column(String(50), default="ai_suggested")  # user_requested, ai_suggested
    is_approved = Column(Boolean, default=False)         # AI suggestions must be approved to become official requirements
    
    # Investigation status
    status = Column(String(50), default="uncovered")  # covered, partial, uncovered, conflict
    order_index = Column(Integer, default=0)

    # Relationships
    session = relationship("ResearchSession", back_populates="requirements")
    evidence_links = relationship("EvidenceLink", back_populates="requirement", cascade="all, delete-orphan")
    contradictions = relationship("Contradiction", back_populates="requirement", cascade="all, delete-orphan")
