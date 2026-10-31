import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from app.main import app
from app.database.session import SessionLocal, Base, engine
from app.models import ResearchSession, Source, DocumentChunk, Requirement, AtomicClaim, Contradiction
from app.intelligence.contradiction_intelligence_engine import ContradictionIntelligenceEngine, ScopeExtractor
from app.intelligence.temporal_intelligence_engine import TemporalIntelligenceEngine, TemporalMetadataExtractor

client = TestClient(app)


def test_genuine_conflict_same_cohort_and_cycle_divergent_thresholds():
    """
    Tests Genuine Contradiction:
    Source A: Undergraduate students require 60% for the 2026 cycle.
    Source B: Undergraduate students require 65% for the same cycle.
    Must be identified as a genuine contradiction with high severity.
    """
    claim_a = {
        "id": "claim-a1",
        "source_id": "src-1",
        "claim_text": "Undergraduate students require 60% for the 2026 cycle.",
        "category": "Academic",
    }
    claim_b = {
        "id": "claim-b1",
        "source_id": "src-2",
        "claim_text": "Undergraduate students require 65% for the 2026 cycle.",
        "category": "Academic",
    }

    eval_result = ContradictionIntelligenceEngine.compare_claims_forensically(
        claim_a=claim_a,
        claim_b=claim_b,
        requirement_text="Minimum qualifying aggregate score for admission"
    )

    assert eval_result["is_genuine"] is True
    assert eval_result["conflict_type"] == "numerical_threshold_divergence"
    assert eval_result["severity"] == "high"

    scope = eval_result["scope_comparison"]
    assert scope["applicant_category_a"] == "Undergraduate"
    assert scope["applicant_category_b"] == "Undergraduate"
    assert scope["academic_year_a"] == "2026"
    assert scope["academic_year_b"] == "2026"
    assert scope["numerical_value_a"] == "60"
    assert scope["numerical_value_b"] == "65"
    assert scope["unit_a"] == "%"
    assert scope["unit_b"] == "%"
    assert scope["scope_alignment"] == "aligned"
    assert len(scope["divergence_reasons"]) == 0
    assert "incompatible thresholds" in eval_result["explanation"]
    assert "Escalate discrepancy" in eval_result["recommended_action"]


def test_false_conflict_applicant_category_divergence():
    """
    Tests False Conflict / Scope Differentiation:
    Source A: Undergraduate students require 60%.
    Source B: Postgraduate students require 65%.
    Must NOT be flagged as a genuine contradiction.
    """
    claim_a = {
        "id": "claim-a2",
        "source_id": "src-1",
        "claim_text": "Undergraduate students require 60% minimum score.",
        "category": "Eligibility",
    }
    claim_b = {
        "id": "claim-b2",
        "source_id": "src-2",
        "claim_text": "Postgraduate students require 65% minimum score.",
        "category": "Eligibility",
    }

    eval_result = ContradictionIntelligenceEngine.compare_claims_forensically(
        claim_a=claim_a,
        claim_b=claim_b,
        requirement_text="Academic eligibility thresholds"
    )

    assert eval_result["is_genuine"] is False
    assert eval_result["conflict_type"] == "scope_divergence"
    assert eval_result["severity"] == "low"

    scope = eval_result["scope_comparison"]
    assert scope["applicant_category_a"] == "Undergraduate"
    assert scope["applicant_category_b"] == "Postgraduate"
    assert scope["scope_alignment"] == "divergent"
    assert len(scope["divergence_reasons"]) >= 1
    assert "Applicant cohorts differ" in scope["divergence_reasons"][0]
    assert "False Conflict" in eval_result["explanation"]
    assert "separate cohort criteria" in eval_result["explanation"]


