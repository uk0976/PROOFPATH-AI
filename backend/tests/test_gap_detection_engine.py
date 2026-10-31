import json
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database.session import SessionLocal
from app.models import (
    ResearchSession,
    Source,
    DocumentChunk,
    Requirement,
    AtomicClaim,
    EvidenceLink,
    Contradiction,
    GapFinding,
)
from app.intelligence.gap_detection_engine import (
    GapDetectionEngine,
    FINDING_COVERED,
    FINDING_MISSING,
    FINDING_INCOMPLETE,
    FINDING_POTENTIAL_CONFLICT,
    FINDING_POTENTIALLY_OUTDATED,
    FINDING_UNVERIFIED,
)

client = TestClient(app)


def test_gap_detection_all_six_categories():
    """
    Tests that GapDetectionEngine accurately identifies and assigns all 6 finding types:
    1. COVERED
    2. MISSING
    3. INCOMPLETE
    4. POTENTIAL CONFLICT
    5. POTENTIALLY OUTDATED
    6. UNVERIFIED
    """
    db = SessionLocal()
    try:
        # Create isolated test session
        session = ResearchSession(
            title="Six Category Gap Detection Test",
            research_goal="Verify complete classification of information sufficiency.",
            status="draft",
        )
        db.add(session)
        db.commit()
        db.refresh(session)

        # 1. Source: Current Regulations
        source_current = Source(
            session_id=session.id,
            source_type="pdf",
            title="Active 2026 Grant Manual",
            uri="active_manual_2026.pdf",
            processing_status="processed",
        )
        # 2. Source: Old Archived Notice (dated 2020)
        from datetime import datetime, timezone
        source_old = Source(
            session_id=session.id,
            source_type="pdf",
            title="Legacy 2020 Notice",
            uri="legacy_2020_notice.pdf",
            publication_date=datetime(2020, 1, 15, tzinfo=timezone.utc),
            processing_status="processed",
        )
        db.add_all([source_current, source_old])
        db.commit()
        db.refresh(source_current)
        db.refresh(source_old)

        chunk_current = DocumentChunk(
            source_id=source_current.id,
            chunk_index=0,
            text_content="Section A: Candidates must be full-time students. Section B: Tuition grants are capped at $20,000 per annum.",
        )
        chunk_old = DocumentChunk(
            source_id=source_old.id,
            chunk_index=0,
            text_content="Archived 2020 rule: Annual renewal requires 50 service hours.",
        )
        db.add_all([chunk_current, chunk_old])
        db.commit()
        db.refresh(chunk_current)
        db.refresh(chunk_old)

        # -------------------------------------------------------------
        # Category 1: COVERED (2+ verified, timely, non-conflicting claims)
        # -------------------------------------------------------------
        req_covered = Requirement(
            session_id=session.id,
            requirement_text="Are candidates required to be full-time students?",
            category="Eligibility",
            order_index=0,
        )
        # -------------------------------------------------------------
        # Category 2: MISSING (0 relevant evidence in reviewed sources)
        # -------------------------------------------------------------
        req_missing = Requirement(
            session_id=session.id,
            requirement_text="What are the specific foreign language proficiency score cutoffs?",
            category="Academic",
            order_index=1,
        )
        # -------------------------------------------------------------
        # Category 3: INCOMPLETE (Only 1 single uncorroborated claim)
        # -------------------------------------------------------------
        req_incomplete = Requirement(
            session_id=session.id,
            requirement_text="What is the maximum annual grant cap amount?",
            category="Financial",
            order_index=2,
        )
        # -------------------------------------------------------------
        # Category 4: POTENTIAL CONFLICT (Incompatible claims / Contradiction)
        # -------------------------------------------------------------
        req_conflict = Requirement(
            session_id=session.id,
            requirement_text="Can graduate students hold outside employment?",
            category="Governance",
            order_index=3,
        )
        # -------------------------------------------------------------
        # Category 5: POTENTIALLY OUTDATED (Claims citing expired dates <= 2022)
        # -------------------------------------------------------------
        req_outdated = Requirement(
            session_id=session.id,
            requirement_text="How many community service hours are needed for renewal?",
            category="Procedure",
            order_index=4,
        )
        # -------------------------------------------------------------
        # Category 6: UNVERIFIED (Claim with is_verified == False)
        # -------------------------------------------------------------
        req_unverified = Requirement(
            session_id=session.id,
            requirement_text="Is an expedited application fee waiver available?",
            category="Documentation",
            order_index=5,
        )

        db.add_all([
            req_covered,
            req_missing,
            req_incomplete,
            req_conflict,
            req_outdated,
            req_unverified,
        ])
        db.commit()

        # Create Claims
        # Claims for COVERED
        c_cov1 = AtomicClaim(
            chunk_id=chunk_current.id,
            source_id=source_current.id,
            claim_text="Candidates must be enrolled as full-time students.",
            category="Eligibility",
            exact_quote="Candidates must be full-time students",
            is_verified=True,
            extraction_confidence=0.98,
        )
        c_cov2 = AtomicClaim(
            chunk_id=chunk_current.id,
            source_id=source_current.id,
            claim_text="Full-time student status is mandatory throughout the academic term.",
            category="Eligibility",
            exact_quote="Candidates must be full-time students",
            is_verified=True,
            extraction_confidence=0.97,
        )

        # Claim for INCOMPLETE (only 1 single claim)
        c_inc = AtomicClaim(
            chunk_id=chunk_current.id,
            source_id=source_current.id,
            claim_text="Tuition grants are capped at $20,000 per annum.",
            category="Financial",
            exact_quote="Tuition grants are capped at $20,000 per annum",
            is_verified=True,
            extraction_confidence=0.95,
        )

        # Claims for CONFLICT
        c_conf1 = AtomicClaim(
            chunk_id=chunk_current.id,
            source_id=source_current.id,
            claim_text="Outside employment is strictly prohibited for fellowship holders.",
            category="Governance",
            exact_quote="Outside employment is strictly prohibited",
            is_verified=True,
            extraction_confidence=0.96,
        )
        c_conf2 = AtomicClaim(
            chunk_id=chunk_current.id,
            source_id=source_current.id,
            claim_text="Graduate students are permitted up to 20 hours of external consulting work.",
            category="Governance",
            exact_quote="permitted up to 20 hours of external consulting work",
            is_verified=True,
            extraction_confidence=0.95,
        )

        # Claim for OUTDATED (from 2020 old source)
        c_outdated = AtomicClaim(
            chunk_id=chunk_old.id,
            source_id=source_old.id,
            claim_text="Annual renewal requires 50 service hours.",
            category="Procedure",
            exact_quote="Archived 2020 rule: Annual renewal requires 50 service hours.",
            applicable_period="2020",
            date_reference="2020",
            is_verified=True,
            extraction_confidence=0.92,
        )

        # Claim for UNVERIFIED (is_verified = False)
        c_unverified = AtomicClaim(
            chunk_id=chunk_current.id,
            source_id=source_current.id,
            claim_text="Expedited fee waivers can be requested via email.",
            category="Documentation",
            exact_quote="Fabricated ungrounded quote not in text",
            is_verified=False,  # Unverified!
            extraction_confidence=0.60,
        )

        db.add_all([c_cov1, c_cov2, c_inc, c_conf1, c_conf2, c_outdated, c_unverified])
        db.commit()

        # Link claims to requirements
        link_cov1 = EvidenceLink(requirement_id=req_covered.id, claim_id=c_cov1.id, relation_type="supports", similarity_score=0.85)
        link_cov2 = EvidenceLink(requirement_id=req_covered.id, claim_id=c_cov2.id, relation_type="supports", similarity_score=0.82)
        link_inc = EvidenceLink(requirement_id=req_incomplete.id, claim_id=c_inc.id, relation_type="supports", similarity_score=0.80)
        link_conf1 = EvidenceLink(requirement_id=req_conflict.id, claim_id=c_conf1.id, relation_type="refutes", similarity_score=0.78)
        link_conf2 = EvidenceLink(requirement_id=req_conflict.id, claim_id=c_conf2.id, relation_type="supports", similarity_score=0.76)
        link_out = EvidenceLink(requirement_id=req_outdated.id, claim_id=c_outdated.id, relation_type="supports", similarity_score=0.81)
        link_unver = EvidenceLink(requirement_id=req_unverified.id, claim_id=c_unverified.id, relation_type="supports", similarity_score=0.70)

        db.add_all([link_cov1, link_cov2, link_inc, link_conf1, link_conf2, link_out, link_unver])

        # Register explicit Contradiction
        contra = Contradiction(
            session_id=session.id,
            requirement_id=req_conflict.id,
            claim_a_id=c_conf1.id,
            claim_b_id=c_conf2.id,
            severity="high",
            conflicting_aspect="Outside employment permissions vs prohibition",
        )
        db.add(contra)
        db.commit()

        # -------------------------------------------------------------
        # Execute GapDetectionEngine
        # -------------------------------------------------------------
        findings = GapDetectionEngine.evaluate_session(db, session.id, persist=True)

        assert len(findings) == 6
        findings_map = {f.requirement_id: f for f in findings}

        # 1. Verify COVERED
        f_cov = findings_map[req_covered.id]
        assert f_cov.finding_type == FINDING_COVERED
        assert "Sufficient relevant evidence" in f_cov.explanation

        # 2. Verify MISSING (Anti-hallucination mandate checked)
        f_miss = findings_map[req_missing.id]
        assert f_miss.finding_type == FINDING_MISSING
        assert "No relevant evidence was found" in f_miss.explanation
        assert "absence of evidence must not be presented as proof" in f_miss.explanation

        # 3. Verify INCOMPLETE
        f_inc = findings_map[req_incomplete.id]
        assert f_inc.finding_type == FINDING_INCOMPLETE
        assert "Partial evidence exists" in f_inc.explanation

        # 4. Verify POTENTIAL CONFLICT
        f_conf = findings_map[req_conflict.id]
        assert f_conf.finding_type == FINDING_POTENTIAL_CONFLICT
        assert "incompatible or contradictory" in f_conf.explanation

        # 5. Verify POTENTIALLY OUTDATED
        f_out = findings_map[req_outdated.id]
        assert f_out.finding_type == FINDING_POTENTIALLY_OUTDATED
        assert "older or potentially expired" in f_out.explanation

        # 6. Verify UNVERIFIED
        f_unv = findings_map[req_unverified.id]
        assert f_unv.finding_type == FINDING_UNVERIFIED
        assert "authenticity, exact verbatim grounding" in f_unv.explanation

        # -------------------------------------------------------------
        # Test API Endpoints
        # -------------------------------------------------------------
        # GET all gaps for session
        res_gaps = client.get(f"/api/v1/findings/{session.id}/gaps")
        assert res_gaps.status_code == 200
        gaps_data = res_gaps.json()
        assert len(gaps_data) == 6

        # Filter by MISSING
        res_missing = client.get(f"/api/v1/findings/{session.id}/gaps?finding_type=MISSING")
        assert res_missing.status_code == 200
        assert len(res_missing.json()) == 1
        assert res_missing.json()[0]["finding_type"] == "MISSING"

        # Filter by COVERED
        res_cov = client.get(f"/api/v1/findings/{session.id}/gaps?finding_type=COVERED")
        assert res_cov.status_code == 200
        assert len(res_cov.json()) == 1
        assert res_cov.json()[0]["finding_type"] == "COVERED"

        # POST evaluate-gaps endpoint
        res_eval = client.post(f"/api/v1/research/{session.id}/evaluate-gaps")
        assert res_eval.status_code == 200
        eval_data = res_eval.json()
        assert eval_data["total_findings"] == 6
        assert eval_data["counts_by_type"]["MISSING"] == 1
        assert eval_data["counts_by_type"]["COVERED"] == 1
        assert eval_data["counts_by_type"]["INCOMPLETE"] == 1
        assert eval_data["counts_by_type"]["POTENTIAL CONFLICT"] == 1
        assert eval_data["counts_by_type"]["POTENTIALLY OUTDATED"] == 1
        assert eval_data["counts_by_type"]["UNVERIFIED"] == 1

        # GET single finding detail
        miss_finding = next(f for f in eval_data["findings"] if f["finding_type"] == "MISSING")
        finding_id = miss_finding["id"]
        res_detail = client.get(f"/api/v1/findings/{finding_id}")
        assert res_detail.status_code == 200
        assert res_detail.json()["id"] == finding_id
        assert res_detail.json()["finding_type"] == "MISSING"

    finally:
        db.close()


def test_missing_finding_epistemic_integrity():
    """Explicitly tests that absence of evidence is NEVER framed as proof of falsehood."""
    db = SessionLocal()
    try:
        session = ResearchSession(
            title="Epistemic Integrity Test",
            research_goal="Verify anti-hallucination absence of evidence principle.",
            status="draft",
        )
        db.add(session)
        db.commit()
        db.refresh(session)

        req = Requirement(
            session_id=session.id,
            requirement_text="Are applicants required to submit proof of state residency?",
            category="Eligibility",
        )
        db.add(req)
        db.commit()
        db.refresh(req)

        finding = GapDetectionEngine.evaluate_requirement(
            requirement=req,
            session_sources=[],
            session_claims=[],
            session_links=[],
            session_conflicts=[],
            session_id=session.id,
        )

        assert finding.finding_type == FINDING_MISSING
        # Must explicitly note that absence of evidence != falsehood
        assert "absence of evidence must not be presented as proof" in finding.explanation
        assert "silent on this criterion" in finding.explanation
        assert "does not indicate" in finding.limitations.lower()
    finally:
        db.close()
