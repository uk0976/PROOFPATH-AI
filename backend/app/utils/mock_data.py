import json
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from app.models import (
    ResearchSession,
    Source,
    DocumentChunk,
    Requirement,
    AtomicClaim,
    EvidenceLink,
    Contradiction,
    BlindSpot,
    GapFinding,
    VerificationTask,
)

DEMO_SESSION_ID = "demo-scholarship-investigation"
DEMO_ALIAS_ID = "demo"


def reset_demo_investigation(db: Session) -> str:
    """
    Cleans up any existing demo sessions and re-seeds the pristine
    demonstration dataset for evaluators and judges.
    """
    demo_ids = [DEMO_SESSION_ID, DEMO_ALIAS_ID]
    db.query(VerificationTask).filter(VerificationTask.session_id.in_(demo_ids)).delete(synchronize_session=False)
    db.query(GapFinding).filter(GapFinding.session_id.in_(demo_ids)).delete(synchronize_session=False)
    db.query(Contradiction).filter(Contradiction.session_id.in_(demo_ids)).delete(synchronize_session=False)
    db.query(BlindSpot).filter(BlindSpot.session_id.in_(demo_ids)).delete(synchronize_session=False)

    req_ids = [r[0] for r in db.query(Requirement.id).filter(Requirement.session_id.in_(demo_ids)).all()]
    if req_ids:
        db.query(EvidenceLink).filter(EvidenceLink.requirement_id.in_(req_ids)).delete(synchronize_session=False)
    db.query(Requirement).filter(Requirement.session_id.in_(demo_ids)).delete(synchronize_session=False)

    source_ids = [s[0] for s in db.query(Source.id).filter(Source.session_id.in_(demo_ids)).all()]
    if source_ids:
        chunk_ids = [c[0] for c in db.query(DocumentChunk.id).filter(DocumentChunk.source_id.in_(source_ids)).all()]
        if chunk_ids:
            db.query(AtomicClaim).filter(AtomicClaim.chunk_id.in_(chunk_ids)).delete(synchronize_session=False)
        db.query(DocumentChunk).filter(DocumentChunk.source_id.in_(source_ids)).delete(synchronize_session=False)
    db.query(Source).filter(Source.session_id.in_(demo_ids)).delete(synchronize_session=False)

    existing_sessions = (
        db.query(ResearchSession)
        .filter(ResearchSession.id.in_(demo_ids))
        .all()
    )
    for s in existing_sessions:
        db.delete(s)
    db.commit()

    return seed_demo_investigation(db)


