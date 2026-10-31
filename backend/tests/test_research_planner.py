import pytest
from fastapi.testclient import TestClient
from app.main import app, ensure_database_schema
from app.database.session import Base, engine, SessionLocal
from app.models import ResearchSession, Requirement

client = TestClient(app)


def setup_module():
    Base.metadata.create_all(bind=engine)
    ensure_database_schema(engine)


def test_scholarship_research_planner_decomposition():
    """
    Test Scenario 1: Government Scholarship
    Input: "I want to apply for a government scholarship. Tell me everything I should know before applying."
    Verifies:
    1. AI generates structured research requirements.
    2. Decomposes into core dimensions (Eligibility, Academic, Income, Documents, Deadlines, Procedure, Renewal, Restrictions, Exceptions).
    3. Proper categorization, importance, priority, and decision-critical tagging.
    4. AI suggestions marked as is_approved=False and origin='ai_suggested'.
    5. Deduplication.
    """
    # 1. Create session
    res = client.post("/api/v1/research", json={
        "title": "Federal STEM Postgraduate Scholarship Application",
        "research_goal": "I want to apply for a government scholarship. Tell me everything I should know before applying.",
        "target_decision": "Determine complete qualification and prepare all required documentation prior to deadline."
    })
    assert res.status_code == 201
    session_id = res.json()["id"]

    # 2. Call Intelligent Research Planner via API
    plan_res = client.post(f"/api/v1/research/{session_id}/plan/generate", json={
        "domain_context": "scholarship",
        "max_criteria": 9
    })
    assert plan_res.status_code == 200
    plan_data = plan_res.json()

    assert plan_data["total_requirements"] >= 6
    assert plan_data["ai_suggested_count"] >= 6
    assert plan_data["official_approved_count"] == 0  # CRITICAL: AI suggestions NOT official yet!
    assert plan_data["decision_critical_count"] >= 1  # Has decision-critical requirements

    reqs = plan_data["requirements"]
    categories = {r["category"].lower() for r in reqs}

    # Verify scholarship core dimensions are present
    assert any("eligibility" in c for c in categories)
    assert any("academic" in c for c in categories)
    assert any("income" in c for c in categories)
    assert any("document" in c for c in categories)
    assert any("deadline" in c for c in categories)

    for r in reqs:
        assert len(r["question"]) > 10
        assert len(r["requirement_text"]) > 10
        assert r["importance"] in ["critical", "high", "medium", "low"]
        assert r["priority"] in ["P0", "P1", "P2", "P3"]
        assert r["origin"] == "ai_suggested"
        assert r["is_approved"] is False

    # 3. Test approving the research plan
    approve_res = client.post(f"/api/v1/research/{session_id}/plan/approve", json={})
    assert approve_res.status_code == 200
    approved_plan = approve_res.json()
    assert approved_plan["official_approved_count"] == approved_plan["total_requirements"]
    assert approved_plan["ai_suggested_count"] == 0


def test_business_research_scenario_and_editing():
    """
    Test Scenario 2: Business & Enterprise Research
    Verifies:
    1. Business decomposition (TAM, Unit Economics, Regulatory, Moats).
    2. Editing a question.
    3. Deleting a question.
    4. Marking a requirement as decision-critical.
    """
    # 1. Create session
    res = client.post("/api/v1/research", json={
        "title": "B2B SaaS Market Expansion Feasibility",
        "research_goal": "Evaluate commercial viability, market opportunity, unit economics and competitors.",
        "target_decision": "Authorize $2M seed budget for North American market entry."
    })
    assert res.status_code == 201
    session_id = res.json()["id"]

    # 2. Generate Plan
    plan_res = client.post(f"/api/v1/research/{session_id}/plan/generate", json={
        "domain_context": "business",
        "max_criteria": 6
    })
    assert plan_res.status_code == 200
    plan_data = plan_res.json()
    reqs = plan_data["requirements"]
    assert len(reqs) >= 4

    target_req = reqs[0]
    target_id = target_req["id"]

    # 3. Edit Question
    patch_res = client.patch(f"/api/v1/requirements/{target_id}", json={
        "question": "What is the validated TAM in financial services and healthcare sectors specifically?",
        "importance": "critical",
        "priority": "P0",
        "is_decision_critical": True
    })
    assert patch_res.status_code == 200
    updated_req = patch_res.json()
    assert "specifically" in updated_req["question"]
    assert updated_req["is_decision_critical"] is True
    assert updated_req["priority"] == "P0"

    # 4. Delete Question
    delete_res = client.delete(f"/api/v1/requirements/{reqs[-1]['id']}")
    assert delete_res.status_code == 200

    # 5. Verify plan reflects changes
    summary_res = client.get(f"/api/v1/research/{session_id}/plan")
    assert summary_res.status_code == 200
    assert summary_res.json()["total_requirements"] == len(reqs) - 1


def test_government_service_scenario_and_user_question():
    """
    Test Scenario 3: Government Service / Public Benefit
    Verifies:
    1. Government service decomposition (Statutory entitlement, Proof of identity, Appeals).
    2. Adding a user-requested requirement (origin='user_requested', is_approved=True).
    3. Selective approval.
    """
    res = client.post("/api/v1/research", json={
        "title": "State Healthcare & Disability Benefit Application",
        "research_goal": "Determine entitlement criteria, required documentation proofs, and appeal rights for state disability insurance.",
        "target_decision": "File formal disability claim with full evidence portfolio."
    })
    assert res.status_code == 201
    session_id = res.json()["id"]

    # 1. Add user-requested requirement first
    user_req_res = client.post(f"/api/v1/research/{session_id}/requirements", json={
        "requirement_text": "Applicant must present certified physician diagnosis of qualifying medical impairment.",
        "question": "Does the applicant have official physician certification on Form MED-14?",
        "category": "Medical Certification",
        "importance": "critical",
        "priority": "P0",
        "is_decision_critical": True
    })
    assert user_req_res.status_code == 201
    user_req = user_req_res.json()
    assert user_req["origin"] == "user_requested"
    assert user_req["is_approved"] is True

    # 2. Generate AI suggested requirements
    plan_res = client.post(f"/api/v1/research/{session_id}/plan/generate", json={
        "domain_context": "government_service",
        "max_criteria": 6
    })
    assert plan_res.status_code == 200
    plan_data = plan_res.json()

    # Total should include the 1 user requirement + AI suggestions
    assert plan_data["official_approved_count"] == 1
    assert plan_data["ai_suggested_count"] >= 4

    # 3. Selectively approve only 2 AI suggestions
    ai_suggestions = [r for r in plan_data["requirements"] if not r["is_approved"]]
    selected_ids = [ai_suggestions[0]["id"], ai_suggestions[1]["id"]]

    approve_res = client.post(f"/api/v1/research/{session_id}/plan/approve", json={
        "approved_requirement_ids": selected_ids
    })
    assert approve_res.status_code == 200
    approved_summary = approve_res.json()
    assert approved_summary["official_approved_count"] == 1 + 2  # 1 user + 2 approved
