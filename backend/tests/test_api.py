from fastapi.testclient import TestClient
from app.main import app
from app.database.session import SessionLocal, engine, Base
from app.utils.mock_data import seed_demo_investigation
from app.models import ResearchSession

client = TestClient(app)


def setup_module():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    if db.query(ResearchSession).count() == 0:
        seed_demo_investigation(db)
    db.close()


def test_health_check():
    res1 = client.get("/health")
    assert res1.status_code == 200
    assert res1.json()["status"] == "healthy"

    res2 = client.get("/api/v1/health")
    assert res2.status_code == 200
    assert res2.json()["status"] == "healthy"


def test_research_endpoints():
    # List
    list_res = client.get("/api/v1/research")
    assert list_res.status_code == 200
    sessions = list_res.json()
    assert len(sessions) >= 1
    session_id = sessions[0]["id"]

    # Get Single
    get_res = client.get(f"/api/v1/research/{session_id}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == session_id

    # Create New
    create_res = client.post("/api/v1/research", json={
        "title": "Automated Test Session",
        "research_goal": "Verify all 9 routers in the test suite.",
        "target_decision": "Test verification"
    })
    assert create_res.status_code == 201
    new_id = create_res.json()["id"]

    # Delete New
    del_res = client.delete(f"/api/v1/research/{new_id}")
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True


def test_sources_endpoints():
    res = client.get("/api/v1/research")
    session = next((s for s in res.json() if s.get("source_count", 0) > 0), res.json()[0])
    session_id = session["id"]

    # Get Sources for Session
    sources_res = client.get(f"/api/v1/research/{session_id}/sources")
    assert sources_res.status_code == 200
    sources = sources_res.json()
    assert len(sources) >= 1

    source_id = sources[0]["id"]
    detail_res = client.get(f"/api/v1/sources/{source_id}")
    assert detail_res.status_code == 200
    assert detail_res.json()["id"] == source_id

    # Test Text Source Ingestion
    text_res = client.post("/api/v1/sources/text", json={
        "research_id": session_id,
        "title": "Architectural Design Memorandum",
        "content": "This memorandum outlines Kubernetes autoscaling benchmarks with 45ms P99 latency."
    })
    assert text_res.status_code == 201
    assert text_res.json()["source_type"] == "text"


def test_requirements_endpoints():
    res = client.get("/api/v1/research")
    session_id = res.json()[0]["id"]

    # List Requirements
    reqs_res = client.get(f"/api/v1/research/{session_id}/requirements")
    assert reqs_res.status_code == 200
    reqs = reqs_res.json()
    assert len(reqs) >= 1
    req_id = reqs[0]["id"]

    # Patch Requirement
    patch_res = client.patch(f"/api/v1/requirements/{req_id}", json={
        "weight": 3.0
    })
    assert patch_res.status_code == 200
    assert patch_res.json()["weight"] == 3.0


def test_claims_endpoints():
    res = client.get("/api/v1/research")
    session = next((s for s in res.json() if s.get("source_count", 0) > 0), res.json()[0])
    session_id = session["id"]

    claims_res = client.get(f"/api/v1/research/{session_id}/claims")
    assert claims_res.status_code == 200
    claims = claims_res.json()
    assert len(claims) >= 1
    claim_id = claims[0]["id"]

    single_claim = client.get(f"/api/v1/claims/{claim_id}")
    assert single_claim.status_code == 200
    assert single_claim.json()["id"] == claim_id


def test_findings_endpoints():
    res = client.get("/api/v1/research")
    session_id = res.json()[0]["id"]

    findings_res = client.get(f"/api/v1/research/{session_id}/findings")
    assert findings_res.status_code == 200
    findings = findings_res.json()
    assert "contradictions" in findings
    assert "information_gaps" in findings
    assert "temporal_audit" in findings

    # Test sub-endpoints
    conflicts_res = client.get(f"/api/v1/findings/{session_id}/conflicts")
    assert conflicts_res.status_code == 200
    assert isinstance(conflicts_res.json(), list)

    gaps_res = client.get(f"/api/v1/findings/{session_id}/gaps")
    assert gaps_res.status_code == 200
    assert isinstance(gaps_res.json(), list)

    temporal_res = client.get(f"/api/v1/findings/{session_id}/temporal")
    assert temporal_res.status_code == 200
    assert isinstance(temporal_res.json(), list)


def test_evidence_and_graph_endpoints():
    res = client.get("/api/v1/research")
    session_id = res.json()[0]["id"]

    # Matrix Evidence
    evidence_res = client.get(f"/api/v1/research/{session_id}/evidence")
    assert evidence_res.status_code == 200
    assert "cells" in evidence_res.json()

    # React Flow Graph
    graph_res = client.get(f"/api/v1/research/{session_id}/graph")
    assert graph_res.status_code == 200
    assert "nodes" in graph_res.json()
    assert "edges" in graph_res.json()


def test_blindspots_endpoints():
    res = client.get("/api/v1/research")
    session = next((s for s in res.json() if s.get("conflict_count", 0) > 0 or s.get("source_count", 0) > 0), res.json()[0])
    session_id = session["id"]

    blindspots_res = client.get(f"/api/v1/research/{session_id}/blindspots")
    assert blindspots_res.status_code == 200
    spots = blindspots_res.json()
    assert len(spots) >= 1
    spot_id = spots[0]["id"]

    # Investigate / Toggle
    toggle_res = client.post(f"/api/v1/blindspots/{spot_id}/investigate")
    assert toggle_res.status_code == 200
    assert "is_resolved" in toggle_res.json()


def test_verification_endpoints():
    res = client.get("/api/v1/research")
    session = next((s for s in res.json() if s.get("conflict_count", 0) > 0 or s.get("source_count", 0) > 0), res.json()[0])
    session_id = session["id"]

    verif_res = client.get(f"/api/v1/research/{session_id}/verification")
    assert verif_res.status_code == 200
    tasks = verif_res.json()
    assert len(tasks) >= 1
    task_id = tasks[0]["id"]

    # Patch task
    patch_res = client.patch(f"/api/v1/verification/{task_id}", json={
        "is_completed": True,
        "notes": "Verified by senior architect."
    })
    assert patch_res.status_code == 200
    assert patch_res.json()["is_completed"] is True


def test_reports_endpoints():
    res = client.get("/api/v1/research")
    session_id = res.json()[0]["id"]

    # Generate Report
    gen_res = client.post(f"/api/v1/research/{session_id}/report", json={
        "title": "Executive Briefing Test",
        "format": "markdown"
    })
    assert gen_res.status_code == 201
    report = gen_res.json()
    report_id = report["id"]

    # Download Report
    download_res = client.get(f"/api/v1/reports/{report_id}/download")
    assert download_res.status_code == 200
    assert "PROOFPATH AI — FORENSIC INVESTIGATION REPORT" in download_res.text

    # Direct Markdown Dossier
    md_res = client.get(f"/api/v1/reports/{session_id}/markdown")
    assert md_res.status_code == 200
    assert "PROOFPATH AI — FORENSIC INVESTIGATION REPORT" in md_res.text

    # Direct PDF Dossier
    pdf_res = client.get(f"/api/v1/reports/{session_id}/pdf")
    assert pdf_res.status_code == 200
    assert pdf_res.headers["content-type"] == "application/pdf"
    assert len(pdf_res.content) > 1000
