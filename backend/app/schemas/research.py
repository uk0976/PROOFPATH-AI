from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class ResearchSessionCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=255, description="Brief descriptive title")
    research_goal: str = Field(..., min_length=5, description="The primary question or investigation goal")
    target_decision: Optional[str] = Field(None, description="The concrete decision or action riding on this analysis")


class ResearchSessionUpdate(BaseModel):
    title: Optional[str] = None
    research_goal: Optional[str] = None
    target_decision: Optional[str] = None


class ResearchSessionSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    research_goal: str
    target_decision: Optional[str]
    status: str
    readiness_score: float
    coverage_score: float
    consistency_score: float
    freshness_score: float
    verification_score: float
    source_count: int = 0
    requirement_count: int = 0
    conflict_count: int = 0
    blindspot_count: int = 0
    created_at: datetime
    updated_at: datetime


class ResearchSessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    research_goal: str
    target_decision: Optional[str]
    status: str
    readiness_score: float
    coverage_score: float
    consistency_score: float
    freshness_score: float
    verification_score: float
    executive_verdict: Optional[str]
    created_at: datetime
    updated_at: datetime
