from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class JobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    session_id: str
    status: str
    current_stage: str
    stage_index: int
    total_stages: int
    progress_percent: float
    message: str
    error_message: Optional[str] = None
    retry_count: int
    max_retries: int
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    heartbeat_at: Optional[datetime] = None
    created_at: datetime