def seed_demo_investigation(db: Session) -> str:
    """
    Seeds a prepared, realistic scholarship demonstration dataset.
    All data is clearly tagged with [SAMPLE DATA] to preserve epistemic integrity.
    Works completely offline with zero API key dependencies.
    """
    # Check if already seeded
    existing = db.query(ResearchSession).filter(ResearchSession.id == DEMO_SESSION_ID).first()
    if existing:
        return existing.id

    session = ResearchSession(
        id=DEMO_SESSION_ID,
        title="[SAMPLE DATA] Federal STEM Postgraduate Scholarship Application 2026",
        research_goal="I want to apply for the Federal STEM Postgraduate Scholarship. Tell me everything I should know before applying.",
        target_decision="Scholarship Application Submission & Compliance Sign-off",
        status="completed",
        readiness_score=74.5,
        coverage_score=80.0,
        consistency_score=70.0,
        freshness_score=65.0,
        verification_score=85.0,
        executive_verdict=(
            "[SAMPLE DATA] CONDITIONAL PROCEED: 1 Critical Gap in Mandatory International Health Insurance, "
            "1 Academic GPA Threshold Contradiction (3.5 standard vs 3.7 departmental priority), "
            "and 1 Potentially Outdated 2023 Circular ($65,000 threshold superseded by $75,000). "
            "Human verification required before final application submission."
        ),
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    # -------------------------------------------------------------
    # 3 SAMPLE SOURCES
    # -------------------------------------------------------------
    s1_text = """[SAMPLE DATA] Federal STEM Postgraduate Scholarship Guidelines (Academic Year 2026-2027).
Section 1: Citizenship & Legal Residency Qualifications
Applicants must be verified citizens or permanent residents of the United States. International visa holders are ineligible for this award program.

Section 2: Cumulative Academic GPA Threshold
A minimum cumulative grade point average (GPA) of 3.5 on a 4.0 scale in undergraduate STEM coursework is required for standard eligibility.

Section 3: Annual Household Income Ceiling & Financial Need Test
Total gross household annual income must not exceed $75,000 for the preceding tax year as certified by official IRS tax transcripts.

Section 4: Letters of Recommendation & Academic Endorsements
Two letters of recommendation from tenure-track academic faculty on official institutional letterhead are mandatory.

Section 5: Academic Enrollment Status
Candidates must maintain full-time degree enrollment in an accredited STEM graduate program throughout the tenure of the award."""

    s1 = Source(
        id="demo-src-1",
        session_id=session.id,
        source_type="pdf",
        title="[SAMPLE DATA] 2026 Federal STEM Scholarship Official Guidelines (PDF)",
        uri="sample_federal_stem_guidelines_2026.pdf",
        publication_date=datetime(2026, 1, 15, tzinfo=timezone.utc),
        author_or_publisher="[SAMPLE DATA] Department of Higher Education & Research",
        raw_content=s1_text,
        cleaned_content=s1_text,
    )
    db.add(s1)

    s2_text = """[SAMPLE DATA] University Financial Aid STEM Awards Overview (2026 Edition).
Chapter 4: Competitive STEM Fellowships and Institutional Cutoffs.
For the 2026 application cycle, competitive departmental allocations for the Federal STEM Scholarship require a minimum priority cutoff GPA of 3.7 due to institutional quota constraints.

Financial Need Assessment: Candidates must document family adjusted gross income below $75,000 through the university financial aid portal.

Letters of Endorsement: Two academic letters of recommendation are required from faculty familiar with the applicant's research.

Enrollment Criteria: Applicants must verify full-time graduate enrollment status in an accredited master's or doctoral STEM program."""

    s2 = Source(
        id="demo-src-2",
        session_id=session.id,
        source_type="url",
        title="[SAMPLE DATA] University Financial Aid Handbook 2026 (URL)",
        uri="https://sample-university.edu/finaid/stem-handbook-2026",
        publication_date=datetime(2026, 2, 1, tzinfo=timezone.utc),
        author_or_publisher="[SAMPLE DATA] University Student Financial Services",
        raw_content=s2_text,
        cleaned_content=s2_text,
    )
    db.add(s2)

    s3_text = """[SAMPLE DATA] National Student Assistance Circular (Archived Bulletin v2.4, August 2023).
Notice on Income Limits: Annual household income eligibility for federal graduate assistance awards is capped at $65,000.

Citizenship: All candidates must hold national citizenship and maintain satisfactory academic progress.

NOTE: This bulletin reflects fiscal year 2023 statutory regulations and has been superseded by the 2026 Federal STEM Omnibus Guidelines."""

    s3 = Source(
        id="demo-src-3",
        session_id=session.id,
        source_type="text",
        title="[SAMPLE DATA] 2023 National Student Assistance Circular (Superseded Text)",
        uri="sample_internal_bulletin_aug_2023.txt",
        publication_date=datetime(2023, 8, 1, tzinfo=timezone.utc),
        author_or_publisher="[SAMPLE DATA] National Student Assistance Bureau",
        raw_content=s3_text,
        cleaned_content=s3_text,
    )
    db.add(s3)
    db.commit()

    # -------------------------------------------------------------
    # DOCUMENT CHUNKS
    # -------------------------------------------------------------
    c1 = DocumentChunk(
        id="demo-chk-1",
        source_id=s1.id,
        chunk_index=0,
        text_content=s1_text,
        page_number=1,
        token_count=135,
    )
    c2 = DocumentChunk(
        id="demo-chk-2",
        source_id=s2.id,
        chunk_index=0,
        text_content=s2_text,
        page_number=1,
        token_count=115,
    )
    c3 = DocumentChunk(
        id="demo-chk-3",
        source_id=s3.id,
        chunk_index=0,
        text_content=s3_text,
        page_number=None,
        token_count=75,
    )
    db.add_all([c1, c2, c3])
    db.commit()

    # -------------------------------------------------------------
    # ATOMIC CLAIMS
    # -------------------------------------------------------------
    cl1 = AtomicClaim(
        id="demo-cl-1",
        chunk_id=c1.id,
        claim_text="A minimum cumulative GPA of 3.5 on a 4.0 scale in undergraduate STEM coursework is required for standard eligibility.",
        exact_quote="A minimum cumulative grade point average (GPA) of 3.5 on a 4.0 scale in undergraduate STEM coursework is required for standard eligibility.",
        claim_type="quantitative",
        date_reference="2026",
        confidence_score=0.98,
        is_verified=True,
    )
    cl2 = AtomicClaim(
        id="demo-cl-2",
        chunk_id=c2.id,
        claim_text="A minimum priority cutoff GPA of 3.7 is required for competitive departmental STEM allocation.",
        exact_quote="competitive departmental allocations for the Federal STEM Scholarship require a minimum priority cutoff GPA of 3.7 due to institutional quota constraints.",
        claim_type="quantitative",
        date_reference="2026",
        confidence_score=0.96,
        is_verified=True,
    )
    cl3 = AtomicClaim(
        id="demo-cl-3",
        chunk_id=c1.id,
        claim_text="Applicants must be verified citizens or permanent residents of the United States.",
        exact_quote="Applicants must be verified citizens or permanent residents of the United States. International visa holders are ineligible for this award program.",
        claim_type="assertion",
        date_reference="2026",
        confidence_score=0.99,
        is_verified=True,
    )
    cl4 = AtomicClaim(
        id="demo-cl-4",
        chunk_id=c1.id,
        claim_text="Total gross household annual income must not exceed $75,000 for the preceding tax year.",
        exact_quote="Total gross household annual income must not exceed $75,000 for the preceding tax year as certified by official IRS tax transcripts.",
        claim_type="quantitative",
        date_reference="2026",
        confidence_score=0.97,
        is_verified=True,
    )
    cl5 = AtomicClaim(
        id="demo-cl-5",
        chunk_id=c2.id,
        claim_text="Candidates must document family adjusted gross income below $75,000.",
        exact_quote="Candidates must document family adjusted gross income below $75,000 through the university financial aid portal.",
        claim_type="quantitative",
        date_reference="2026",
        confidence_score=0.95,
        is_verified=True,
    )
    cl6 = AtomicClaim(
        id="demo-cl-6",
        chunk_id=c3.id,
        claim_text="Annual household income eligibility for federal graduate assistance awards is capped at $65,000 (Superseded 2023 Notice).",
        exact_quote="Annual household income eligibility for federal graduate assistance awards is capped at $65,000.",
        claim_type="quantitative",
        date_reference="2023",
        confidence_score=0.94,
        is_verified=True,
    )
    cl7 = AtomicClaim(
        id="demo-cl-7",
        chunk_id=c1.id,
        claim_text="Two letters of recommendation from tenure-track academic faculty on official institutional letterhead are mandatory.",
        exact_quote="Two letters of recommendation from tenure-track academic faculty on official institutional letterhead are mandatory.",
        claim_type="assertion",
        date_reference="2026",
        confidence_score=0.98,
        is_verified=True,
    )
    cl8 = AtomicClaim(
        id="demo-cl-8",
        chunk_id=c2.id,
        claim_text="Two academic letters of recommendation are required from faculty familiar with the applicant's research.",
        exact_quote="Two academic letters of recommendation are required from faculty familiar with the applicant's research.",
        claim_type="assertion",
        date_reference="2026",
        confidence_score=0.96,
        is_verified=True,
    )
    db.add_all([cl1, cl2, cl3, cl4, cl5, cl6, cl7, cl8])
    db.commit()

    # -------------------------------------------------------------
    # 5 RESEARCH REQUIREMENTS
    # -------------------------------------------------------------
    r1 = Requirement(
        id="demo-req-1",
        session_id=session.id,
        requirement_text="[SAMPLE DATA] Cumulative Academic GPA Threshold for Eligibility",
        question="What is the minimum cumulative GPA required to be eligible for the scholarship?",
        category="academic",
        weight=2.5,
        is_decision_critical=True,
        status="conflict",
        order_index=0,
    )
    r2 = Requirement(
        id="demo-req-2",
        session_id=session.id,
        requirement_text="[SAMPLE DATA] Citizenship & Legal Residency Qualifications",
        question="Are international students eligible or is national citizenship / permanent residency required?",
        category="eligibility",
        weight=2.0,
        is_decision_critical=True,
        status="covered",
        order_index=1,
    )
    r3 = Requirement(
        id="demo-req-3",
        session_id=session.id,
        requirement_text="[SAMPLE DATA] Annual Household Income Ceiling & Financial Need Test",
        question="What is the maximum annual household income ceiling allowed for applicants?",
        category="financial",
        weight=2.0,
        is_decision_critical=True,
        status="covered",
        order_index=2,
    )
    r4 = Requirement(
        id="demo-req-4",
        session_id=session.id,
        requirement_text="[SAMPLE DATA] Letters of Academic Recommendation & Faculty Endorsements",
        question="How many letters of recommendation are required and who must author them?",
        category="documentation",
        weight=1.5,
        is_decision_critical=False,
        status="covered",
        order_index=3,
    )
    r5 = Requirement(
        id="demo-req-5",
        session_id=session.id,
        requirement_text="[SAMPLE DATA] Mandatory International Medical & Repatriation Insurance Policy",
        question="Is international emergency medical and repatriation insurance required for research travel or study abroad?",
        category="insurance",
        weight=2.0,
        is_decision_critical=True,
        status="uncovered",
        order_index=4,
    )
    db.add_all([r1, r2, r3, r4, r5])
    db.commit()

    # -------------------------------------------------------------
    # EVIDENCE LINKS
    # -------------------------------------------------------------
    el1 = EvidenceLink(
        requirement_id=r1.id,
        claim_id=cl1.id,
        relation_type="supports",
        relevance_rationale="Official guidelines specify 3.5 minimum cumulative GPA for standard consideration.",
        similarity_score=0.88,
    )
    el2 = EvidenceLink(
        requirement_id=r1.id,
        claim_id=cl2.id,
        relation_type="refutes",
        relevance_rationale="University handbook enforces a higher 3.7 priority quota cutoff for STEM allocations.",
        similarity_score=0.86,
    )
    el3 = EvidenceLink(
        requirement_id=r2.id,
        claim_id=cl3.id,
        relation_type="supports",
        relevance_rationale="Verifies requirement: US citizens and permanent residents only; visa holders ineligible.",
        similarity_score=0.95,
    )
    el4 = EvidenceLink(
        requirement_id=r3.id,
        claim_id=cl4.id,
        relation_type="supports",
        relevance_rationale="Official guidelines set $75,000 maximum gross household income ceiling.",
        similarity_score=0.92,
    )
    el5 = EvidenceLink(
        requirement_id=r3.id,
        claim_id=cl5.id,
        relation_type="supports",
        relevance_rationale="University handbook corroborates the $75,000 income ceiling test.",
        similarity_score=0.90,
    )
    el6 = EvidenceLink(
        requirement_id=r4.id,
        claim_id=cl7.id,
        relation_type="supports",
        relevance_rationale="Official guidelines mandate two tenure-track faculty recommendation letters.",
        similarity_score=0.94,
    )
    el7 = EvidenceLink(
        requirement_id=r4.id,
        claim_id=cl8.id,
        relation_type="supports",
        relevance_rationale="University guidelines confirm two recommendation letters from faculty.",
        similarity_score=0.91,
    )
    db.add_all([el1, el2, el3, el4, el5, el6, el7])

    # -------------------------------------------------------------
    # CONTRADICTION INTELLIGENCE
    # -------------------------------------------------------------
    scope_comp = {
        "subject": "Cumulative Academic GPA Eligibility Threshold",
        "category": "academic",
        "geographic_scope_a": "National (United States)",
        "geographic_scope_b": "University Departmental Quota",
        "applicant_category_a": "STEM Postgraduate Applicants",
        "applicant_category_b": "STEM Postgraduate Applicants",
        "academic_year_a": "2026-2027",
        "academic_year_b": "2026-2027",
        "application_cycle_a": "2026 General Cycle",
        "application_cycle_b": "2026 Departmental Allocation",
        "numerical_value_a": "3.5",
        "numerical_value_b": "3.7",
        "unit_a": "GPA (4.0 scale)",
        "unit_b": "GPA (4.0 scale)",
        "conditions_a": "Standard national statutory eligibility",
        "conditions_b": "Competitive departmental priority quota allocation",
        "scope_alignment": "aligned",
        "divergence_reasons": []
    }
    ct1 = Contradiction(
        id="demo-conf-1",
        session_id=session.id,
        requirement_id=r1.id,
        claim_a_id=cl1.id,
        claim_b_id=cl2.id,
        severity="high",
        is_genuine=True,
        conflict_type="numerical_threshold_divergence",
        conflicting_aspect="[SAMPLE DATA] Cumulative GPA Eligibility Cutoff (3.5 Standard vs 3.7 Departmental Priority)",
        synthesis_verdict="Official federal guidelines cite a 3.5 GPA threshold, whereas the university handbook specifies a higher 3.7 cutoff for competitive departmental nomination in 2026.",
        explanation="Both documents govern the 2026 STEM scholarship cycle, but specify contradictory GPA thresholds. A candidate with a 3.6 GPA meets the national baseline (3.5) but would be disqualified by the departmental screening committee (3.7).",
        recommended_action="Contact the Graduate Financial Aid Director to verify whether the 3.7 cutoff is an absolute filter or merely a preferred priority threshold.",
        scope_comparison_json=json.dumps(scope_comp)
    )
    db.add(ct1)

    # -------------------------------------------------------------
    # 5 GAP FINDINGS (Covered, Missing, Conflict, Outdated)
    # -------------------------------------------------------------
    gf1 = GapFinding(
        id="demo-gf-1",
        session_id=session.id,
        requirement_id=r5.id,
        finding_type="MISSING",
        explanation="[SAMPLE DATA] Zero evidence was discovered in any of the reviewed sources regarding mandatory international health, emergency medical, or repatriation insurance coverage for study abroad or research travel.",
        supporting_claim_ids=json.dumps([]),
        source_ids=json.dumps([]),
        evidence_references=json.dumps([]),
        confidence=0.96,
        priority="critical",
        recommended_action="Inquire directly with the Federal Scholarship Program Office prior to international travel or foreign research.",
        limitations="Total evidentiary silence across all ingested guidelines.",
    )
    gf2 = GapFinding(
        id="demo-gf-2",
        session_id=session.id,
        requirement_id=r1.id,
        finding_type="POTENTIAL CONFLICT",
        explanation="[SAMPLE DATA] Evidentiary conflict detected between Source 1 (specifying 3.5 minimum GPA) and Source 2 (specifying 3.7 priority quota GPA for the 2026 academic cycle).",
        supporting_claim_ids=json.dumps([cl1.id, cl2.id]),
        source_ids=json.dumps([s1.id, s2.id]),
        evidence_references=json.dumps([
            {
                "claim_id": cl1.id,
                "claim_text": cl1.claim_text,
                "exact_quote": cl1.exact_quote,
                "source_id": s1.id,
                "source_title": s1.title,
                "source_type": s1.source_type,
                "page_number": 1,
                "confidence": 0.98,
            },
            {
                "claim_id": cl2.id,
                "claim_text": cl2.claim_text,
                "exact_quote": cl2.exact_quote,
                "source_id": s2.id,
                "source_title": s2.title,
                "source_type": s2.source_type,
                "confidence": 0.96,
            },
        ]),
        confidence=0.94,
        priority="high",
        recommended_action="Reconcile departmental GPA expectations with the graduate advisor.",
        limitations="Conflict between national statutory baseline and university internal allocation quota.",
    )
    gf3 = GapFinding(
        id="demo-gf-3",
        session_id=session.id,
        requirement_id=r3.id,
        finding_type="POTENTIALLY OUTDATED",
        explanation="[SAMPLE DATA] Source 3 cites a $65,000 household income limit from an August 2023 circular, but both 2026 sources specify an updated $75,000 ceiling under current omnibus guidelines.",
        supporting_claim_ids=json.dumps([cl4.id, cl5.id, cl6.id]),
        source_ids=json.dumps([s1.id, s2.id, s3.id]),
        evidence_references=json.dumps([
            {
                "claim_id": cl4.id,
                "claim_text": cl4.claim_text,
                "exact_quote": cl4.exact_quote,
                "source_id": s1.id,
                "source_title": s1.title,
                "confidence": 0.97,
            },
            {
                "claim_id": cl6.id,
                "claim_text": cl6.claim_text,
                "exact_quote": cl6.exact_quote,
                "source_id": s3.id,
                "source_title": s3.title,
                "confidence": 0.94,
            },
        ]),
        confidence=0.91,
        priority="medium",
        recommended_action="Disregard the 2023 bulletin; confirm income eligibility against current 2026 tax transcript guidelines ($75,000).",
        limitations="2023 circular is an archived bulletin superseded by 2026 regulations.",
    )
    gf4 = GapFinding(
        id="demo-gf-4",
        session_id=session.id,
        requirement_id=r2.id,
        finding_type="COVERED",
        explanation="[SAMPLE DATA] Requirement is fully verified. Applicants must be verified US citizens or permanent residents; foreign student visa holders are explicitly ineligible.",
        supporting_claim_ids=json.dumps([cl3.id]),
        source_ids=json.dumps([s1.id]),
        evidence_references=json.dumps([
            {
                "claim_id": cl3.id,
                "claim_text": cl3.claim_text,
                "exact_quote": cl3.exact_quote,
                "source_id": s1.id,
                "source_title": s1.title,
                "confidence": 0.99,
            }
        ]),
        confidence=0.99,
        priority="low",
        recommended_action="Prepare government-issued passport or permanent resident card for verification.",
        limitations="None; requirement verified across multiple official sources.",
    )
    gf5 = GapFinding(
        id="demo-gf-5",
        session_id=session.id,
        requirement_id=r4.id,
        finding_type="COVERED",
        explanation="[SAMPLE DATA] Fully verified across Sources 1 & 2. Two letters of academic recommendation on official institutional letterhead from faculty are mandatory.",
        supporting_claim_ids=json.dumps([cl7.id, cl8.id]),
        source_ids=json.dumps([s1.id, s2.id]),
        evidence_references=json.dumps([
            {
                "claim_id": cl7.id,
                "claim_text": cl7.claim_text,
                "exact_quote": cl7.exact_quote,
                "source_id": s1.id,
                "source_title": s1.title,
                "confidence": 0.98,
            }
        ]),
        confidence=0.97,
        priority="low",
        recommended_action="Solicit faculty recommendation letters at least 4 weeks prior to the application deadline.",
        limitations="Letters must be authored by academic faculty familiar with research.",
    )
    db.add_all([gf1, gf2, gf3, gf4, gf5])

    # -------------------------------------------------------------
    # 3 BLINDSPOT QUESTIONS
    # -------------------------------------------------------------
    b1 = BlindSpot(
        id="demo-bs-1",
        session_id=session.id,
        question="[SAMPLE DATA] What happens to scholarship disbursement if the recipient transfers universities or changes STEM majors mid-year?",
        rationale="Most government and institutional scholarships terminate funding or require formal petition upon changing institutions or transferring outside approved STEM degree programs.",
        risk_level="high",
        category="transferability_risk",
        is_resolved=False,
    )
    b2 = BlindSpot(
        id="demo-bs-2",
        session_id=session.id,
        question="[SAMPLE DATA] Can provisional transcripts or missing letters of recommendation be submitted during a post-deadline grace period?",
        rationale="Strict disqualification rules frequently apply unless an official 14-day cure window is documented for delayed institutional transcripts.",
        risk_level="high",
        category="grace_period_policy",
        is_resolved=False,
    )
    b3 = BlindSpot(
        id="demo-bs-3",
        session_id=session.id,
        question="[SAMPLE DATA] Are recipients permitted to hold concurrent private or institutional fellowships, or is there an anti-stacking clause?",
        rationale="Federal scholarship rules commonly enforce anti-stacking limits that claw back stipends if external grant awards exceed the official cost of attendance.",
        risk_level="medium",
        category="anti_stacking_restrictions",
        is_resolved=True,
    )
    db.add_all([b1, b2, b3])

    # -------------------------------------------------------------
    # VERIFICATION CHECKLIST TASKS
    # -------------------------------------------------------------
    vt1 = VerificationTask(
        id="demo-vt-1",
        session_id=session.id,
        task_type="investigate_conflicting_claims",
        title="[SAMPLE DATA] Reconcile 3.5 vs 3.7 Academic GPA Threshold with Department Chair",
        description="Official guidelines state 3.5 GPA while university handbook states 3.7 priority quota. Confirm whether 3.5 candidates remain eligible for departmental nomination.",
        priority="critical",
        related_requirement_id=r1.id,
        related_requirement_text=r1.requirement_text,
        related_finding_id=gf2.id,
        recommended_action="Contact the Graduate Financial Aid Director to confirm cutoff rules for 2026.",
        evidence_references_json=json.dumps([
            {
                "source_title": s1.title,
                "exact_quote": cl1.exact_quote,
                "page_number": 1,
                "source_id": s1.id,
                "confidence": 0.98,
            },
            {
                "source_title": s2.title,
                "exact_quote": cl2.exact_quote,
                "source_id": s2.id,
                "confidence": 0.96,
            },
        ]),
        is_completed=False,
    )
    vt2 = VerificationTask(
        id="demo-vt-2",
        session_id=session.id,
        task_type="verify_missing_information",
        title="[SAMPLE DATA] Confirm if International Medical & Repatriation Insurance is Mandatory for Research Travel",
        description="No evidence was found regarding whether international travel insurance is required or provided under the scholarship.",
        priority="critical",
        related_requirement_id=r5.id,
        related_requirement_text=r5.requirement_text,
        related_finding_id=gf1.id,
        recommended_action="Inquire directly with the Federal Scholarship Program Office.",
        evidence_references_json=json.dumps([]),
        is_completed=False,
    )
    vt3 = VerificationTask(
        id="demo-vt-3",
        session_id=session.id,
        task_type="check_outdated_information",
        title="[SAMPLE DATA] Verify Supercession of August 2023 Circular ($65k vs $75k Income Ceiling)",
        description="Confirm that the $65,000 threshold in the 2023 circular has been superseded by the current 2026 limit of $75,000.",
        priority="medium",
        related_requirement_id=r3.id,
        related_requirement_text=r3.requirement_text,
        related_finding_id=gf3.id,
        recommended_action="Confirm income eligibility using 2026 official IRS tax transcript guidance.",
        evidence_references_json=json.dumps([
            {
                "source_title": s3.title,
                "exact_quote": cl6.exact_quote,
                "source_id": s3.id,
                "confidence": 0.94,
            }
        ]),
        is_completed=True,
    )
    vt4 = VerificationTask(
        id="demo-vt-4",
        session_id=session.id,
        task_type="custom",
        title="[SAMPLE DATA] Validate BlindSpot: Clarify Mid-Year College & Major Transferability Clause",
        description="Investigate whether transferring institutions or changing degree tracks forfeits remaining scholarship disbursements.",
        priority="high",
        recommended_action="Review program regulations regarding institution transfer protocols.",
        is_completed=False,
    )
    vt5 = VerificationTask(
        id="demo-vt-5",
        session_id=session.id,
        task_type="custom",
        title="[SAMPLE DATA] Validate BlindSpot: Inquire about Provisional Transcript Grace Period",
        description="Check whether a 14-day post-deadline grace period exists for faculty submitting recommendation letters.",
        priority="medium",
        recommended_action="Contact the scholarship submission portal helpdesk.",
        is_completed=False,
    )
    db.add_all([vt1, vt2, vt3, vt4, vt5])
    db.commit()

    return session.id
