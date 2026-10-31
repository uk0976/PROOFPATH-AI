import json
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models import ResearchSession, VerificationTask
from app.schemas.verification import (
    VerificationTaskResponse,
    VerificationTaskCreate,
    VerificationTaskPatchRequest,
    EvidenceReferenceSnippet,
    VerificationSummaryResponse,
)
from app.intelligence.verification_engine import VerificationPlannerEngine
from app.core.exceptions import NotFoundError

router = APIRouter(tags=["Verification"])


def _to_verification_response(t: VerificationTask) -> VerificationTaskResponse:
    evidence_refs = []
    if getattr(t, "evidence_references_json", None):
        try:
            raw = json.loads(t.evidence_references_json)
            evidence_refs = [
                EvidenceReferenceSnippet(
                    source_title=r.get("source_title", "Evidence Source"),
                    exact_quote=r.get("exact_quote", ""),
                    page_number=r.get("page_number"),
                    source_id=r.get("source_id"),
                    source_type=r.get("source_type", "pdf"),
                    confidence=float(r.get("confidence", 1.0)),
                )
                for r in raw
            ]
        except Exception:
            evidence_refs = []

    return VerificationTaskResponse(
        id=t.id,
        session_id=t.session_id,
        task_type=t.task_type or "custom",
        title=t.title,
        description=t.description,
        priority=getattr(t, "priority", "high") or "high",
        related_requirement_id=getattr(t, "related_requirement_id", None),
        related_requirement_text=getattr(t, "related_requirement_text", None),
        related_finding_id=getattr(t, "related_finding_id", None),
        evidence_references=evidence_refs,
        recommended_action=getattr(t, "recommended_action", None),
        is_completed=bool(t.is_completed),
        is_custom=bool(getattr(t, "is_custom", False)),
        notes=t.notes,
        created_at=t.created_at,
        updated_at=t.updated_at,
    )


@router.get("/research/{research_id}/verification", response_model=List[VerificationTaskResponse])
def get_research_verification_tasks(
    research_id: str,
    priority: Optional[str] = Query(None, description="Filter by priority: critical, high, medium, low"),
    status: Optional[str] = Query(None, description="Filter by completion status: completed, pending"),
    db: Session = Depends(get_db)
):
    """
    Retrieves all actionable verification tasks for an investigation.
    If no tasks exist yet, generates them automatically from current findings and contradictions.
    """
    session = db.query(ResearchSession).filter(ResearchSession.id == research_id).first()
    if not session and research_id in ["demo", "demo-scholarship-investigation"]:
        from app.utils.mock_data import seed_demo_investigation
        seed_demo_investigation(db)
        session = db.query(ResearchSession).filter(
            ResearchSession.id.in_(["demo", "demo-scholarship-investigation"])
        ).first()

    if not session:
        raise NotFoundError("ResearchSession", research_id)

    total_count = db.query(VerificationTask).filter(VerificationTask.session_id == research_id).count()
    if total_count == 0:
        VerificationPlannerEngine.generate_tasks_for_session(db, research_id, persist=True)

    query = db.query(VerificationTask).filter(VerificationTask.session_id == research_id)

    if priority and priority.lower() != "all":
        query = query.filter(VerificationTask.priority == priority.lower())

    if status:
        if status.lower() == "completed":
            query = query.filter(VerificationTask.is_completed == True)
        elif status.lower() == "pending":
            query = query.filter(VerificationTask.is_completed == False)

    tasks = query.all()
    priority_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    tasks.sort(key=lambda x: (x.is_completed, priority_order.get((x.priority or "high").lower(), 4)))
    return [_to_verification_response(t) for t in tasks]


@router.post("/research/{research_id}/verification", response_model=VerificationTaskResponse, status_code=status.HTTP_201_CREATED)
def create_custom_verification_task(
    research_id: str,
    data: VerificationTaskCreate,
    db: Session = Depends(get_db)
):
    """Adds a custom user-defined verification task to the investigation."""
    session = db.query(ResearchSession).filter(ResearchSession.id == research_id).first()
    if not session and research_id in ["demo", "demo-scholarship-investigation"]:
        from app.utils.mock_data import seed_demo_investigation
        seed_demo_investigation(db)
        session = db.query(ResearchSession).filter(
            ResearchSession.id.in_(["demo", "demo-scholarship-investigation"])
        ).first()

    if not session:
        raise NotFoundError("ResearchSession", research_id)

    task = VerificationTask(
        session_id=research_id,
        task_type=data.task_type or "custom",
        title=data.title,
        description=data.description,
        priority=data.priority.lower(),
        related_requirement_id=data.related_requirement_id,
        related_requirement_text=data.related_requirement_text,
        recommended_action=data.recommended_action,
        notes=data.notes,
        is_completed=False,
        is_custom=True,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return _to_verification_response(task)


@router.post("/research/{research_id}/verification/generate", response_model=List[VerificationTaskResponse])
def regenerate_verification_tasks(
    research_id: str,
    db: Session = Depends(get_db)
):
    """Regenerates/syncs verification tasks from latest findings and contradictions."""
    session = db.query(ResearchSession).filter(ResearchSession.id == research_id).first()
    if not session and research_id in ["demo", "demo-scholarship-investigation"]:
        from app.utils.mock_data import seed_demo_investigation
        seed_demo_investigation(db)
        session = db.query(ResearchSession).filter(
            ResearchSession.id.in_(["demo", "demo-scholarship-investigation"])
        ).first()

    if not session:
        raise NotFoundError("ResearchSession", research_id)

    tasks = VerificationPlannerEngine.generate_tasks_for_session(db, research_id, persist=True)
    return [_to_verification_response(t) for t in tasks]


@router.patch("/verification/{task_id}", response_model=VerificationTaskResponse)
def patch_verification_task(
    task_id: str,
    data: VerificationTaskPatchRequest,
    db: Session = Depends(get_db)
):
    """Updates completion status, notes, or priority of a verification task."""
    task = db.query(VerificationTask).filter(VerificationTask.id == task_id).first()
    if not task:
        raise NotFoundError("VerificationTask", task_id)

    if data.is_completed is not None:
        task.is_completed = data.is_completed
    if data.notes is not None:
        task.notes = data.notes
    if data.priority is not None:
        task.priority = data.priority.lower()

    db.commit()
    db.refresh(task)
    return _to_verification_response(task)


@router.post("/verification/{task_id}/toggle", response_model=VerificationTaskResponse)
def toggle_verification_task(
    task_id: str,
    db: Session = Depends(get_db)
):
    """Toggles task status between completed and reopened."""
    task = db.query(VerificationTask).filter(VerificationTask.id == task_id).first()
    if not task:
        raise NotFoundError("VerificationTask", task_id)

    task.is_completed = not task.is_completed
    db.commit()
    db.refresh(task)
    return _to_verification_response(task)


@router.delete("/verification/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_verification_task(
    task_id: str,
    db: Session = Depends(get_db)
):
    """Deletes a custom verification task."""
    task = db.query(VerificationTask).filter(VerificationTask.id == task_id).first()
    if not task:
        raise NotFoundError("VerificationTask", task_id)

    db.delete(task)
    db.commit()
    return None
