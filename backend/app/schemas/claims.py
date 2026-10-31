from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class ClaimResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    chunk_id: str
    source_id: str
    source_title: str
    source_type: str
    page_number: Optional[int] = None
    claim_text: str
    exact_quote: str
    claim_type: str
    date_reference: Optional[str] = None
    confidence_score: float
    is_verified: bool
    created_at: datetime
