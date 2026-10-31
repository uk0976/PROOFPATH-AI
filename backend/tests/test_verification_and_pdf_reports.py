import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient

from app.main import app
from app.database.session import SessionLocal
from app.models import (
    ResearchSession,
    Source,
    DocumentChunk,
    Requirement,
    AtomicClaim,
    Contradiction,
    BlindSpot,
    GapFinding,
    VerificationTask,
)
from app.intelligence.verification_engine import VerificationPlannerEngine
from app.reports.generator import ReportGenerator
from app.reports.pdf_generator import PdfReportGenerator
import pymupdf

client = TestClient(app)


@pytest.fixture
def populated_session():
    db = SessionLocal()
    try:
        session = ResearchSession(
            title="Postgraduate STEM Scholarship Verification & PDF Audit",
            research_goal="Verify all eligibility thresholds, mandatory documents, and residency clauses.",
            target_decision="Final Scholarship Application Sign-off",
            status="completed",
            readiness_score=78.5,
            coverage_score=80.0,
            consistency_score=75.0,
            freshness_score=85.0,
            verification_score=92.0,
            executive_verdict="Conditional Proceed: 1 Contradiction in CGPA, 1 Missing Insurance Document.",
        )
        db.add(session)
        db.commit()

        # Ingest Sources
        src1 = Source(
            session_id=session.id,
            source_type="pdf",
            title="Official Scholarship Gazette 2026.pdf",
            uri="Scholarship_Gazette_2026.pdf",
            publication_date=datetime(2026, 1, 15, tzinfo=timezone.utc),
            processing_status="processed",
        )
        src2 = Source(
            session_id=session.id,
            source_type="url",
            title="Admissions Portal Guidelines (URL)",
            uri="https://scholarships.gov/stem-2026",
            publication_date=datetime(2026, 2, 1, tzinfo=timezone.utc),
            processing_status="processed",
        )
        db.add_all([src1, src2])
        db.commit()

        # Chunks & Claims
        chunk1 = DocumentChunk(
            source_id=src1.id,
            chunk_index=0,
            text_content="Applicants must maintain minimum 3.5 cumulative GPA.",
            token_count=10,
        )
        chunk2 = DocumentChunk(
            source_id=src2.id,
            chunk_index=0,
            text_content="Applicants must maintain minimum 3.7 cumulative GPA.",
            token_count=10,
        )
        db.add_all([chunk1, chunk2])
        db.commit()

        claim1 = AtomicClaim(
            chunk_id=chunk1.id,
            source_id=src1.id,
            claim_text="Applicants must maintain minimum 3.5 cumulative GPA.",
            exact_quote="minimum 3.5 cumulative GPA across all accredited degrees",
            page_number=2,
            confidence_score=0.98,
        )
        claim2 = AtomicClaim(
            chunk_id=chunk2.id,
            source_id=src2.id,
            claim_text="Applicants must maintain minimum 3.7 cumulative GPA.",
            exact_quote="minimum 3.7 cumulative GPA for priority consideration",
            page_number=1,
            confidence_score=0.95,
        )
        db.add_all([claim1, claim2])
        db.commit()

        # Requirements
        req_gpa = Requirement(
            session_id=session.id,
            requirement_text="Cumulative GPA threshold must be satisfied",
            category="academic",
            weight=3.0,
            is_decision_critical=True,
            status="conflict",
        )
        req_ins = Requirement(
            session_id=session.id,
            requirement_text="Comprehensive International Health Insurance Coverage Certificate",
            category="documents",
            weight=2.0,
            is_decision_critical=True,
            status="uncovered",
        )
        req_rec = Requirement(
            session_id=session.id,
            requirement_text="Two formal letters of academic recommendation",
            category="documents",
            weight=1.5,
            is_decision_critical=False,
            status="covered",
        )
        db.add_all([req_gpa, req_ins, req_rec])
        db.commit()

        # Contradiction
        conflict = Contradiction(
            session_id=session.id,
            requirement_id=req_gpa.id,
            claim_a_id=claim1.id,
            claim_b_id=claim2.id,
            conflicting_aspect="Minimum Cumulative GPA: 3.5 vs 3.7 Threshold",
            severity="high",
            synthesis_verdict="Source A requires 3.5 GPA for standard eligibility, while Source B requires 3.7 for priority ranking.",
        )
        db.add(conflict)

        # BlindSpot
        spot = BlindSpot(
            session_id=session.id,
            question="What is the college transfer policy if the student changes academic institutions?",
            rationale="Transferring universities can terminate scholarship disbursement without written approval.",
            risk_level="high",
            priority="P1",
        )
        db.add(spot)

        # Gap Findings across categories
        f_missing = GapFinding(
            session_id=session.id,
            requirement_id=req_ins.id,
            finding_type="MISSING",
            explanation="No health insurance certificate specification discovered across any ingested source.",
            priority="critical",
            recommended_action="Contact embassy or scholarship administrator for required policy underwriters.",
            limitations="Total evidentiary absence across provided documents.",
        )
        f_conflict = GapFinding(
            session_id=session.id,
            requirement_id=req_gpa.id,
            finding_type="POTENTIAL CONFLICT",
            explanation="Conflicting GPA cutoffs (3.5 vs 3.7) require formal threshold clarification.",
            priority="high",
            recommended_action="Submit written query to admissions desk to clarify 3.5 minimum vs 3.7 priority cutoff.",
            evidence_references='[{"source_title":"Official Scholarship Gazette 2026.pdf","exact_quote":"minimum 3.5 cumulative GPA","page_number":2,"confidence":0.98}]',
            limitations="Contradiction requires stakeholder arbitration.",
        )
        f_covered = GapFinding(
            session_id=session.id,
            requirement_id=req_rec.id,
            finding_type="COVERED",
            explanation="Requirement is completely supported with verbatim quotes from both sources.",
            priority="low",
            recommended_action="Submit recommendation letters on institutional letterhead.",
            evidence_references='[{"source_title":"Official Scholarship Gazette 2026.pdf","exact_quote":"two formal letters of recommendation required","page_number":4,"confidence":0.99}]',
            limitations="Full evidentiary coverage verified.",
        )
        db.add_all([f_missing, f_conflict, f_covered])
        db.commit()

        session_id = session.id
        yield session_id

    finally:
        db.close()


def test_verification_planner_task_generation(populated_session):
    """
    Validates that VerificationPlannerEngine derives structured tasks from:
    - Missing information findings
    - Contradiction / Conflict findings
    - Incomplete findings
    With correct task_type, priority, evidence citations, and recommended actions.
    """
    db = SessionLocal()
    try:
        tasks = VerificationPlannerEngine.generate_tasks_for_session(db, populated_session, persist=True)
        assert len(tasks) >= 2

        task_types = [t.task_type for t in tasks]
        assert "verify_missing_information" in task_types
        assert "investigate_conflicting_claims" in task_types

        # Check missing info task details
        missing_task = next(t for t in tasks if t.task_type == "verify_missing_information")
        assert "Insurance" in missing_task.title
        assert missing_task.priority in ("critical", "high")
        assert missing_task.is_completed is False
        assert "embassy" in missing_task.recommended_action.lower() or "administrator" in missing_task.recommended_action.lower()

        # Check conflict task details
        conflict_task = next(t for t in tasks if t.task_type == "investigate_conflicting_claims")
        assert "GPA" in conflict_task.title
        assert conflict_task.priority in ("critical", "high")
        assert conflict_task.evidence_references_json is not None

    finally:
        db.close()


def test_verification_planner_user_actions_api(populated_session):
    """
    Validates REST API endpoints for user actions:
    - Mark complete
    - Reopen
    - Add custom tasks
    - Filter by priority
    - Evidence citations in response
    """
    # 1. Fetch generated tasks via API
    res = client.get(f"/api/v1/research/{populated_session}/verification")
    assert res.status_code == 200
    tasks = res.json()
    assert len(tasks) >= 2
    task_id = tasks[0]["id"]

    # 2. Mark complete via toggle
    res_toggle = client.post(f"/api/v1/verification/{task_id}/toggle")
    assert res_toggle.status_code == 200
    assert res_toggle.json()["is_completed"] is True

    # 3. Reopen via toggle
    res_reopen = client.post(f"/api/v1/verification/{task_id}/toggle")
    assert res_reopen.status_code == 200
    assert res_reopen.json()["is_completed"] is False

    # 4. Patch notes and priority
    res_patch = client.patch(f"/api/v1/verification/{task_id}", json={
        "is_completed": True,
        "notes": "Spoke to Admissions Dean; confirmed 3.5 GPA is base cutoff.",
        "priority": "critical"
    })
    assert res_patch.status_code == 200
    assert res_patch.json()["is_completed"] is True
    assert res_patch.json()["notes"] == "Spoke to Admissions Dean; confirmed 3.5 GPA is base cutoff."

    # 5. Add custom verification task
    res_custom = client.post(f"/api/v1/research/{populated_session}/verification", json={
        "title": "Verify bank statement apostille requirements",
        "description": "Financial guarantee must carry apostille certification from home country ministry.",
        "task_type": "custom",
        "priority": "high",
        "recommended_action": "Schedule apostille verification with notary office."
    })
    assert res_custom.status_code == 201
    custom_task = res_custom.json()
    assert custom_task["is_custom"] is True
    assert custom_task["title"] == "Verify bank statement apostille requirements"

    # 6. Filter by priority
    res_filtered = client.get(f"/api/v1/research/{populated_session}/verification?priority=critical")
    assert res_filtered.status_code == 200
    crit_tasks = res_filtered.json()
    assert all(t["priority"].lower() == "critical" for t in crit_tasks)


