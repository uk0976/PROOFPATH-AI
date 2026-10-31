from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class ClaimSnippet(BaseModel):
    id: str
    source_id: str
    source_title: str
    source_type: str
    source_uri: Optional[str] = None
    page_number: Optional[int] = None
    paragraph_reference: Optional[str] = None
    category: Optional[str] = None
    claim_text: str
    exact_quote: str
    date_reference: Optional[str] = None
    applicable_period: Optional[str] = None
    confidence_score: float = 1.0


class ScopeComparison(BaseModel):
    subject: str = "General"
    category: str = "General"
    geographic_scope_a: Optional[str] = None
    geographic_scope_b: Optional[str] = None
    applicant_category_a: Optional[str] = None
    applicant_category_b: Optional[str] = None
    academic_year_a: Optional[str] = None
    academic_year_b: Optional[str] = None
    application_cycle_a: Optional[str] = None
    application_cycle_b: Optional[str] = None
    numerical_value_a: Optional[str] = None
    numerical_value_b: Optional[str] = None
    unit_a: Optional[str] = None
    unit_b: Optional[str] = None
    effective_date_a: Optional[str] = None
    effective_date_b: Optional[str] = None
    conditions_a: Optional[str] = None
    conditions_b: Optional[str] = None
    scope_alignment: str = "aligned"  # aligned, partially_aligned, divergent
    divergence_reasons: List[str] = Field(default_factory=list)


class ContradictionResponse(BaseModel):
    id: str
    session_id: str
    requirement_id: Optional[str]
    requirement_text: Optional[str] = None
    severity: str  # high, medium, low
    conflicting_aspect: str
    synthesis_verdict: Optional[str] = None
    is_genuine: bool = True  # True = Genuine Conflict, False = False Conflict / Scope Differentiation
    conflict_type: str = "direct_factual_clash"  # direct_factual_clash, numerical_threshold_divergence, timeline_conflict, scope_divergence, conditional_distinction
    scope_comparison: Optional[ScopeComparison] = None
    explanation: Optional[str] = None
    recommended_action: Optional[str] = None
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


class TemporalAuditItem(BaseModel):
    source_id: str
    source_title: str
    source_type: str
    uri: Optional[str] = None
    publication_date: Optional[str] = None
    last_modified_date: Optional[str] = None
    effective_date: Optional[str] = None
    expiry_date: Optional[str] = None
    academic_year: Optional[str] = None
    application_cycle: Optional[str] = None
    access_date: Optional[str] = None
    age_in_months: Optional[float] = None
    status: str = "CURRENT_ACTIVE"  # CURRENT_ACTIVE, SUPERSEDED, EXPIRED, DIFFERENT_CYCLE, MISSING_METADATA, PROVISIONAL_FUTURE, AGING, FRESH
    applicability_verdict: str
    decay_risk: str = "none"  # critical, high, medium, low, none
    superseded_by_source_id: Optional[str] = None
    superseded_by_title: Optional[str] = None
    stale_claims: List[ClaimSnippet] = Field(default_factory=list)
    recommended_action: Optional[str] = None


class TemporalAuditResponse(BaseModel):
    research_id: str
    total_sources: int
    active_sources: int
    superseded_sources: int
    expired_sources: int
    differing_cycle_sources: int
    missing_metadata_sources: int
    audits: List[TemporalAuditItem]


class TemporalDecayResponse(BaseModel):
    source_id: str
    source_title: str
    publication_date: Optional[str]
    age_in_months: Optional[float]
    status: str  # fresh, aging, outdated, unknown
    decay_warning: Optional[str]
    stale_claims: List[ClaimSnippet] = []
