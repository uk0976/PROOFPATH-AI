from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class ExtractedClaimItem(BaseModel):
    """
    Pydantic schema representing a single atomic, independently verifiable statement.
    Used for Gemini API structured output validation.
    """
    claim_text: str = Field(..., description="Clear, standalone atomic claim assertion")
    category: str = Field(default="General", description="Category: Eligibility, Academic, Income, Documentation, Deadlines, Financial, Technical, Governance, General")
    original_evidence_text: str = Field(..., description="Exact word-for-word quote directly from the source passage")
    page_number: Optional[int] = Field(None, description="Page number where the evidence appears")
    paragraph_reference: Optional[str] = Field(None, description="Paragraph or section reference (e.g. 'Para 2', 'Section 3.1')")
    applicable_period: Optional[str] = Field(None, description="Applicable period or effective dates (e.g. '2024–2025', 'FY2024')")
    extraction_confidence: float = Field(default=0.95, ge=0.0, le=1.0, description="Extraction confidence score between 0.0 and 1.0")
    claim_type: str = Field(default="assertion", description="Type: quantitative, assertion, temporal, caveat, recommendation")


class ClaimExtractionResponse(BaseModel):
    """Container schema for LLM claim extraction response."""
    claims: List[ExtractedClaimItem] = Field(default_factory=list)


class ClaimExtractionRequest(BaseModel):
    research_id: str
    source_ids: Optional[List[str]] = None


class EvidenceRetrievalRequest(BaseModel):
    research_id: str
    similarity_threshold: float = Field(default=0.35, ge=0.0, le=1.0)
    top_k: int = Field(default=5, ge=1, le=20)


class ClaimResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    chunk_id: str
    source_id: str
    source_title: str
    source_type: str
    source_uri: Optional[str] = None
    source_domain: Optional[str] = None
    claim_text: str
    category: str = "General"
    original_evidence_text: Optional[str] = None
    exact_quote: str
    page_number: Optional[int] = None
    paragraph_reference: Optional[str] = None
    applicable_period: Optional[str] = None
    date_reference: Optional[str] = None
    claim_type: str = "assertion"
    confidence_score: float = 1.0
    extraction_confidence: float = 0.95
    is_verified: bool = False
    linked_requirements_count: int = 0
    linked_requirement_ids: List[str] = []
    created_at: datetime
