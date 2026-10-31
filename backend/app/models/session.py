from sqlalchemy import Column, String, Text, Float
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class ResearchSession(BaseModel):
    __tablename__ = "research_sessions"

    title = Column(String(255), nullable=False)
    research_goal = Column(Text, nullable=False)
    target_decision = Column(Text, nullable=True)
    status = Column(String(50), default="draft")  # draft, processing, completed, failed

    # Readiness Scores (0.0 to 100.0)
    readiness_score = Column(Float, default=0.0)
    coverage_score = Column(Float, default=0.0)
    consistency_score = Column(Float, default=0.0)
    freshness_score = Column(Float, default=0.0)
    verification_score = Column(Float, default=0.0)

    # Executive Summary / Verdict
    executive_verdict = Column(Text, nullable=True)

    # Relationships
    sources = relationship("Source", back_populates="session", cascade="all, delete-orphan")
    requirements = relationship("Requirement", back_populates="session", cascade="all, delete-orphan")
    contradictions = relationship("Contradiction", back_populates="session", cascade="all, delete-orphan")
    blindspots = relationship("BlindSpot", back_populates="session", cascade="all, delete-orphan")
    verification_tasks = relationship("VerificationTask", back_populates="session", cascade="all, delete-orphan")
    reports = relationship("ReportDossier", back_populates="session", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="session", cascade="all, delete-orphan")
    jobs = relationship("InvestigationJob", back_populates="session", cascade="all, delete-orphan")
