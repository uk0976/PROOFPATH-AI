import os
from datetime import datetime
from fastapi import APIRouter, Depends, Query, status, Response
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models import (
    ResearchSession,
    Source,
    Requirement,
    Contradiction,
    BlindSpot,
    ReportDossier,
    GapFinding,
    VerificationTask,
    AtomicClaim,
)
from app.schemas.reports import ReportGenerateRequest, ReportGenerateResponse
from app.reports.generator import ReportGenerator
from app.config import settings
from app.core.exceptions import NotFoundError

router = APIRouter(tags=["Reports"])


@router.post("/research/{research_id}/report", response_model=ReportGenerateResponse, status_code=status.HTTP_201_CREATED)
def generate_research_report(
    research_id: str,
    data: ReportGenerateRequest = None,
    db: Session = Depends(get_db)
):
    session = db.query(ResearchSession).filter(ResearchSession.id == research_id).first()
    if not session:
        raise NotFoundError("ResearchSession", research_id)

    sources = db.query(Source).filter(Source.session_id == research_id).all()
    reqs = db.query(Requirement).filter(Requirement.session_id == research_id).all()
    conflicts = db.query(Contradiction).filter(Contradiction.session_id == research_id).all()
    blindspots = db.query(BlindSpot).filter(BlindSpot.session_id == research_id).all()

    md_content = ReportGenerator.generate_markdown(
        session=session,
        sources=sources,
        requirements=reqs,
        conflicts=conflicts,
        blindspots=blindspots
    )

    report_title = (data.title if data and data.title else None) or f"Executive Briefing: {session.title}"
    fmt = (data.format if data and data.format else "markdown")

    report_dossier = ReportDossier(
        session_id=research_id,
        title=report_title,
        format=fmt,
        content_markdown=md_content,
    )
    db.add(report_dossier)
    db.commit()
    db.refresh(report_dossier)

    # Save to disk
    file_path = os.path.join(settings.REPORT_DIR, f"{report_dossier.id}_{report_dossier.title[:30]}.md")
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(md_content)
    report_dossier.file_path = file_path
    db.commit()

    return ReportGenerateResponse(
        id=report_dossier.id,
        session_id=report_dossier.session_id,
        title=report_dossier.title,
        format=report_dossier.format,
        created_at=report_dossier.created_at,
        download_url=f"/api/v1/reports/{report_dossier.id}/download"
    )


@router.get("/reports/{report_id}/download", response_class=PlainTextResponse)
def download_report(report_id: str, db: Session = Depends(get_db)):
    report = db.query(ReportDossier).filter(ReportDossier.id == report_id).first()
    if not report:
        raise NotFoundError("ReportDossier", report_id)

    filename = f"ProofPath_Report_{report_id[:8]}.md"
    return PlainTextResponse(
        content=report.content_markdown,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@router.get("/reports/{research_id}/markdown", response_class=PlainTextResponse)
def download_markdown_dossier(research_id: str, db: Session = Depends(get_db)):
    # Check if research_id matches a ResearchSession
    session = db.query(ResearchSession).filter(ResearchSession.id == research_id).first()
    if not session and research_id == "demo":
        session = db.query(ResearchSession).first()
    if session:
        sources = db.query(Source).filter(Source.session_id == research_id).all()
        reqs = db.query(Requirement).filter(Requirement.session_id == research_id).all()
        conflicts = db.query(Contradiction).filter(Contradiction.session_id == research_id).all()
        blindspots = db.query(BlindSpot).filter(BlindSpot.session_id == research_id).all()

        md_content = ReportGenerator.generate_markdown(
            session=session,
            sources=sources,
            requirements=reqs,
            conflicts=conflicts,
            blindspots=blindspots
        )
        safe_title = "".join(c for c in session.title if c.isalnum() or c in (" ", "_", "-")).rstrip()
        filename = f"ProofPath_{safe_title[:20].strip().replace(' ', '_')}_Report.md"
        return PlainTextResponse(
            content=md_content,
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )

    # Check if it's a ReportDossier id
    report = db.query(ReportDossier).filter(ReportDossier.id == research_id).first()
    if report:
        filename = f"ProofPath_Report_{report.id[:8]}.md"
        return PlainTextResponse(
            content=report.content_markdown,
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )

    raise NotFoundError("ResearchSession or Report", research_id)


@router.get("/reports/{research_id}/pdf")
def download_pdf_dossier(research_id: str, db: Session = Depends(get_db)):
    session = db.query(ResearchSession).filter(ResearchSession.id == research_id).first()
    if not session:
        # Check if research_id is a ReportDossier id
        report = db.query(ReportDossier).filter(ReportDossier.id == research_id).first()
        if report:
            session = db.query(ResearchSession).filter(ResearchSession.id == report.session_id).first()
        elif research_id in ["demo", "demo-scholarship-investigation"]:
            from app.utils.mock_data import seed_demo_investigation
            seed_demo_investigation(db)
            session = db.query(ResearchSession).filter(
                ResearchSession.id.in_(["demo", "demo-scholarship-investigation"])
            ).first()
        if not session:
            raise NotFoundError("ResearchSession or Report", research_id)

    sources = db.query(Source).filter(Source.session_id == session.id).all()
    reqs = db.query(Requirement).filter(Requirement.session_id == session.id).all()
    conflicts = db.query(Contradiction).filter(Contradiction.session_id == session.id).all()
    blindspots = db.query(BlindSpot).filter(BlindSpot.session_id == session.id).all()
    findings = db.query(GapFinding).filter(GapFinding.session_id == session.id).all()
    tasks = db.query(VerificationTask).filter(VerificationTask.session_id == session.id).all()
    
    source_ids = [s.id for s in sources]
    claims = db.query(AtomicClaim).filter(AtomicClaim.source_id.in_(source_ids)).all() if source_ids else []

    pdf_bytes = ReportGenerator.generate_pdf(
        session=session,
        sources=sources,
        requirements=reqs,
        conflicts=conflicts,
        blindspots=blindspots,
        findings=findings,
        claims=claims,
        verification_tasks=tasks,
    )

    safe_title = "".join(c for c in session.title if c.isalnum() or c in (" ", "_", "-")).rstrip()
    filename = f"ProofPath_{safe_title[:20].strip().replace(' ', '_')}_Report.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