def test_false_conflict_geographic_scope_divergence():
    """
    Tests False Conflict due to Geographic Domicile:
    Source A: In-state California applicants must submit 3.0 GPA.
    Source B: Out-of-state applicants must submit 3.4 GPA.
    Must be identified as jurisdiction differentiation, NOT institutional conflict.
    """
    claim_a = {
        "id": "claim-a3",
        "source_id": "src-1",
        "claim_text": "In-state California applicants must achieve a 3.0 GPA scale.",
        "category": "Academic",
    }
    claim_b = {
        "id": "claim-b3",
        "source_id": "src-2",
        "claim_text": "Out-of-state applicants must achieve a 3.4 GPA scale.",
        "category": "Academic",
    }

    eval_result = ContradictionIntelligenceEngine.compare_claims_forensically(
        claim_a=claim_a,
        claim_b=claim_b,
        requirement_text="GPA threshold for applicants"
    )

    assert eval_result["is_genuine"] is False
    assert eval_result["conflict_type"] == "jurisdiction_divergence"
    assert eval_result["severity"] == "low"

    scope = eval_result["scope_comparison"]
    assert scope["scope_alignment"] == "divergent"
    assert "In-State" in scope["geographic_scope_a"]
    assert "Out-Of-State" in scope["geographic_scope_b"]
    assert "residency status distinctions" in eval_result["explanation"]


def test_false_conflict_differing_application_cycles():
    """
    Tests differing application cycles:
    Source A: For the 2024 cycle, the registration fee is $50.
    Source B: For the 2026 cycle, the registration fee is $65.
    Must be classified as timeline/cycle divergence.
    """
    claim_a = {
        "id": "claim-a4",
        "source_id": "src-1",
        "claim_text": "For the 2024 cycle, the registration fee is $50 USD.",
        "category": "Fee",
    }
    claim_b = {
        "id": "claim-b4",
        "source_id": "src-2",
        "claim_text": "For the 2026 cycle, the registration fee is $65 USD.",
        "category": "Fee",
    }

    eval_result = ContradictionIntelligenceEngine.compare_claims_forensically(
        claim_a=claim_a,
        claim_b=claim_b,
        requirement_text="Application fee schedule"
    )

    assert eval_result["is_genuine"] is False
    assert eval_result["conflict_type"] == "timeline_conflict"
    scope = eval_result["scope_comparison"]
    assert scope["academic_year_a"] == "2024"
    assert scope["academic_year_b"] == "2026"
    assert "Temporal Cycle Divergence" in eval_result["explanation"]


def test_temporal_superseded_notice_identification():
    """
    Tests detection of explicitly superseded circulars:
    Source A is an earlier 2024 notice.
    Source B explicitly states: 'This circular supersedes Admissions Notice 2024-01'.
    Source A must be flagged as SUPERSEDED with decay_risk=high.
    """
    db = SessionLocal()
    try:
        session = ResearchSession(
            title="Temporal Supersession Test Session",
            research_goal="Verify automatic detection of superseded circulars.",
            status="draft"
        )
        db.add(session)
        db.commit()

        s1 = Source(
            session_id=session.id,
            source_type="pdf",
            title="Admissions Notice 2024-01.pdf",
            author_or_publisher="University Admissions",
            academic_year="2024",
            publication_date=datetime(2024, 1, 15, tzinfo=timezone.utc),
            raw_content="Admissions Notice 2024-01. All applicants must pay $50 processing fee.",
            cleaned_content="Admissions Notice 2024-01. All applicants must pay $50 processing fee."
        )
        s2 = Source(
            session_id=session.id,
            source_type="pdf",
            title="Admissions Notice 2026-01.pdf",
            author_or_publisher="University Admissions",
            academic_year="2026",
            publication_date=datetime(2026, 1, 10, tzinfo=timezone.utc),
            raw_content="Admissions Notice 2026-01. This document supersedes Admissions Notice 2024-01. Processing fee is $65.",
            cleaned_content="Admissions Notice 2026-01. This document supersedes Admissions Notice 2024-01. Processing fee is $65."
        )
        db.add_all([s1, s2])
        db.commit()

        audit = TemporalIntelligenceEngine.audit_session_temporal(db, session.id, persist=False)

        assert audit["total_sources"] == 2
        assert audit["superseded_sources"] == 1

        s1_audit = next(a for a in audit["audits"] if a["source_id"] == s1.id)
        assert s1_audit["status"] == "SUPERSEDED"
        assert s1_audit["decay_risk"] == "high"
        assert s1_audit["superseded_by_title"] == "Admissions Notice 2026-01.pdf"
        assert "Superseded Notice" in s1_audit["applicability_verdict"]

        s2_audit = next(a for a in audit["audits"] if a["source_id"] == s2.id)
        assert s2_audit["status"] == "CURRENT_ACTIVE"
        assert s2_audit["decay_risk"] == "none"

    finally:
        db.close()


