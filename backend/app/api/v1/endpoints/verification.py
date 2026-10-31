from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models import ResearchSession, VerificationTask, Contradiction, BlindSpot
from app.schemas.verification import (
    VerificationTaskResponse,
    VerificationTaskPatchRequest,
)
from app.core.exceptions import NotFoundError

router = APIRouter(tags=["Verification"])


@router.get("/research/{research_id}/verification", response_model=List[VerificationTaskResponse])
def get_research_verification_tasks(research_id: str, db: Session = Depends(get_db)):
    session = db.query(ResearchSession).filter(ResearchSession.id == research_id).first()
    if not session:
        raise NotFoundError("ResearchSession", research_id)

    tasks = db.query(VerificationTask).filter(VerificationTask.session_id == research_id).all()

    # If no tasks exist yet, auto-populate from contradictions and blindspots
    if not tasks:
        conflicts = db.query(Contradiction).filter(Contradiction.session_id == research_id).all()
        for c in conflicts:
            t = VerificationTask(
                session_id=research_id,
                task_type="contradiction",
                title=f"Arbitrate conflict: {c.conflicting_aspect}",
                description=f"Evaluate competing claims and determine which specification is authoritative.",
                is_completed=False
            )
            db.add(t)

        blindspots = db.query(BlindSpot).filter(BlindSpot.session_id == research_id).all()
        for b in blindspots:
            t = VerificationTask(
                session_id=research_id,
                task_type="blindspot",
                title=f"Address omitted risk: {b.question}",
                description=b.rationale,
                is_completed=b.is_resolved
            )
            db.add(t)

        db.commit()
        tasks = db.query(VerificationTask).filter(VerificationTask.session_id == research_id).all()

    return tasks


@router.patch("/verification/{task_id}", response_model=VerificationTaskResponse)
def patch_verification_task(
    task_id: str,
    data: VerificationTaskPatchRequest,
    db: Session = Depends(get_db)
):
    task = db.query(VerificationTask).filter(VerificationTask.id == task_id).first()
    if not task:
        raise NotFoundError("VerificationTask", task_id)

    if data.is_completed is not None:
        task.is_completed = data.is_completed
    if data.notes is not None:
        task.notes = data.notes

    db.commit()
    db.refresh(task)
    return task
