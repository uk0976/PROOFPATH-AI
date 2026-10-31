from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class VerificationTaskPatchRequest(BaseModel):
    is_completed: Optional[bool] = None
    notes: Optional[str] = None


class VerificationTaskResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    session_id: str
    task_type: str
    title: str
    description: Optional[str] = None
    is_completed: bool
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
