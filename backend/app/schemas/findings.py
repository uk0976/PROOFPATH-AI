from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel


class ClaimSnippet(BaseModel):
    id: str
    source_id: str
    source_title: str
    source_type: str
    page_number: Optional[int] = None
    claim_text: str
    exact_quote: str
    date_reference: Optional[str] = None
    confidence_score: float = 1.0


class ContradictionResponse(BaseModel):
    id: str
    session_id: str
    requirement_id: Optional[str]
    requirement_text: Optional[str] = None
    severity: str  # high, medium, low
    conflicting_aspect: str
    synthesis_verdict: Optional[str]
    claim_a: ClaimSnippet
    claim_b: ClaimSnippet
    created_at: datetime


class InformationGapResponse(BaseModel):
    requirement_id: str
    requirement_text: str
    category: str
    status: str
    gap_summary: str
    missing_aspects: List[str]
    impact_level: str  # high, medium, low
    suggested_action: str


class TemporalDecayResponse(BaseModel):
    source_id: str
    source_title: str
    publication_date: Optional[str]
    age_in_months: Optional[float]
    status: str  # fresh, aging, outdated, unknown
    decay_warning: Optional[str]
    stale_claims: List[ClaimSnippet] = []
