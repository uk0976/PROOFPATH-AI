import asyncio
import json
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.database.session import get_db, SessionLocal
from app.models import ResearchSession, Source, Requirement, Contradiction, BlindSpot, InvestigationJob
from app.schemas.research import (
    ResearchSessionCreate,
    ResearchSessionUpdate,
    ResearchSessionSummary,
    ResearchSessionResponse,
)
from app.schemas.job import JobResponse
from app.services.pipeline_orchestrator import PipelineOrchestrator
from app.services.job_manager import job_manager
from app.services.event_stream import sse_manager
from app.core.exceptions import NotFoundError, AppException

logger = logging.getLogger("proofpath.research")
router = APIRouter(tags=["Research"])


async def run_pipeline_task(session_id: str):
    job_manager.start_investigation_job(session_id=session_id)


@router.post("/research", response_model=ResearchSessionResponse, status_code=status.HTTP_201_CREATED)
def create_research(data: ResearchSessionCreate, db: Session = Depends(get_db)):
    session = ResearchSession(
        title=data.title,
        research_goal=data.research_goal,
        target_decision=data.target_decision,
        status="draft"
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.get("/research", response_model=List[ResearchSessionSummary])
def list_research(db: Session = Depends(get_db)):
    sessions = db.query(ResearchSession).order_by(ResearchSession.created_at.desc()).all()
    results = []
    for s in sessions:
        summary = ResearchSessionSummary(
            id=s.id,
            title=s.title,
            research_goal=s.research_goal,
            target_decision=s.target_decision,
            status=s.status,
            readiness_score=s.readiness_score,
            coverage_score=s.coverage_score,
            consistency_score=s.consistency_score,
            freshness_score=s.freshness_score,
            verification_score=s.verification_score,
            source_count=len(s.sources),
            requirement_count=len(s.requirements),
            conflict_count=len(s.contradictions),
            blindspot_count=len(s.blindspots),
            created_at=s.created_at,
            updated_at=s.updated_at
        )
        results.append(summary)
    return results


@router.get("/research/{research_id}", response_model=ResearchSessionResponse)
def get_research(research_id: str, db: Session = Depends(get_db)):
    session = db.query(ResearchSession).filter(ResearchSession.id == research_id).first()
    if not session:
        raise NotFoundError("ResearchSession", research_id)
    return session


@router.delete("/research/{research_id}", status_code=status.HTTP_200_OK)
def delete_research(research_id: str, db: Session = Depends(get_db)):
    session = db.query(ResearchSession).filter(ResearchSession.id == research_id).first()
    if not session:
        raise NotFoundError("ResearchSession", research_id)
    db.delete(session)
    db.commit()
    return {"success": True, "message": f"Research session '{research_id}' successfully deleted."}


@router.post("/research/{research_id}/start", status_code=status.HTTP_202_ACCEPTED)
async def start_research(
    research_id: str,
    force_rerun: bool = False,
    db: Session = Depends(get_db)
):
    session = db.query(ResearchSession).filter(ResearchSession.id == research_id).first()
    if not session:
        raise NotFoundError("ResearchSession", research_id)

    sources_count = db.query(Source).filter(Source.session_id == research_id).count()
    if sources_count == 0:
        raise AppException("Cannot start investigation: Please attach at least one source document first.", status_code=400, code="NO_SOURCES")

    job, is_new = job_manager.start_investigation_job(session_id=research_id, force_rerun=force_rerun)

    return {
        "success": True,
        "research_id": research_id,
        "job_id": job.id,
        "is_new": is_new,
        "status": job.status,
        "current_stage": job.current_stage,
        "progress_percent": job.progress_percent,
        "progress_stream_url": f"/api/v1/research/{research_id}/progress"
    }


@router.get("/research/{research_id}/job", response_model=Optional[JobResponse])
def get_research_job(research_id: str, db: Session = Depends(get_db)):
    session = db.query(ResearchSession).filter(ResearchSession.id == research_id).first()
    if not session:
        raise NotFoundError("ResearchSession", research_id)

    job = job_manager.get_session_latest_job(research_id, db)
    return job


@router.get("/research/{research_id}/progress")
@router.get("/research/{research_id}/events")
async def get_research_progress(research_id: str, db: Session = Depends(get_db)):
    session = db.query(ResearchSession).filter(ResearchSession.id == research_id).first()
    if not session:
        raise NotFoundError("ResearchSession", research_id)

    # SSE Event Stream
    queue = sse_manager.subscribe(research_id)

    async def event_generator():
        try:
            yield f": keepalive\n\n"
            while True:
                try:
                    event_type, payload = await asyncio.wait_for(queue.get(), timeout=25.0)
                    # 1. Emit specific event name
                    yield f"event: {event_type}\ndata: {json.dumps(payload)}\n\n"
                    # 2. Also emit generic progress event if distinct
                    if event_type != "progress":
                        yield f"event: progress\ndata: {json.dumps(payload)}\n\n"

                    # 3. Handle terminal events
                    if payload.get("stage") in ["REPORT_PREPARATION_COMPLETED", "COMPLETE"]:
                        yield f"event: complete\ndata: {json.dumps(payload)}\n\n"
                        break
                    elif payload.get("stage") in ["INVESTIGATION_FAILED", "ERROR"]:
                        yield f"event: error\ndata: {json.dumps(payload)}\n\n"
                        break
                except asyncio.TimeoutError:
                    yield f": keepalive\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            sse_manager.unsubscribe(research_id, queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )
