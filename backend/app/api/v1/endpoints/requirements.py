from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.schemas.requirements import (
    RequirementCreate,
    RequirementUpdate,
    RequirementResponse,
    GeneratePlanRequest,
    PlanApprovalRequest,
    ResearchPlanSummaryResponse,
)
from app.services.research_planner import research_planner_service

router = APIRouter(tags=["Requirements & Research Planner"])


@router.get("/research/{research_id}/requirements", response_model=List[RequirementResponse])
@router.get("/requirements/{research_id}", response_model=List[RequirementResponse])
def get_research_requirements(research_id: str, db: Session = Depends(get_db)):
    """
    List all requirements for a research session with full metadata (question, category, description, importance, priority, provenance).
    """
    summary = research_planner_service.get_plan_summary(session_id=research_id, db=db)
    return summary.requirements


@router.get("/research/{research_id}/plan", response_model=ResearchPlanSummaryResponse)
def get_research_plan(research_id: str, db: Session = Depends(get_db)):
    """
    Retrieves the structured research plan summary with category breakdowns and approval statistics.
    """
    return research_planner_service.get_plan_summary(session_id=research_id, db=db)


@router.post("/research/{research_id}/plan/generate", response_model=ResearchPlanSummaryResponse)
async def generate_research_plan(
    research_id: str,
    request: GeneratePlanRequest = GeneratePlanRequest(),
    db: Session = Depends(get_db)
):
    """
    Intelligent Research Planner: Converts broad research goals into structured,
    independently verifiable research requirements via Gemini API.
    All AI-generated questions are marked with origin='ai_suggested' and is_approved=False.
    """
    return await research_planner_service.generate_plan(
        session_id=research_id,
        request=request,
        db=db
    )


@router.post("/research/{research_id}/plan/approve", response_model=ResearchPlanSummaryResponse)
def approve_research_plan(
    research_id: str,
    request: PlanApprovalRequest = PlanApprovalRequest(),
    db: Session = Depends(get_db)
):
    """
    Approve AI-suggested research requirements, converting them into official requirements for the investigation.
    Never presents unapproved suggestions as official requirements.
    """
    return research_planner_service.approve_plan(
        session_id=research_id,
        request=request,
        db=db
    )


@router.post(
    "/research/{research_id}/requirements",
    response_model=RequirementResponse,
    status_code=status.HTTP_201_CREATED
)
def create_requirement(
    research_id: str,
    data: RequirementCreate,
    db: Session = Depends(get_db)
):
    """
    Manually add a user-requested requirement. Marked as origin='user_requested' and is_approved=True.
    """
    return research_planner_service.add_user_requirement(
        session_id=research_id,
        data=data,
        db=db
    )


@router.patch("/requirements/{requirement_id}", response_model=RequirementResponse)
def patch_requirement(
    requirement_id: str,
    data: RequirementUpdate,
    db: Session = Depends(get_db)
):
    """
    Update a requirement's text, question, category, description, importance, priority, or decision-critical status.
    """
    return research_planner_service.update_requirement(
        requirement_id=requirement_id,
        data=data,
        db=db
    )


@router.delete("/requirements/{requirement_id}", status_code=status.HTTP_200_OK)
def delete_requirement(requirement_id: str, db: Session = Depends(get_db)):
    """
    Delete a requirement or suggested question.
    """
    return research_planner_service.delete_requirement(
        requirement_id=requirement_id,
        db=db
    )