def test_temporal_expired_information():
    """
    Tests detection of expired documents where expiry date has passed.
    """
    db = SessionLocal()
    try:
        session = ResearchSession(
            title="Temporal Expiry Test Session",
            research_goal="Verify expiry detection.",
            status="draft"
        )
        db.add(session)
        db.commit()

        expired_date = datetime.now(timezone.utc) - timedelta(days=60)
        s = Source(
            session_id=session.id,
            source_type="pdf",
            title="Scholarship Phase 1 Notice.pdf",
            expiry_date=expired_date,
            raw_content="Application window valid until 2024-12-31.",
            cleaned_content="Application window valid until 2024-12-31."
        )
        db.add(s)
        db.commit()

        audit = TemporalIntelligenceEngine.audit_session_temporal(db, session.id, persist=False)
        assert audit["expired_sources"] == 1
        s_audit = audit["audits"][0]
        assert s_audit["status"] == "EXPIRED"
        assert s_audit["decay_risk"] == "high"
        assert "Information Expired" in s_audit["applicability_verdict"]

    finally:
        db.close()


def test_temporal_older_foundational_document_remains_active():
    """
    Epistemic Safeguard:
    Do NOT assume an older document is automatically invalid!
    A foundational statute or charter from 4 years ago with no superseding notice
    and no expired deadline is recognized as CURRENT_ACTIVE (foundational framework).
    """
    db = SessionLocal()
    try:
        session = ResearchSession(
            title="Foundational Policy Test",
            research_goal="Test that older authoritative documents remain valid.",
            status="draft"
        )
        db.add(session)
        db.commit()

        pub_date = datetime.now(timezone.utc) - timedelta(days=1200)  # ~40 months old
        s = Source(
            session_id=session.id,
            source_type="pdf",
            title="National Higher Education Governance Charter.pdf",
            publication_date=pub_date,
            raw_content="Section 12: National universities shall adhere to independent accreditation councils.",
            cleaned_content="Section 12: National universities shall adhere to independent accreditation councils."
        )
        db.add(s)
        db.commit()

        audit = TemporalIntelligenceEngine.audit_session_temporal(db, session.id, persist=False)
        s_audit = audit["audits"][0]
        assert s_audit["status"] == "CURRENT_ACTIVE"
        assert s_audit["decay_risk"] == "low"
        assert "Active Foundational Document" in s_audit["applicability_verdict"]

    finally:
        db.close()


def test_temporal_missing_date_metadata():
    """
    Tests identification of undated documents lacking publication timestamps or academic cycles.
    """
    db = SessionLocal()
    try:
        session = ResearchSession(
            title="Missing Metadata Test",
            research_goal="Test undated notices.",
            status="draft"
        )
        db.add(session)
        db.commit()

        s = Source(
            session_id=session.id,
            source_type="text",
            title="General Campus Leaflet",
            raw_content="General tips for prospective applicants.",
            cleaned_content="General tips for prospective applicants."
        )
        db.add(s)
        db.commit()

        audit = TemporalIntelligenceEngine.audit_session_temporal(db, session.id, persist=False)
        assert audit["missing_metadata_sources"] == 1
        s_audit = audit["audits"][0]
        assert s_audit["status"] == "MISSING_METADATA"
        assert s_audit["decay_risk"] == "medium"

    finally:
        db.close()


