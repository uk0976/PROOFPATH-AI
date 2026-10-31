from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import PlainTextResponse, HTMLResponse
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models import (
    ResearchSession,
    Source,
    Requirement,
    Contradiction,
    BlindSpot,
)
from app.schemas.reports import ExecutiveSummaryReport
from app.reports.generator import ReportGenerator

router = APIRouter(prefix="/reports", tags=["Reports & Export"])


@router.get("/{session_id}/markdown", response_class=PlainTextResponse)
def export_markdown_report(session_id: str, db: Session = Depends(get_db)):
    session = db.query(ResearchSession).filter(ResearchSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    sources = db.query(Source).filter(Source.session_id == session_id).all()
    reqs = db.query(Requirement).filter(Requirement.session_id == session_id).all()
    conflicts = db.query(Contradiction).filter(Contradiction.session_id == session_id).all()
    blindspots = db.query(BlindSpot).filter(BlindSpot.session_id == session_id).all()

    md_content = ReportGenerator.generate_markdown(
        session=session,
        sources=sources,
        requirements=reqs,
        conflicts=conflicts,
        blindspots=blindspots
    )

    filename = f"ProofPath_Report_{session_id[:8]}.md"
    return PlainTextResponse(
        content=md_content,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
