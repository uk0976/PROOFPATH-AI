import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from app.main import app
from app.database.session import SessionLocal, Base, engine
from app.models import ResearchSession, Requirement, BlindSpot, Source, DocumentChunk, AtomicClaim
from app.intelligence.blindspot_engine import BlindSpotDiscoveryEngine

client = TestClient(app)


def test_blindspot_discovery_scholarship_scenario():
    """
    Validates 10-step BlindSpot Discovery process for the scholarship scenario:
    Goal: "What do I need to know before applying for this scholarship?"
    Surfaces questions user forgot to ask:
    - Transferring institutions
    - Missing documents grace periods
    - Renewal GPA & credit hurdles
    - Multiple scholarship anti-stacking rules
    - Appeal process for rejection
    - Certificate validity periods
    """
    db = SessionLocal()
    try:
        session = ResearchSession(
            title="National Merit Student Scholarship 2026",
            research_goal="What do I need to know before applying for this scholarship?",
            target_decision="Decide whether to prepare application for state merit scholarship.",
            status="draft"
        )
        db.add(session)
        db.commit()

        # Add existing base requirement to verify deduplication
        req = Requirement(
            session_id=session.id,
            requirement_text="Applicants must have secured 60% minimum aggregate in final exams",
            category="academic",
            order_index=0
        )
        db.add(req)
        db.commit()

        # Run 10-step discovery engine
        import asyncio
        spots = asyncio.run(BlindSpotDiscoveryEngine.discover_for_session(db, session.id, persist=True))

        assert len(spots) >= 4

        # Verify key overlooked dimensions are surfaced
        questions_text = " ".join([s.question.lower() for s in spots])
        assert "changes colleges" in questions_text or "transfers" in questions_text
        assert "missing" in questions_text or "documents" in questions_text or "provisional" in questions_text
        assert "renewal" in questions_text or "gpa" in questions_text
        assert "multiple scholarships" in questions_text or "simultaneously" in questions_text or "appeal" in questions_text

        # Verify structure & fields
        for s in spots:
            assert s.question is not None
            assert s.rationale is not None
            assert s.explanation is not None
            assert s.risk_level in ["high", "medium", "low"]
            assert s.priority in ["P1", "P2", "P3"]
            assert s.evidence_coverage in ["uncovered", "partially_answered", "answered_in_sources"]
            assert s.recommended_action is not None
            assert s.is_added_to_plan is False
            assert s.is_dismissed is False

    finally:
        db.close()


def test_blindspot_add_to_research_plan():
    """
    Step 10: Validates one-click promotion of a discovered BlindSpot into an active Research Requirement.
    Ensures:
    - New Requirement is created on the session.
    - Origin is marked 'ai_suggested' and labeled as an AI Strategic Dimension.
    - BlindSpot is updated with is_added_to_plan=True and added_requirement_id.
    """
    db = SessionLocal()
    try:
        session = ResearchSession(
            title="Scholarship Decision Planning",
            research_goal="Evaluate funding eligibility and exclusions.",
            status="draft"
        )
        db.add(session)
        db.commit()

        spot = BlindSpot(
            session_id=session.id,
            question="Can missing documents be submitted later under a provisional window?",
            rationale="Strict submission cutoffs without grace periods lead to immediate disqualification.",
            explanation="Many applicants obtain final certificates after initial deadline.",
            risk_level="high",
            priority="P1",
            category="documentation_grace_period",
            evidence_coverage="uncovered",
            recommended_action="Confirm whether portal accepts provisional receipts.",
            is_added_to_plan=False
        )
        db.add(spot)
        db.commit()

        # Promote to research plan
        req = BlindSpotDiscoveryEngine.add_blindspot_to_research_plan(db, spot.id)

        assert req is not None
        assert req.session_id == session.id
        assert req.requirement_text == spot.question
        assert req.origin == "ai_suggested"
        assert req.is_decision_critical is True
        assert "AI-Discovered Strategic Dimension" in req.description

        # Verify BlindSpot model state updated
        db.refresh(spot)
        assert spot.is_added_to_plan is True
        assert spot.added_requirement_id == req.id

    finally:
        db.close()


