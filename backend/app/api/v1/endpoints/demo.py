import logging
from typing import Dict, Any
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models import ResearchSession
from app.schemas.research import ResearchSessionResponse, ResearchSessionSummary
from app.utils.mock_data import (
    DEMO_SESSION_ID,
    DEMO_ALIAS_ID,
    seed_demo_investigation,
    reset_demo_investigation,
)

logger = logging.getLogger("proofpath.demo")
router = APIRouter(prefix="/demo", tags=["Demo Mode"])


@router.post("/load", response_model=Dict[str, Any], status_code=status.HTTP_200_OK)
def load_demo(db: Session = Depends(get_db)):
    """
    Ensures the demonstration scholarship dataset is seeded in SQLite and returns
    its session summary and direct navigation target.
    """
    session_id = seed_demo_investigation(db)
    session = db.query(ResearchSession).filter(ResearchSession.id == session_id).first()

    return {
        "status": "ready",
        "session_id": session_id,
        "is_sample_data": True,
        "disclaimer": (
            "DEMO MODE: All scholarship requirements, guidelines, and figures are synthetic "
            "sample data for evaluation and must not be used as official government rules."
        ),
        "session": {
            "id": session.id,
            "title": session.title,
            "research_goal": session.research_goal,
            "target_decision": session.target_decision,
            "status": session.status,
            "readiness_score": session.readiness_score,
            "coverage_score": session.coverage_score,
            "consistency_score": session.consistency_score,
            "freshness_score": session.freshness_score,
            "verification_score": session.verification_score,
            "source_count": len(session.sources),
            "requirement_count": len(session.requirements),
            "conflict_count": len(session.contradictions),
            "blindspot_count": len(session.blindspots),
            "created_at": session.created_at.isoformat(),
            "updated_at": session.updated_at.isoformat(),
        },
    }


@router.post("/reset", response_model=Dict[str, Any], status_code=status.HTTP_200_OK)
def reset_demo(db: Session = Depends(get_db)):
    """
    Resets the demonstration scholarship dataset to its pristine initial state,
    clearing any edits or task status modifications made during evaluation.
    """
    session_id = reset_demo_investigation(db)
    session = db.query(ResearchSession).filter(ResearchSession.id == session_id).first()

    return {
        "status": "reset_successful",
        "session_id": session_id,
        "message": "Demo investigation has been reset to pristine sample state.",
        "is_sample_data": True,
        "session": {
            "id": session.id,
            "title": session.title,
            "status": session.status,
            "readiness_score": session.readiness_score,
        },
    }


@router.get("/session", response_model=ResearchSessionResponse)
def get_demo_session(db: Session = Depends(get_db)):
    """
    Retrieves the complete demonstration research session detail.
    """
    session = db.query(ResearchSession).filter(ResearchSession.id == DEMO_SESSION_ID).first()
    if not session:
        seed_demo_investigation(db)
        session = db.query(ResearchSession).filter(ResearchSession.id == DEMO_SESSION_ID).first()

    return session


@router.get("/status", response_model=Dict[str, Any])
def get_demo_status(db: Session = Depends(get_db)):
    """
    Returns diagnostic status for Demo Mode offline readiness.
    """
    session = db.query(ResearchSession).filter(ResearchSession.id == DEMO_SESSION_ID).first()
    is_seeded = session is not None

    return {
        "mode": "demo",
        "is_seeded": is_seeded,
        "session_id": DEMO_SESSION_ID,
        "offline_ready": True,
        "api_key_required": False,
        "dataset_type": "fictional_scholarship_eligibility",
        "sample_markings_enforced": True,
    }
