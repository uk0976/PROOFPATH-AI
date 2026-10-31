from sqlalchemy import Column, String, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class ReportDossier(BaseModel):
    __tablename__ = "report_dossiers"

    session_id = Column(String(36), ForeignKey("research_sessions.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    format = Column(String(20), default="markdown")  # markdown, html, json
    content_markdown = Column(Text, nullable=False)
    file_path = Column(String(1024), nullable=True)

    # Relationships
    session = relationship("ResearchSession", back_populates="reports")