def test_blindspot_user_actions_endpoints():
    """
    Validates REST API endpoints for user actions:
    - Add to plan
    - Toggle star (mark important)
    - Dismiss and restore
    - Filter include_dismissed
    """
    db = SessionLocal()
    try:
        session = ResearchSession(
            title="User Actions API Test Session",
            research_goal="Verify user interactions on blindspots.",
            status="draft"
        )
        db.add(session)
        db.commit()

        spot = BlindSpot(
            session_id=session.id,
            question="Is there an appeal process after rejection due to administrative error?",
            rationale="Disputes cannot be corrected without published grievance channels.",
            risk_level="medium",
            priority="P2",
            category="appeal_and_grievance_procedure",
            evidence_coverage="uncovered",
            is_starred=False,
            is_dismissed=False
        )
        db.add(spot)
        db.commit()
        spot_id = spot.id

        # 1. Test Toggle Star (Mark as important)
        res_star = client.post(f"/api/v1/blindspots/{spot_id}/toggle-star")
        assert res_star.status_code == 200
        assert res_star.json()["status"] is True
        assert res_star.json()["blindspot"]["is_starred"] is True

        # Unstar
        res_unstar = client.post(f"/api/v1/blindspots/{spot_id}/toggle-star")
        assert res_unstar.status_code == 200
        assert res_unstar.json()["status"] is False

        # 2. Test Dismiss
        res_dismiss = client.post(f"/api/v1/blindspots/{spot_id}/dismiss")
        assert res_dismiss.status_code == 200
        assert res_dismiss.json()["status"] is True
        assert res_dismiss.json()["blindspot"]["is_dismissed"] is True

        # When dismissed, GET without include_dismissed should not return it
        res_list = client.get(f"/api/v1/research/{session.id}/blindspots?include_dismissed=false")
        assert res_list.status_code == 200
        assert len(res_list.json()) == 0

        # With include_dismissed=true, it should return
        res_list_all = client.get(f"/api/v1/research/{session.id}/blindspots?include_dismissed=true")
        assert res_list_all.status_code == 200
        assert len(res_list_all.json()) == 1

        # Restore from dismissal
        res_restore = client.post(f"/api/v1/blindspots/{spot_id}/dismiss")
        assert res_restore.status_code == 200
        assert res_restore.json()["status"] is False

        # 3. Test Add to Plan via API
        res_add = client.post(f"/api/v1/blindspots/{spot_id}/add-to-plan")
        assert res_add.status_code == 200
        add_data = res_add.json()
        assert add_data["status"] is True
        assert add_data["requirement_id"] is not None
        assert add_data["blindspot"]["is_added_to_plan"] is True

    finally:
        db.close()


def test_blindspot_evidence_matching_against_sources():
    """
    Validates checking questions against existing sources:
    When a source addresses a question (e.g. document validity period),
    engine detects it and marks evidence_coverage as answered_in_sources or partially_answered,
    attaching exact source references and quotes.
    """
    db = SessionLocal()
    try:
        session = ResearchSession(
            title="Evidence Corroboration Session",
            research_goal="Scholarship documentation and certificate requirements.",
            status="draft"
        )
        db.add(session)
        db.commit()

        src = Source(
            session_id=session.id,
            source_type="pdf",
            title="State Scholarship Guidelines 2026.pdf",
            publication_date=datetime(2026, 1, 1, tzinfo=timezone.utc),
            raw_content="Section 4: Income and caste certificates must be issued within the last 6 months of application.",
            cleaned_content="Section 4: Income and caste certificates must be issued within the last 6 months of application."
        )
        db.add(src)
        db.commit()

        chunk = DocumentChunk(
            source_id=src.id,
            chunk_index=0,
            text_content=src.cleaned_content,
            start_char=0,
            end_char=len(src.cleaned_content)
        )
        db.add(chunk)
        db.commit()

        claim = AtomicClaim(
            chunk_id=chunk.id,
            source_id=src.id,
            claim_text="Income and caste certificates must be issued within the last 6 months of application.",
            exact_quote="certificates must be issued within the last 6 months of application.",
            category="documentation",
            page_number=4
        )
        db.add(claim)
        db.commit()

        # Run discovery
        import asyncio
        spots = asyncio.run(BlindSpotDiscoveryEngine.discover_for_session(db, session.id, persist=False))

        # Check validity question
        validity_spot = next((s for s in spots if "validity" in s.question.lower() or "certificate" in s.question.lower()), None)
        assert validity_spot is not None
        assert validity_spot.evidence_coverage in ["answered_in_sources", "partially_answered"]
        import json
        refs = json.loads(validity_spot.source_references_json) if validity_spot.source_references_json else []
        assert len(refs) >= 1
        assert "State Scholarship Guidelines" in refs[0]["source_title"]
        assert "6 months" in refs[0]["exact_quote"]

    finally:
        db.close()
