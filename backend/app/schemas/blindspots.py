from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class BlindSpotResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    session_id: str
    question: str
    rationale: str
    explanation: Optional[str] = None
    relevance: str = "high"
    risk_level: str = "medium"  # high, medium, low
    priority: str = "P1"  # P1, P2, P3
    category: str = "unaddressed_risk"
    related_requirement_id: Optional[str] = None
    related_requirement_text: Optional[str] = None
    evidence_coverage: str = "uncovered"  # uncovered, partially_answered, answered_in_sources
    source_references: List[Dict[str, Any]] = Field(default_factory=list)
    recommended_action: Optional[str] = None
    is_resolved: bool = False
    is_starred: bool = False
    is_dismissed: bool = False
    is_added_to_plan: bool = False
    added_requirement_id: Optional[str] = None
    created_at: datetime


class BlindSpotToggleResponse(BaseModel):
    id: str
    is_resolved: bool


class BlindSpotActionResponse(BaseModel):
    id: str
    action: str  # add_to_plan, toggle_star, dismiss, restore, investigate
    status: bool
    message: str
    requirement_id: Optional[str] = None
    blindspot: Optional[BlindSpotResponse] = None


class BlindSpotDiscoveryOverview(BaseModel):
    research_id: str
    total_blindspots: int
    uncovered_count: int
    partially_answered_count: int
    answered_in_sources_count: int
    added_to_plan_count: int
    starred_count: int
    blindspots: List[BlindSpotResponse]


class BlindSpotInvestigateResult(BaseModel):
    id: str
    question: str
    evidence_coverage: str
    matching_claims: List[Dict[str, Any]] = Field(default_factory=list)
    summary_answer: str
