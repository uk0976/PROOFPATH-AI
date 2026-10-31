from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.schemas.research import ResearchSessionResponse
from app.schemas.findings import ContradictionResponse, InformationGapResponse
from app.schemas.blindspots import BlindSpotResponse


class ReportGenerateRequest(BaseModel):
    title: Optional[str] = None
    format: str = "markdown"  # markdown, html, json


class ReportGenerateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    session_id: str
    title: str
    format: str
    created_at: datetime
    download_url: str


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
