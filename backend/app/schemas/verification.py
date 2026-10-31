from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class EvidenceReferenceSnippet(BaseModel):
    source_title: str
    exact_quote: str
    page_number: Optional[int] = None
    source_id: Optional[str] = None
    source_type: Optional[str] = "pdf"
    confidence: Optional[float] = 1.0


class VerificationTaskCreate(BaseModel):
    title: str = Field(..., min_length=3, description="Descriptive task title")
    description: Optional[str] = Field(None, description="Detailed actionable guidance")
    task_type: str = Field(
        "custom",
        description="verify_missing_information, resolve_incomplete_requirements, investigate_conflicting_claims, check_outdated_information, validate_unverified_claims, custom"
    )
    priority: str = Field("medium", description="critical, high, medium, low")
    related_requirement_id: Optional[str] = None
    related_requirement_text: Optional[str] = None
    recommended_action: Optional[str] = None
    notes: Optional[str] = None


class VerificationTaskPatchRequest(BaseModel):
    is_completed: Optional[bool] = None
    notes: Optional[str] = None
    priority: Optional[str] = None


class VerificationTaskResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    session_id: str
    task_type: str
    title: str
    description: Optional[str] = None
    priority: str = "high"
    related_requirement_id: Optional[str] = None
    related_requirement_text: Optional[str] = None
    related_finding_id: Optional[str] = None
    evidence_references: List[EvidenceReferenceSnippet] = []
    recommended_action: Optional[str] = None
    is_completed: bool = False
    is_custom: bool = False
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class VerificationSummaryResponse(BaseModel):
    session_id: str
    total_tasks: int
    completed_tasks: int
    pending_tasks: int
    by_priority: Dict[str, int]
    by_type: Dict[str, int]
    tasks: List[VerificationTaskResponse]
