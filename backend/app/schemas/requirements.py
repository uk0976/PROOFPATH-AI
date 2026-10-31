from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class RequirementCreate(BaseModel):
    requirement_text: str = Field(..., min_length=5)
    category: str = Field("functional")
    weight: float = Field(1.0, ge=0.1, le=5.0)


class RequirementUpdate(BaseModel):
    requirement_text: Optional[str] = None
    category: Optional[str] = None
    weight: Optional[float] = None
    status: Optional[str] = None


class DecomposeRequest(BaseModel):
    additional_context: Optional[str] = None
    max_criteria: int = Field(6, ge=3, le=12)


class RequirementResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    session_id: str
    requirement_text: str
    category: str
    weight: float
    status: str  # covered, partial, uncovered, conflict
    order_index: int
    created_at: datetime
    evidence_count: int = 0
    conflict_count: int = 0
