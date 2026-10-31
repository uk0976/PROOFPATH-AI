from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class RequirementItemDTO(BaseModel):
    id: Optional[str] = None
    question: str
    requirement_text: str
    category: str
    description: Optional[str] = None
    importance: str = "high"  # critical, high, medium, low
    priority: str = "P1"      # P0, P1, P2, P3
    weight: float = 1.0
    is_decision_critical: bool = False
    origin: str = "ai_suggested"  # user_requested | ai_suggested
    is_approved: bool = False
    status: str = "uncovered"


class RequirementCreate(BaseModel):
    requirement_text: str = Field(..., min_length=3)
    question: Optional[str] = None
    category: str = Field("General")
    description: Optional[str] = None
    importance: str = Field("high")  # critical, high, medium, low
    priority: str = Field("P1")      # P0, P1, P2, P3
    weight: float = Field(1.0, ge=0.1, le=5.0)
    is_decision_critical: bool = False
    origin: str = "user_requested"
    is_approved: bool = True  # User-created requirements are approved by default


class RequirementUpdate(BaseModel):
    requirement_text: Optional[str] = None
    question: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    importance: Optional[str] = None
    priority: Optional[str] = None
    weight: Optional[float] = None
    is_decision_critical: Optional[bool] = None
    is_approved: Optional[bool] = None
    status: Optional[str] = None


class GeneratePlanRequest(BaseModel):
    goal: Optional[str] = None
    target_decision: Optional[str] = None
    domain_context: Optional[str] = None  # scholarship, business, government_service, technology
    max_criteria: int = Field(8, ge=3, le=15)
    replace_existing_suggestions: bool = False


class PlanApprovalRequest(BaseModel):
    approved_requirement_ids: Optional[List[str]] = None  # If None, approves all suggestions
    decision_critical_ids: Optional[List[str]] = None


class RequirementResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    session_id: str
    requirement_text: str
    question: Optional[str] = None
    description: Optional[str] = None
    category: str
    importance: str = "high"
    priority: str = "P1"
    weight: float = 1.0
    is_decision_critical: bool = False
    origin: str = "ai_suggested"
    is_approved: bool = False
    status: str = "uncovered"
    order_index: int = 0
    created_at: datetime
    evidence_count: int = 0
    conflict_count: int = 0


class ResearchPlanSummaryResponse(BaseModel):
    session_id: str
    total_requirements: int
    official_approved_count: int
    ai_suggested_count: int
    decision_critical_count: int
    categories: List[str]
    requirements: List[RequirementResponse]
