from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, HttpUrl, Field, ConfigDict


class URLSourceCreate(BaseModel):
    url: str = Field(..., description="Web URL to fetch and analyze")
    title: Optional[str] = Field(None, description="Optional custom title")


class TextSourceCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=255)
    content: str = Field(..., min_length=10, description="Raw text or memorandum to analyze")


class DocumentChunkResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    chunk_index: int
    text_content: str
    page_number: Optional[int]
    start_char: Optional[int]
    end_char: Optional[int]
    token_count: int


class SourceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    session_id: str
    source_type: str  # pdf, url, text
    title: str
    uri: Optional[str]
    publication_date: Optional[datetime]
    author_or_publisher: Optional[str]
    chunk_count: int = 0
    created_at: datetime


class SourceDetailResponse(SourceResponse):
    cleaned_content: Optional[str]
    chunks: List[DocumentChunkResponse] = []
