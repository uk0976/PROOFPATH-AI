import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database.session import get_db, SessionLocal
from app.utils.mock_data import DEMO_SESSION_ID

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_demo_session():
    client.post("/api/v1/demo/reset")
    yield


def test_demo_load_endpoint():
    response = client.post("/api/v1/demo/load")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ready"
    assert data["session_id"] == DEMO_SESSION_ID
    assert data["is_sample_data"] is True
    assert "[SAMPLE DATA]" in data["session"]["title"]
    assert data["session"]["source_count"] == 3
    assert data["session"]["requirement_count"] == 5
    assert data["session"]["conflict_count"] == 1
    assert data["session"]["blindspot_count"] == 3


def test_demo_session_endpoint():
    response = client.get("/api/v1/demo/session")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == DEMO_SESSION_ID
    assert "[SAMPLE DATA]" in data["title"]
    assert "Federal STEM Postgraduate Scholarship" in data["research_goal"]
    assert data["readiness_score"] > 70.0


def test_demo_status_endpoint():
    response = client.get("/api/v1/demo/status")
    assert response.status_code == 200
    data = response.json()
    assert data["mode"] == "demo"
    assert data["offline_ready"] is True
    assert data["api_key_required"] is False
    assert data["sample_markings_enforced"] is True


def test_demo_sources_endpoint():
    response = client.get(f"/api/v1/research/{DEMO_SESSION_ID}/sources")
    assert response.status_code == 200
    sources = response.json()
    assert len(sources) == 3
    titles = [s["title"] for s in sources]
    assert any("Guidelines (PDF)" in t for t in titles)
    assert any("Handbook 2026 (URL)" in t for t in titles)
    assert any("Superseded Text" in t for t in titles)
    for s in sources:
        assert "[SAMPLE DATA]" in s["title"]


def test_demo_requirements_endpoint():
    response = client.get(f"/api/v1/research/{DEMO_SESSION_ID}/requirements")
    assert response.status_code == 200
    reqs = response.json()
    assert len(reqs) == 5
    for r in reqs:
        assert "[SAMPLE DATA]" in r["requirement_text"]

    statuses = {r["status"] for r in reqs}
    assert "conflict" in statuses
    assert "covered" in statuses
    assert "uncovered" in statuses


def test_demo_findings_and_contradiction():
    response = client.get(f"/api/v1/research/{DEMO_SESSION_ID}/findings")
    assert response.status_code == 200
    data = response.json()
    assert data["total_conflicts"] >= 1
    assert data["counts_by_type"]["MISSING"] >= 1
    assert data["counts_by_type"]["POTENTIAL CONFLICT"] >= 1
    assert data["counts_by_type"]["POTENTIALLY OUTDATED"] >= 1

    conflicts = data["contradictions"]
    assert len(conflicts) >= 1
    conflict = conflicts[0]
    assert "3.5" in str(conflict) and "3.7" in str(conflict)


def test_demo_blindspots_endpoint():
    response = client.get(f"/api/v1/research/{DEMO_SESSION_ID}/blindspots")
    assert response.status_code == 200
    spots = response.json()
    assert len(spots) == 3
    for s in spots:
        assert "[SAMPLE DATA]" in s["question"]


def test_demo_verification_tasks():
    response = client.get(f"/api/v1/research/{DEMO_SESSION_ID}/verification")
    assert response.status_code == 200
    tasks = response.json()
    assert len(tasks) == 5
    for t in tasks:
        assert "[SAMPLE DATA]" in t["title"]


def test_demo_evidence_graph():
    response = client.get(f"/api/v1/research/{DEMO_SESSION_ID}/graph")
    assert response.status_code == 200
    graph = response.json()
    assert len(graph["nodes"]) > 0
    assert len(graph["edges"]) > 0


def test_demo_pdf_report_download():
    response = client.get(f"/api/v1/reports/{DEMO_SESSION_ID}/pdf")
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.content[:4] == b"%PDF"


def test_demo_reset_endpoint():
    response = client.post("/api/v1/demo/reset")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "reset_successful"
    assert data["session_id"] == DEMO_SESSION_ID
