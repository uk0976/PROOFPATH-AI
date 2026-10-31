from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models import BlindSpot
from app.schemas.blindspots import BlindSpotResponse, BlindSpotToggleResponse

router = APIRouter(prefix="/blindspots", tags=["BlindSpots & Verification"])


@router.get("/{session_id}", response_model=List[BlindSpotResponse])
def get_blindspots(session_id: str, db: Session = Depends(get_db)):
    spots = db.query(BlindSpot).filter(BlindSpot.session_id == session_id).all()
    return spots


@router.post("/{blindspot_id}/toggle", response_model=BlindSpotToggleResponse)
def toggle_blindspot(blindspot_id: str, db: Session = Depends(get_db)):
    spot = db.query(BlindSpot).filter(BlindSpot.id == blindspot_id).first()
    if not spot:
        raise HTTPException(status_code=404, detail="Blindspot question not found")

    spot.is_resolved = not spot.is_resolved
    db.commit()
    db.refresh(spot)

    return BlindSpotToggleResponse(id=spot.id, is_resolved=spot.is_resolved)
