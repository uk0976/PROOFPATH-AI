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

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/research", tags=["Research Sessions"])


async def run_pipeline_task(session_id: str):
    db = SessionLocal()
    try:
        orchestrator = PipelineOrchestrator(db=db, session_id=session_id)
        await orchestrator.run()
    except Exception as e:
        logger.exception(f"Background pipeline failed for {session_id}: {e}")
    finally:
        db.close()


@router.post("/", response_model=ResearchSessionResponse, status_code=status.HTTP_201_CREATED)
def create_session(data: ResearchSessionCreate, db: Session = Depends(get_db)):
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


@router.get("/", response_model=List[ResearchSessionSummary])
def list_sessions(db: Session = Depends(get_db)):
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


@router.get("/{session_id}", response_model=ResearchSessionResponse)
def get_session(session_id: str, db: Session = Depends(get_db)):
    session = db.query(ResearchSession).filter(ResearchSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Research session not found")
    return session


@router.post("/{session_id}/start", status_code=status.HTTP_202_ACCEPTED)
async def start_investigation(
    session_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    session = db.query(ResearchSession).filter(ResearchSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Research session not found")

    sources_count = db.query(Source).filter(Source.session_id == session_id).count()
    if sources_count == 0:
        raise HTTPException(status_code=400, detail="Cannot start investigation: Add at least one source document first.")

    session.status = "processing"
    db.commit()

    # Launch background task
    background_tasks.add_task(run_pipeline_task, session_id=session_id)

    return {
        "session_id": session_id,
        "status": "processing",
        "stream_url": f"/api/v1/research/{session_id}/events"
    }


@router.get("/{session_id}/events")
async def stream_investigation_events(session_id: str):
    queue = sse_manager.subscribe(session_id)

    async def event_generator():
        try:
            # Yield initial keepalive
            yield f": keepalive\n\n"
            while True:
                try:
                    event_type, payload = await asyncio.wait_for(queue.get(), timeout=30.0)
                    yield f"event: {event_type}\ndata: {json.dumps(payload)}\n\n"
                    if payload.get("stage") in ["COMPLETE", "ERROR"]:
                        break
                except asyncio.TimeoutError:
                    yield f": keepalive\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            sse_manager.unsubscribe(session_id, queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )
