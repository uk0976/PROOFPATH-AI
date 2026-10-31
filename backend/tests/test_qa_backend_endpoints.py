import io
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database.session import SessionLocal
from app.models import (
    ResearchSession,
    Source,
    Requirement,
    AtomicClaim,
    GapFinding,
    Contradiction,
    BlindSpot,
    VerificationTask,
)

client = TestClient(app)


class TestBackendEndpointsAndDatabaseCascades:
    """Comprehensive test suite verifying every major API router and SQLAlchemy cascade integrity."""

    def test_health_endpoints(self):
        """Verify root, health, and v1 health endpoints return valid 200 payload."""
        r1 = client.get("/health")
        assert r1.status_code == 200
        assert r1.json()["status"] == "healthy"

        r2 = client.get("/api/v1/health")
        assert r2.status_code == 200
        assert r2.json()["database"] == "connected"

        r3 = client.get("/")
        assert r3.status_code == 200
        assert "proofpath" in r3.json()["app"].lower()

    def test_demo_endpoints_lifecycle(self):
        """Verify demo status, session retrieval, reset, and load operations."""
        status_res = client.get("/api/v1/demo/status")
        assert status_res.status_code == 200

        session_res = client.get("/api/v1/demo/session")
        assert session_res.status_code == 200
        assert "Federal STEM Postgraduate" in session_res.json()["title"]

        # Reset demo
        reset_res = client.post("/api/v1/demo/reset")
        assert reset_res.status_code == 200
        assert "reset" in reset_res.json()["status"]

    def test_research_session_crud_and_cascade_lifecycle(self):
        """Verify full lifecycle: create session -> add requirement -> add source -> delete session with clean cascades."""
        # 1. Create Session
        create_res = client.post(
            "/api/v1/research",
            json={
                "title": "Cascade Verification Investigation",
                "research_goal": "Validate database integrity and relational cleanup across all child entities.",
                "target_decision": "Authorize schema validation",
            },
        )
        assert create_res.status_code == 201
        session_data = create_res.json()
        sid = session_data["id"]

        # 2. Add custom requirement
        req_res = client.post(
            f"/api/v1/research/{sid}/requirements",
            json={
                "requirement_text": "Verify ISO 27001 data residency compliance.",
                "category": "Compliance",
                "importance": "critical",
                "priority": "P0",
                "is_decision_critical": True,
            },
        )
        assert req_res.status_code in [200, 201]
        req_id = req_res.json()["id"]

        # 3. Add text memorandum source
        source_res = client.post(
            "/api/v1/sources/text",
            json={
                "research_id": sid,
                "title": "Data Residency Memorandum",
                "content": "All customer data must reside within the EU Central region under GDPR Article 28.",
            },
        )
        assert source_res.status_code in [200, 201]
        source_id = source_res.json()["id"]

        # 4. Add verification task
        task_res = client.post(
            f"/api/v1/research/{sid}/verification",
            json={
                "title": "Audit EU Central data residency proofs",
                "priority": "critical",
                "recommended_action": "Request SOC2 Type II report.",
            },
        )
        assert task_res.status_code in [200, 201]
        task_id = task_res.json()["id"]

        # 5. Toggle verification task
        toggle_res = client.post(f"/api/v1/verification/{task_id}/toggle")
        assert toggle_res.status_code == 200
        assert toggle_res.json()["is_completed"] is True

        # 6. Verify records exist in database
        db = SessionLocal()
        try:
            assert db.query(ResearchSession).filter(ResearchSession.id == sid).first() is not None
            assert db.query(Requirement).filter(Requirement.id == req_id).first() is not None
            assert db.query(Source).filter(Source.id == source_id).first() is not None
            assert db.query(VerificationTask).filter(VerificationTask.id == task_id).first() is not None
        finally:
            db.close()

        # 7. Delete research session
        del_res = client.delete(f"/api/v1/research/{sid}")
        assert del_res.status_code == 200

        # 8. Verify CASCADE cleanup in database (Zero orphans)
        db2 = SessionLocal()
        try:
            assert db2.query(ResearchSession).filter(ResearchSession.id == sid).first() is None
            assert db2.query(Requirement).filter(Requirement.id == req_id).first() is None
            assert db2.query(Source).filter(Source.id == source_id).first() is None
            assert db2.query(VerificationTask).filter(VerificationTask.id == task_id).first() is None
        finally:
            db2.close()

    def test_blindspot_actions_and_planning_integration(self):
        """Verify discovering blindspots, toggling star, dismissing, and adding to research plan."""
        # 1. Create temporary session
        res = client.post(
            "/api/v1/research",
            json={
                "title": "BlindSpot Lifecycle Test",
                "research_goal": "Investigate healthcare eligibility rules.",
            },
        )
        sid = res.json()["id"]

        try:
            # 2. Add text source
            client.post(
                "/api/v1/sources/text",
                json={
                    "research_id": sid,
                    "title": "State Health Policy 2026",
                    "content": "Applicants must demonstrate continuous residency of 24 months and annual income under $40,000.",
                },
            )

            # 3. Discover blindspots
            spot_res = client.post(f"/api/v1/research/{sid}/discover-blindspots")
            assert spot_res.status_code in [200, 201]
            blindspots = spot_res.json()
            assert len(blindspots) > 0
            b_id = blindspots[0]["id"]

            # 4. Toggle star on blindspot
            star_res = client.post(f"/api/v1/blindspots/{b_id}/toggle-star")
            assert star_res.status_code == 200
            assert star_res.json()["status"] is True
            assert star_res.json()["blindspot"]["is_starred"] is True

            # 5. Add blindspot to plan
            add_res = client.post(f"/api/v1/blindspots/{b_id}/add-to-plan")
            assert add_res.status_code == 200
            assert add_res.json()["status"] is True
            assert add_res.json()["blindspot"]["is_added_to_plan"] is True

            # 6. Verify newly added requirement in research plan
            plan_res = client.get(f"/api/v1/research/{sid}/requirements")
            assert plan_res.status_code == 200
            req_texts = [r["requirement_text"] for r in plan_res.json()]
            assert any(blindspots[0]["question"] in t for t in req_texts)

        finally:
            client.delete(f"/api/v1/research/{sid}")

    def test_pdf_report_and_markdown_downloads(self):
        """Verify downloading PDF report and markdown from a real populated session."""
        # Test against seeded demo session
        res_md = client.get("/api/v1/reports/demo-scholarship-investigation/markdown")
        assert res_md.status_code == 200
        assert "PROOFPATH AI" in res_md.text

        res_pdf = client.get("/api/v1/reports/demo-scholarship-investigation/pdf")
        assert res_pdf.status_code == 200
        assert res_pdf.headers["content-type"] == "application/pdf"
        assert res_pdf.content.startswith(b"%PDF-")
        assert len(res_pdf.content) > 1000
