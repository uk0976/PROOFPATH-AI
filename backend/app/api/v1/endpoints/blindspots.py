import json
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models import ResearchSession, BlindSpot, Requirement
from app.schemas.blindspots import (
    BlindSpotResponse,
    BlindSpotToggleResponse,
    BlindSpotActionResponse,
    BlindSpotDiscoveryOverview,
)
from app.intelligence.blindspot_engine import BlindSpotDiscoveryEngine
from app.core.exceptions import NotFoundError

router = APIRouter(tags=["Blindspots"])


def _to_blindspot_response(spot: BlindSpot) -> BlindSpotResponse:
    source_refs = []
    if getattr(spot, "source_references_json", None):
        try:
            source_refs = json.loads(spot.source_references_json)
        except Exception:
            source_refs = []

    return BlindSpotResponse(
        id=spot.id,
        session_id=spot.session_id,
        question=spot.question,
        rationale=spot.rationale,
        explanation=getattr(spot, "explanation", spot.rationale),
        relevance=getattr(spot, "relevance", "High"),
        risk_level=getattr(spot, "risk_level", "medium"),
        priority=getattr(spot, "priority", "P1"),
        category=getattr(spot, "category", "unaddressed_risk"),
        related_requirement_id=getattr(spot, "related_requirement_id", None),
        related_requirement_text=getattr(spot, "related_requirement_text", None),
        evidence_coverage=getattr(spot, "evidence_coverage", "uncovered"),
        source_references=source_refs,
        recommended_action=getattr(spot, "recommended_action", None),
        is_resolved=getattr(spot, "is_resolved", False),
        is_starred=getattr(spot, "is_starred", False),
        is_dismissed=getattr(spot, "is_dismissed", False),
        is_added_to_plan=getattr(spot, "is_added_to_plan", False),
        added_requirement_id=getattr(spot, "added_requirement_id", None),
        created_at=spot.created_at,
    )


@router.get("/research/{research_id}/blindspots", response_model=List[BlindSpotResponse])
@router.get("/blindspots/{research_id}", response_model=List[BlindSpotResponse])
async def get_research_blindspots(
    research_id: str,
    include_dismissed: bool = Query(False, description="Whether to include user-dismissed suggestions"),
    risk_level: Optional[str] = Query(None, description="Filter by risk level: high, medium, low"),
    db: Session = Depends(get_db)
):
    session = db.query(ResearchSession).filter(ResearchSession.id == research_id).first()
    if not session and research_id in ["demo", "demo-scholarship-investigation"]:
        from app.utils.mock_data import seed_demo_investigation
        seed_demo_investigation(db)
        session = db.query(ResearchSession).filter(
            ResearchSession.id.in_(["demo", "demo-scholarship-investigation"])
        ).first()

    if not session:
        raise NotFoundError("ResearchSession", research_id)

    total_spots_count = db.query(BlindSpot).filter(BlindSpot.session_id == research_id).count()
    if total_spots_count == 0:
        # Run discovery if none exist yet
        await BlindSpotDiscoveryEngine.discover_for_session(db, research_id, persist=True)

    query = db.query(BlindSpot).filter(BlindSpot.session_id == research_id)
    if not include_dismissed:
        query = query.filter(BlindSpot.is_dismissed == False)
    if risk_level:
        query = query.filter(BlindSpot.risk_level == risk_level.lower())

    spots = query.all()
    return [_to_blindspot_response(s) for s in spots]


@router.post("/research/{research_id}/discover-blindspots", response_model=List[BlindSpotResponse], status_code=status.HTTP_200_OK)
async def trigger_blindspot_discovery(research_id: str, db: Session = Depends(get_db)):
    """Triggers the full 10-step AI BlindSpot Discovery Engine for the session."""
    session = db.query(ResearchSession).filter(ResearchSession.id == research_id).first()
    if not session and research_id in ["demo", "demo-scholarship-investigation"]:
        from app.utils.mock_data import seed_demo_investigation
        seed_demo_investigation(db)
        session = db.query(ResearchSession).filter(
            ResearchSession.id.in_(["demo", "demo-scholarship-investigation"])
        ).first()

    if not session:
        raise NotFoundError("ResearchSession", research_id)

    spots = await BlindSpotDiscoveryEngine.discover_for_session(db, research_id, persist=True)
    return [_to_blindspot_response(s) for s in spots]


@router.post("/blindspots/{blindspot_id}/add-to-plan", response_model=BlindSpotActionResponse)
def add_blindspot_to_research_plan(blindspot_id: str, db: Session = Depends(get_db)):
    """Promotes a suggested question into an active Research Requirement on the plan."""
    spot = db.query(BlindSpot).filter(BlindSpot.id == blindspot_id).first()
    if not spot:
        raise NotFoundError("BlindSpot", blindspot_id)

    req = BlindSpotDiscoveryEngine.add_blindspot_to_research_plan(db, blindspot_id)

    return BlindSpotActionResponse(
        id=spot.id,
        action="add_to_plan",
        status=True,
        message=f"Added question to research plan as active requirement '{req.id[:8]}'",
        requirement_id=req.id,
        blindspot=_to_blindspot_response(spot)
    )


@router.post("/blindspots/{blindspot_id}/toggle-star", response_model=BlindSpotActionResponse)
def toggle_blindspot_star(blindspot_id: str, db: Session = Depends(get_db)):
    """Marks or unmarks a suggested question as important / bookmarked."""
    spot = db.query(BlindSpot).filter(BlindSpot.id == blindspot_id).first()
    if not spot:
        raise NotFoundError("BlindSpot", blindspot_id)

    spot.is_starred = not spot.is_starred
    db.commit()
    db.refresh(spot)

    return BlindSpotActionResponse(
        id=spot.id,
        action="toggle_star",
        status=spot.is_starred,
        message="Marked as important" if spot.is_starred else "Unmarked as important",
        blindspot=_to_blindspot_response(spot)
    )


@router.post("/blindspots/{blindspot_id}/dismiss", response_model=BlindSpotActionResponse)
def dismiss_blindspot(blindspot_id: str, db: Session = Depends(get_db)):
    """Dismisses or restores a suggested question."""
    spot = db.query(BlindSpot).filter(BlindSpot.id == blindspot_id).first()
    if not spot:
        raise NotFoundError("BlindSpot", blindspot_id)

    spot.is_dismissed = not spot.is_dismissed
    db.commit()
    db.refresh(spot)

    return BlindSpotActionResponse(
        id=spot.id,
        action="dismiss",
        status=spot.is_dismissed,
        message="Suggestion dismissed" if spot.is_dismissed else "Suggestion restored",
        blindspot=_to_blindspot_response(spot)
    )


@router.post("/blindspots/{blindspot_id}/investigate", response_model=BlindSpotToggleResponse)
@router.post("/blindspots/{blindspot_id}/toggle", response_model=BlindSpotToggleResponse)
def investigate_blindspot(blindspot_id: str, db: Session = Depends(get_db)):
    """Toggles resolution status and marks individual question investigated."""
    spot = db.query(BlindSpot).filter(BlindSpot.id == blindspot_id).first()
    if not spot:
        raise NotFoundError("BlindSpot", blindspot_id)

    spot.is_resolved = not spot.is_resolved
    db.commit()
    db.refresh(spot)

    return BlindSpotToggleResponse(id=spot.id, is_resolved=spot.is_resolved)
