from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class SourceUrlRequest(BaseModel):
    research_id: str = Field(..., description="ID of the research session")
    url: str = Field(..., description="Web URL to fetch and analyze")
    title: Optional[str] = Field(None, description="Optional custom title")


class SourceBatchUrlRequest(BaseModel):
    research_id: str = Field(..., description="ID of the research session")
    urls: List[str] = Field(..., min_length=1, description="List of Web URLs to fetch and analyze")


class SourceTextRequest(BaseModel):
    research_id: str = Field(..., description="ID of the research session")
    title: str = Field(..., min_length=2, max_length=255)
    content: str = Field(..., min_length=10, description="Raw text or memorandum to analyze")


class DocumentChunkResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    chunk_index: int
    text_content: str
    page_number: Optional[int] = None
    start_char: Optional[int] = None
    end_char: Optional[int] = None
    token_count: int


class SourceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    session_id: str
    source_type: str  # pdf, url, text
    title: str
    uri: Optional[str] = None
    domain: Optional[str] = None
    publication_date: Optional[datetime] = None
    last_modified_date: Optional[datetime] = None
    extraction_timestamp: Optional[datetime] = None
    author_or_publisher: Optional[str] = None
    processing_status: str = "processed"  # pending, processing, processed, failed
    error_details: Optional[str] = None
    content_hash: Optional[str] = None
    word_count: int = 0
    char_count: int = 0
    chunk_count: int = 0
    created_at: datetime


class SourceDetailResponse(SourceResponse):
    raw_content: Optional[str] = None
    cleaned_content: Optional[str] = None
    metadata_json: Optional[str] = None
    chunks: List[DocumentChunkResponse] = []


class BatchIngestionResponse(BaseModel):
    sources: List[SourceResponse]
    total_submitted: int
    total_successful: int
    total_failed: int

