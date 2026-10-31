from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class Source(BaseModel):
    __tablename__ = "sources"

    session_id = Column(String(36), ForeignKey("research_sessions.id", ondelete="CASCADE"), nullable=False)
    source_type = Column(String(50), nullable=False)  # pdf, url, text
    title = Column(String(255), nullable=False)
    uri = Column(String(1024), nullable=True)  # URL or filename
    storage_path = Column(String(1024), nullable=True)  # local uploaded file path
    raw_content = Column(Text, nullable=True)
    cleaned_content = Column(Text, nullable=True)
    publication_date = Column(DateTime, nullable=True)
    author_or_publisher = Column(String(255), nullable=True)
    metadata_json = Column(Text, nullable=True)  # JSON string

    # Relationships
    session = relationship("ResearchSession", back_populates="sources")
    chunks = relationship("DocumentChunk", back_populates="source", cascade="all, delete-orphan")
