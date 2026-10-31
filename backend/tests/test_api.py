from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["app"] == "PROOFPATH AI"


def test_list_sessions():
    response = client.get("/api/v1/research/")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    session = data[0]
    assert "readiness_score" in session
    assert session["title"] == "Serverless vs Kubernetes (EKS) Migration Audit"


def test_get_findings():
    # Fetch first session ID
    res = client.get("/api/v1/research/")
    session_id = res.json()[0]["id"]

    # Test conflicts
    conf_res = client.get(f"/api/v1/findings/{session_id}/conflicts")
    assert conf_res.status_code == 200
    conflicts = conf_res.json()
    assert len(conflicts) >= 2
    assert conflicts[0]["severity"] in ["high", "medium", "low"]
    assert "exact_quote" in conflicts[0]["claim_a"]

    # Test graph
    graph_res = client.get(f"/api/v1/evidence/{session_id}/graph")
    assert graph_res.status_code == 200
    graph = graph_res.json()
    assert len(graph["nodes"]) > 0
    assert len(graph["edges"]) > 0
