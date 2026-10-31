from sqlalchemy import Column, String, Text, Float, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class GapFinding(BaseModel):
    __tablename__ = "gap_findings"

    session_id = Column(String(36), ForeignKey("research_sessions.id", ondelete="CASCADE"), nullable=False)
    requirement_id = Column(String(36), ForeignKey("requirements.id", ondelete="CASCADE"), nullable=False)
    
    # One of the 6 Finding Types:
    # COVERED, MISSING, INCOMPLETE, POTENTIAL CONFLICT, POTENTIALLY OUTDATED, UNVERIFIED
    finding_type = Column(String(50), nullable=False)
    explanation = Column(Text, nullable=False)
    
    # Supporting provenance stored as JSON
    supporting_claim_ids = Column(Text, nullable=True)  # JSON list of claim IDs
    source_ids = Column(Text, nullable=True)  # JSON list of source IDs
    evidence_references = Column(Text, nullable=True)  # JSON list of quote & provenance objects
    
    confidence = Column(Float, default=0.90)
    priority = Column(String(50), default="high")  # critical, high, medium, low
    recommended_action = Column(Text, nullable=False)
    limitations = Column(Text, nullable=False)

    # Relationships
    session = relationship("ResearchSession", backref="gap_findings")
    requirement = relationship("Requirement", backref="gap_findings")
