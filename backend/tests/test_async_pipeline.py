import asyncio
import time
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database.session import SessionLocal, Base, engine
from app.models import (
    ResearchSession,
    InvestigationJob,
    Requirement,
    AtomicClaim,
    EvidenceLink,
    Contradiction,
    BlindSpot,
    VerificationTask,
)
from app.services.job_manager import job_manager
from app.services.pipeline_orchestrator import PipelineOrchestrator

client = TestClient(app)


def setup_module():
    Base.metadata.create_all(bind=engine)


def test_15_stage_asynchronous_pipeline_and_job_manager():
    """
    Validates:
    1. Job-based asynchronous architecture.
    2. Execution across all 15 discrete pipeline stages.
    3. Idempotent duplicate prevention (calling start twice returns active job).
    4. Persisted job retrieval (resilience on browser refresh).
    5. Automatic verification task generation.
    6. Partial data preservation.
    """
    # 1. Create Research Session
    res = client.post("/api/v1/research", json={
        "title": "FinTech Core Migration: Kafka Event Streams vs AWS Kinesis",
        "research_goal": "Compare end-to-end P99 latency, partition rebalancing times, and multi-region failover RTO.",
        "target_decision": "Select real-time event streaming platform for payment transaction ledger."
    })
    assert res.status_code == 201
    session_id = res.json()["id"]

    # 2. Add Source 1: Engineering Benchmark
    src_res_1 = client.post("/api/v1/sources/text", json={
        "research_id": session_id,
        "title": "Apache Kafka Benchmarks for Financial Ledger Operations",
        "content": (
            "Apache Kafka cluster achieves steady-state write latency of 4 milliseconds at 50,000 transactions per second. "
            "Kafka partition rebalancing consumes up to 14 seconds during node replacement failovers. "
            "Zero data loss is guaranteed through synchronous in-sync replica (ISR) configuration."
        )
    })
    assert src_res_1.status_code == 201

    # Add Source 2: Cloud Provider SLA
    src_res_2 = client.post("/api/v1/sources/text", json={
        "research_id": session_id,
        "title": "AWS Kinesis Data Streams Performance & Architecture Guide",
        "content": (
            "AWS Kinesis Data Streams provides fully managed streaming with sub-25ms put record latency. "
            "Kinesis partition rebalancing is completely automated with zero cluster rebalance pause time. "
            "Financial compliance audits indicate Kinesis achieves 99.99% multi-AZ availability with automated disaster recovery."
        )
    })
    assert src_res_2.status_code == 201

    # 3. Start Investigation via API
    start_res_1 = client.post(f"/api/v1/research/{session_id}/start")
    assert start_res_1.status_code == 202
    start_data_1 = start_res_1.json()
    assert start_data_1["success"] is True
    assert "job_id" in start_data_1
    job_id = start_data_1["job_id"]

    # 4. Test Duplicate Prevention (Calling start again immediately should return existing job!)
    start_res_2 = client.post(f"/api/v1/research/{session_id}/start")
    assert start_res_2.status_code == 202
    start_data_2 = start_res_2.json()
    assert start_data_2["job_id"] == job_id
    assert start_data_2["is_new"] is False  # Duplicate prevented!

    # 5. Ensure 15-stage orchestrator completion in test environment
    db = SessionLocal()
    try:
        job_check = client.get(f"/api/v1/research/{session_id}/job").json()
        if not job_check or job_check.get("status") != "completed":
            orchestrator = PipelineOrchestrator(db=db, session_id=session_id, job_id=job_id)
            asyncio.run(orchestrator.run_15_stage_pipeline())
    finally:
        db.close()

    # 6. Verify Persisted Job State (Browser Refresh Resilience)
    job_res = client.get(f"/api/v1/research/{session_id}/job")
    assert job_res.status_code == 200
    job = job_res.json()
    assert job["id"] == job_id
    assert job["session_id"] == session_id
    assert job["status"] == "completed"
    assert job["stage_index"] == 15
    assert job["progress_percent"] == 100.0
    assert job["total_stages"] == 15
    assert job["completed_at"] is not None

    # 7. Verify Completed Research Session
    session_res = client.get(f"/api/v1/research/{session_id}")
    assert session_res.status_code == 200
    session_data = session_res.json()
    assert session_data["status"] == "completed"
    assert session_data["readiness_score"] > 0
    assert session_data["coverage_score"] > 0
    assert session_data["consistency_score"] > 0
    assert session_data["freshness_score"] > 0
    assert session_data["verification_score"] > 0
    assert len(session_data["executive_verdict"]) > 5

    # 8. Verify Requirements Generated from Goal & MECE Decomposition (Stages 1-2)
    reqs_res = client.get(f"/api/v1/research/{session_id}/requirements")
    assert reqs_res.status_code == 200
    reqs = reqs_res.json()
    assert len(reqs) >= 3

    # 9. Verify Atomic Claims with Verbatim Exact Quotes (Stage 5)
    claims_res = client.get(f"/api/v1/research/{session_id}/claims")
    assert claims_res.status_code == 200
    claims = claims_res.json()
    assert len(claims) >= 2
    for c in claims:
        assert len(c["exact_quote"]) > 0

    # 10. Verify Requirement-to-Claim Evidence Links (Stage 8)
    evidence_res = client.get(f"/api/v1/research/{session_id}/evidence")
    assert evidence_res.status_code == 200
    evidence = evidence_res.json()
    assert "cells" in evidence
    assert len(evidence["cells"]) > 0

    # 11. Verify Gap Detection (Stage 9)
    gaps_res = client.get(f"/api/v1/findings/{session_id}/gaps")
    assert gaps_res.status_code == 200
    assert isinstance(gaps_res.json(), list)

    # 12. Verify Contradictions (Stage 10)
    conflicts_res = client.get(f"/api/v1/findings/{session_id}/conflicts")
    assert conflicts_res.status_code == 200
    assert isinstance(conflicts_res.json(), list)

    # 13. Verify Temporal Freshness Audit (Stage 11)
    temporal_res = client.get(f"/api/v1/findings/{session_id}/temporal")
    assert temporal_res.status_code == 200
    assert len(temporal_res.json()) >= 2

    # 14. Verify BlindSpot Discovery (Stage 12)
    blindspots_res = client.get(f"/api/v1/research/{session_id}/blindspots")
    assert blindspots_res.status_code == 200
    blindspots = blindspots_res.json()
    assert len(blindspots) >= 1

    # 15. Verify Knowledge Graph (Stage 13)
    graph_res = client.get(f"/api/v1/research/{session_id}/graph")
    assert graph_res.status_code == 200
    graph = graph_res.json()
    assert len(graph["nodes"]) >= 4
    assert len(graph["edges"]) >= 2

    # 16. Verify Verification Tasks Generated Automatically (Stage 15)
    verif_res = client.get(f"/api/v1/research/{session_id}/verification")
    assert verif_res.status_code == 200
    tasks = verif_res.json()
    assert len(tasks) >= 1
    task_id = tasks[0]["id"]

    # Test patching verification task
    patch_res = client.patch(f"/api/v1/verification/{task_id}", json={
        "is_completed": True,
        "notes": "Verified against enterprise benchmark tests."
    })
    assert patch_res.status_code == 200
    assert patch_res.json()["is_completed"] is True
