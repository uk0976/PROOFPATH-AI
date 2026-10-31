from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel
from app.schemas.research import ResearchSessionResponse
from app.schemas.findings import ContradictionResponse, InformationGapResponse
from app.schemas.blindspots import BlindSpotResponse


class ExecutiveSummaryReport(BaseModel):
    session: ResearchSessionResponse
    total_sources: int
    total_requirements: int
    total_claims: int
    readiness_tier: str  # Decision-Ready, Conditional Proceed, Critical Blindspots
    key_findings: List[str]
    critical_conflicts: List[ContradictionResponse]
    top_gaps: List[InformationGapResponse]
    unasked_questions: List[BlindSpotResponse]
    action_checklist: List[Dict[str, Any]]
    generated_at: datetime