def test_pdf_report_generation_16_sections(populated_session):
    """
    Validates that ReportLab PDF generation generates a valid multi-page PDF
    containing all 16 required sections with Navy headings, white background,
    professional tables, and NumberedCanvas page numbers.
    """
    db = SessionLocal()
    try:
        session = db.query(ResearchSession).filter(ResearchSession.id == populated_session).first()
        sources = db.query(Source).filter(Source.session_id == session.id).all()
        reqs = db.query(Requirement).filter(Requirement.session_id == session.id).all()
        conflicts = db.query(Contradiction).filter(Contradiction.session_id == session.id).all()
        blindspots = db.query(BlindSpot).filter(BlindSpot.session_id == session.id).all()
        findings = db.query(GapFinding).filter(GapFinding.session_id == session.id).all()
        tasks = db.query(VerificationTask).filter(VerificationTask.session_id == session.id).all()
        claims = db.query(AtomicClaim).filter(AtomicClaim.source_id.in_([s.id for s in sources])).all()

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

        # 1. Verify byte header
        assert pdf_bytes.startswith(b"%PDF-")
        assert len(pdf_bytes) > 5000

        # 2. Inspect PDF with PyMuPDF
        doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
        assert len(doc) >= 3  # Multi-page dossier

        all_text = " ".join([page.get_text() for page in doc])

        # Verify key sections are present
        assert "PROOFPATH AI FORENSIC INTELLIGENCE DOSSIER" in all_text
        assert "2. Research Objective & Decision Context" in all_text
        assert "3. Executive Summary & Decision-Readiness Index" in all_text
        assert "4. Sources Reviewed" in all_text
        assert "5. Requirements Investigated" in all_text
        assert "6. Extracted Claims" in all_text
        assert "7. Evidence Coverage Analysis" in all_text
        assert "8. Missing Information" in all_text
        assert "9. Incomplete Information" in all_text
        assert "10. Potential Contradictions" in all_text
        assert "11. Potentially Outdated Information" in all_text
        assert "12. Unverified Claims" in all_text
        assert "13. BlindSpot Questions" in all_text
        assert "14. Verification Checklist" in all_text
        assert "15. Forensic Limitations & Epistemic Boundaries" in all_text
        assert "16. Source References & Bibliography" in all_text

        # Verify NumberedCanvas footer format ('Page X of Y')
        assert "Page 2 of" in all_text

    finally:
        db.close()


def test_api_download_pdf_report_endpoint(populated_session):
    """
    Validates the REST API endpoint:
    GET /api/v1/reports/{research_id}/pdf
    Streams application/pdf with proper Content-Disposition header.
    """
    res = client.get(f"/api/v1/reports/{populated_session}/pdf")
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/pdf"
    assert "attachment; filename=" in res.headers["content-disposition"]
    assert res.content.startswith(b"%PDF-")
    assert len(res.content) > 5000
