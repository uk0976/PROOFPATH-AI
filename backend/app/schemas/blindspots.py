from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class BlindSpotResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    session_id: str
    question: str
    rationale: str
    risk_level: str  # high, medium, low
    category: str
    is_resolved: bool
    created_at: datetime


class BlindSpotToggleResponse(BaseModel):
    id: str
    is_resolved: bool
