import asyncio
import json
import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.database.session import get_db, SessionLocal
from app.models import ResearchSession, Source, Requirement, Contradiction, BlindSpot
from app.schemas.research import (
    ResearchSessionCreate,
    ResearchSessionUpdate,
    ResearchSessionSummary,
    ResearchSessionResponse,
)
from app.services.pipeline_orchestrator import PipelineOrchestrator
from app.services.event_stream import sse_manager
from app.core.exceptions import NotFoundError, AppException

logger = logging.getLogger("proofpath.research")
router = APIRouter(tags=["Research"])


async def run_pipeline_task(session_id: str):
    db = SessionLocal()
    try:
        orchestrator = PipelineOrchestrator(db=db, session_id=session_id)
        await orchestrator.run()
    except Exception as e:
        logger.exception(f"Background pipeline failed for {session_id}: {e}")
    finally:
        db.close()


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
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    session = db.query(ResearchSession).filter(ResearchSession.id == research_id).first()
    if not session:
        raise NotFoundError("ResearchSession", research_id)

    sources_count = db.query(Source).filter(Source.session_id == research_id).count()
    if sources_count == 0:
        raise AppException("Cannot start investigation: Please attach at least one source document first.", status_code=400, code="NO_SOURCES")

    session.status = "processing"
    db.commit()

    background_tasks.add_task(run_pipeline_task, session_id=research_id)

    return {
        "success": True,
        "research_id": research_id,
        "status": "processing",
        "progress_stream_url": f"/api/v1/research/{research_id}/progress"
    }


@router.get("/research/{research_id}/progress")
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
                    yield f"event: {event_type}\ndata: {json.dumps(payload)}\n\n"
                    if payload.get("stage") in ["COMPLETE", "ERROR"]:
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
