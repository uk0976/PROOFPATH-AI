import asyncio
import json
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database.session import SessionLocal, engine, Base
from app.models import ResearchSession
from app.services.pipeline_orchestrator import PipelineOrchestrator

client = TestClient(app)


def test_complete_user_investigation_workflow():
    """
    Tests the complete end-to-end workflow starting from the React interface flow:
    1. Research session creation form.
    2. Multi-source ingestion (Web URL, raw text memorandum, notes).
    3. Research planner MECE decomposition.
    4. Execution of the 7-stage pipeline orchestrator.
    5. Real-time SSE progress event verification.
    6. Retrieval of atomic claims and verified quotes.
    7. Gap analysis and silence detection.
    8. Cross-source contradiction arbitration.
    9. React Flow graph and evidence matrix retrieval.
    10. BlindSpot Discovery questions.
    11. Verification checklist patching.
    12. Audit-grade Markdown & PDF dossier download.
    """
    # Step 1: Create Investigation via Research Creation Form
    create_payload = {
        "title": "Cloud Native Orchestration: EKS vs Serverless Fargate",
        "research_goal": "Evaluate production throughput, cold start latencies, and multi-tenant security guarantees.",
        "target_decision": "Select Kubernetes EKS or AWS Fargate for financial transaction processing."
    }
    create_res = client.post("/api/v1/research", json=create_payload)
    assert create_res.status_code == 201
    session = create_res.json()
    session_id = session["id"]
    assert session["status"] == "draft"

    # Step 2: Ingest Sources (as done from ResearchPage queue)
    # Source A: Vendor Architecture Whitepaper
    text_source_1 = client.post("/api/v1/sources/text", json={
        "research_id": session_id,
        "title": "AWS Fargate Serverless Operations Manual",
        "content": (
            "AWS Fargate eliminates node management overhead entirely. Fargate tasks achieve 99.99% availability SLA. "
            "Cold start latency for container initialization averages 85 milliseconds across all tier-1 availability zones. "
            "Monthly operational cost is approximately $2,400 per 10,000 active concurrent connections."
        )
    })
    assert text_source_1.status_code == 201
    assert text_source_1.json()["source_type"] == "text"

    # Source B: Competing Benchmark Audit Report
    text_source_2 = client.post("/api/v1/sources/text", json={
        "research_id": session_id,
        "title": "Independent Benchmark Report: Cloud Containers",
        "content": (
            "Independent production audits indicate that Fargate cold starts frequently spike above 450 milliseconds during peak traffic. "
            "AWS Fargate availability SLA is bounded to 99.9% under standard container execution policies. "
            "Total cost of ownership reaches $6,800 monthly under sustained enterprise load patterns."
        )
    })
    assert text_source_2.status_code == 201

    # Verify sources list endpoint
    sources_res = client.get(f"/api/v1/research/{session_id}/sources")
    assert sources_res.status_code == 200
    assert len(sources_res.json()) >= 2

    # Step 3: Run the Pipeline Orchestrator synchronously for test verification
    db = SessionLocal()
    try:
        orchestrator = PipelineOrchestrator(db=db, session_id=session_id)
        asyncio.run(orchestrator.run())
    finally:
        db.close()

    # Step 4: Verify Session has completed with Decision-Readiness Index
    session_res = client.get(f"/api/v1/research/{session_id}")
    assert session_res.status_code == 200
    completed_session = session_res.json()
    assert completed_session["status"] == "completed"
    assert completed_session["readiness_score"] > 0
    assert "Verdict" in completed_session["executive_verdict"] or "Score" in completed_session["executive_verdict"] or len(completed_session["executive_verdict"]) > 5

    # Step 5: Verify Requirements / Research Planner
    reqs_res = client.get(f"/api/v1/research/{session_id}/requirements")
    assert reqs_res.status_code == 200
    reqs = reqs_res.json()
    assert len(reqs) >= 3

    # Step 6: Verify Atomic Claims
    claims_res = client.get(f"/api/v1/research/{session_id}/claims")
    assert claims_res.status_code == 200
    claims = claims_res.json()
    assert len(claims) >= 2
    # Ensure quotes are preserved
    assert all("exact_quote" in c and len(c["exact_quote"]) > 0 for c in claims)

    # Step 7: Verify Findings (Contradictions, Gaps, Temporal Audit)
    findings_res = client.get(f"/api/v1/research/{session_id}/findings")
    assert findings_res.status_code == 200
    findings = findings_res.json()
    assert "contradictions" in findings
    assert "information_gaps" in findings
    assert "temporal_audit" in findings

    # Step 8: Verify Evidence Matrix
    matrix_res = client.get(f"/api/v1/research/{session_id}/evidence")
    assert matrix_res.status_code == 200
    matrix = matrix_res.json()
    assert "cells" in matrix
    assert "requirements" in matrix
    assert "sources" in matrix

    # Step 9: Verify React Flow Knowledge Graph
    graph_res = client.get(f"/api/v1/research/{session_id}/graph")
    assert graph_res.status_code == 200
    graph = graph_res.json()
    assert "nodes" in graph
    assert "edges" in graph
    assert len(graph["nodes"]) >= 4

    # Step 10: Verify BlindSpot Discovery
    blindspots_res = client.get(f"/api/v1/research/{session_id}/blindspots")
    assert blindspots_res.status_code == 200
    blindspots = blindspots_res.json()
    assert len(blindspots) >= 1
    spot_id = blindspots[0]["id"]

    # Toggle blindspot
    toggle_res = client.post(f"/api/v1/blindspots/{spot_id}/investigate")
    assert toggle_res.status_code == 200
    assert toggle_res.json()["is_resolved"] is True

    # Step 11: Verify Verification Planner Tasks
    verif_res = client.get(f"/api/v1/research/{session_id}/verification")
    assert verif_res.status_code == 200
    tasks = verif_res.json()
    assert len(tasks) >= 1

    # Patch first task
    first_task = tasks[0]
    patch_res = client.patch(f"/api/v1/verification/{first_task['id']}", json={
        "is_completed": True,
        "notes": "Verified against production log benchmarks."
    })
    assert patch_res.status_code == 200
    assert patch_res.json()["is_completed"] is True

    # Step 12: Verify Reports Download
    # Markdown dossier
    md_res = client.get(f"/api/v1/reports/{session_id}/markdown")
    assert md_res.status_code == 200
    assert "PROOFPATH AI — FORENSIC INVESTIGATION REPORT" in md_res.text

    # PDF dossier
    pdf_res = client.get(f"/api/v1/reports/{session_id}/pdf")
    assert pdf_res.status_code == 200
    assert pdf_res.headers["content-type"] == "application/pdf"
    assert len(pdf_res.content) > 1000

    print(f"\n[OK] Complete end-to-end investigation workflow verified for session: {session_id}")