def test_api_endpoints_contradictions_and_temporal():
    """
    Tests REST API endpoints for contradictions and temporal audits.
    """
    db = SessionLocal()
    try:
        session = ResearchSession(
            title="API Contradictions and Temporal Test",
            research_goal="Test endpoints.",
            status="draft"
        )
        db.add(session)
        db.commit()

        req = Requirement(
            session_id=session.id,
            requirement_text="Undergraduate score requirement",
            category="Academic"
        )
        db.add(req)
        db.commit()

        s1 = Source(
            session_id=session.id,
            source_type="pdf",
            title="Prospectus 2026 Source 1.pdf",
            academic_year="2026",
            publication_date=datetime(2026, 1, 1, tzinfo=timezone.utc),
            raw_content="Undergraduate students require 60% aggregate.",
            cleaned_content="Undergraduate students require 60% aggregate."
        )
        s2 = Source(
            session_id=session.id,
            source_type="url",
            title="Web Portal Notice 2026 Source 2",
            academic_year="2026",
            publication_date=datetime(2026, 1, 5, tzinfo=timezone.utc),
            raw_content="Undergraduate students require 65% aggregate.",
            cleaned_content="Undergraduate students require 65% aggregate."
        )
        db.add_all([s1, s2])
        db.commit()

        c1 = DocumentChunk(source_id=s1.id, chunk_index=0, text_content=s1.cleaned_content, start_char=0, end_char=len(s1.cleaned_content))
        c2 = DocumentChunk(source_id=s2.id, chunk_index=0, text_content=s2.cleaned_content, start_char=0, end_char=len(s2.cleaned_content))
        db.add_all([c1, c2])
        db.commit()

        cl1 = AtomicClaim(
            chunk_id=c1.id,
            source_id=s1.id,
            claim_text="Undergraduate students require 60% aggregate.",
            exact_quote="Undergraduate students require 60% aggregate.",
            category="Academic",
            date_reference="2026"
        )
        cl2 = AtomicClaim(
            chunk_id=c2.id,
            source_id=s2.id,
            claim_text="Undergraduate students require 65% aggregate.",
            exact_quote="Undergraduate students require 65% aggregate.",
            category="Academic",
            date_reference="2026"
        )
        db.add_all([cl1, cl2])
        db.commit()

        # 1. Trigger evaluation endpoint
        res_eval = client.post(f"/api/v1/research/{session.id}/evaluate-contradictions")
        assert res_eval.status_code == 200
        conflicts = res_eval.json()
        assert len(conflicts) >= 1
        assert conflicts[0]["is_genuine"] is True
        assert conflicts[0]["conflict_type"] == "numerical_threshold_divergence"
        assert conflicts[0]["scope_comparison"] is not None

        # 2. Get contradictions with filter is_genuine=true
        res_genuine = client.get(f"/api/v1/research/{session.id}/contradictions?is_genuine=true")
        assert res_genuine.status_code == 200
        assert len(res_genuine.json()) >= 1

        # 3. Get contradictions with filter is_genuine=false
        res_false = client.get(f"/api/v1/research/{session.id}/contradictions?is_genuine=false")
        assert res_false.status_code == 200
        assert len(res_false.json()) == 0

        # 4. Trigger temporal evaluation endpoint
        res_temp_eval = client.post(f"/api/v1/research/{session.id}/evaluate-temporal")
        assert res_temp_eval.status_code == 200
        temp_data = res_temp_eval.json()
        assert temp_data["total_sources"] == 2
        assert len(temp_data["audits"]) == 2

        # 5. Get temporal audit
        res_temp_get = client.get(f"/api/v1/research/{session.id}/temporal")
        assert res_temp_get.status_code == 200
        assert res_temp_get.json()["total_sources"] == 2

    finally:
        db.close()
