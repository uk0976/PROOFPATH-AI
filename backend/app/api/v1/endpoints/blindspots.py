from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models import ResearchSession, BlindSpot
from app.schemas.blindspots import BlindSpotResponse, BlindSpotToggleResponse
from app.core.exceptions import NotFoundError

router = APIRouter(tags=["Blindspots"])


@router.get("/research/{research_id}/blindspots", response_model=List[BlindSpotResponse])
@router.get("/blindspots/{research_id}", response_model=List[BlindSpotResponse])
def get_research_blindspots(research_id: str, db: Session = Depends(get_db)):
    session = db.query(ResearchSession).filter(ResearchSession.id == research_id).first()
    if not session:
        raise NotFoundError("ResearchSession", research_id)

    spots = db.query(BlindSpot).filter(BlindSpot.session_id == research_id).all()
    return spots


@router.post("/blindspots/{blindspot_id}/investigate", response_model=BlindSpotToggleResponse)
@router.post("/blindspots/{blindspot_id}/toggle", response_model=BlindSpotToggleResponse)
def investigate_blindspot(blindspot_id: str, db: Session = Depends(get_db)):
    spot = db.query(BlindSpot).filter(BlindSpot.id == blindspot_id).first()
    if not spot:
        raise NotFoundError("BlindSpot", blindspot_id)

    # Toggles resolution / marks investigated
    spot.is_resolved = not spot.is_resolved
    db.commit()
    db.refresh(spot)

    return BlindSpotToggleResponse(id=spot.id, is_resolved=spot.is_resolved)
