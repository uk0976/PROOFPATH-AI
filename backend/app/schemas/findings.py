from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


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


class EvidenceReference(BaseModel):
    claim_id: Optional[str] = None
    claim_text: Optional[str] = None
    exact_quote: str
    source_id: str
    source_title: str
    source_type: str
    page_number: Optional[int] = None
    paragraph_reference: Optional[str] = None
    source_uri: Optional[str] = None
    confidence: float = 1.0


class GapFindingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    session_id: str
    requirement_id: str
    requirement_text: str
    category: str
    finding_type: str  # COVERED, MISSING, INCOMPLETE, POTENTIAL CONFLICT, POTENTIALLY OUTDATED, UNVERIFIED
    explanation: str
    supporting_claim_ids: List[str] = Field(default_factory=list)
    source_ids: List[str] = Field(default_factory=list)
    evidence_references: List[EvidenceReference] = Field(default_factory=list)
    confidence: float = 0.90
    priority: str = "high"  # critical, high, medium, low
    recommended_action: str
    limitations: str
    created_at: datetime


class GapAnalysisOverview(BaseModel):
    research_id: str
    total_findings: int
    counts_by_type: Dict[str, int]
    findings: List[GapFindingResponse]


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
