from sqlalchemy import Column, String, Text, DateTime, Integer, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class Source(BaseModel):
    __tablename__ = "sources"

    session_id = Column(String(36), ForeignKey("research_sessions.id", ondelete="CASCADE"), nullable=False)
    source_type = Column(String(50), nullable=False)  # pdf, url, text
    title = Column(String(255), nullable=False)
    uri = Column(String(1024), nullable=True)  # URL or filename
    domain = Column(String(255), nullable=True)  # e.g. whitehouse.gov, arxiv.org
    storage_path = Column(String(1024), nullable=True)  # local uploaded file path
    raw_content = Column(Text, nullable=True)
    cleaned_content = Column(Text, nullable=True)
    publication_date = Column(DateTime, nullable=True)
    last_modified_date = Column(DateTime, nullable=True)
    extraction_timestamp = Column(DateTime, nullable=True)
    author_or_publisher = Column(String(255), nullable=True)
    metadata_json = Column(Text, nullable=True)  # JSON string
    processing_status = Column(String(50), default="processed", nullable=False)  # pending, processing, processed, failed
    error_details = Column(Text, nullable=True)
    content_hash = Column(String(64), nullable=True)  # SHA-256
    word_count = Column(Integer, default=0)
    char_count = Column(Integer, default=0)

    # Relationships
    session = relationship("ResearchSession", back_populates="sources")
    chunks = relationship("DocumentChunk", back_populates="source", cascade="all, delete-orphan")

