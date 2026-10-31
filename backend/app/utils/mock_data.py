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
)
from app.utils.chunker import chunk_text_with_provenance


def seed_demo_investigation(db: Session) -> str:
    """
    Seeds a rich, realistic enterprise demo investigation for immediate review.
    """
    session = ResearchSession(
        title="Serverless vs Kubernetes (EKS) Migration Audit",
        research_goal="Evaluate latency SLAs, burst scaling limits, data egress costs, and security compliance for migrating our real-time payment ingestion pipeline.",
        target_decision="Final architectural decision for Q3 production cloud migration.",
        status="completed",
        readiness_score=71.5,
        coverage_score=80.0,
        consistency_score=65.0,
        freshness_score=85.0,
        verification_score=95.0,
        executive_verdict="Conditional Proceed: 2 Critical Contradictions in Latency & TCO, 4 Unaddressed Blindspots.",
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    # Source 1: Vendor Whitepaper
    s1_text = """AWS Serverless Enterprise Architecture Guide (2024).
Provisioned concurrency and SnapStart guarantee sub-15ms P99 initialization latency across all standard microservice payloads.
Total cost of ownership demonstrates an average 60% reduction compared to provisioned Kubernetes EC2 nodes by eliminating idle cluster waste.
Automated multi-AZ regional redundancy provides 99.99% availability out of the box without manual container scheduling."""
    s1 = Source(
        session_id=session.id,
        source_type="pdf",
        title="AWS Serverless Architecture Guide 2024.pdf",
        uri="AWS_Serverless_Guide_2024.pdf",
        publication_date=datetime.now(timezone.utc) - timedelta(days=90),
        author_or_publisher="AWS Enterprise Architecture",
        raw_content=s1_text,
        cleaned_content=s1_text,
    )
    db.add(s1)

    # Source 2: Independent Benchmark Report
    s2_text = """Independent Production Benchmark: Real-Time Streaming Under Sustained Load (2024).
Empirical benchmarks at 15,000 sustained requests per second revealed P99 latency degraded to 145ms due to account-level concurrency throttling limits.
Secondary network transit and CloudWatch log ingestion charges added $14,200 per month, completely wiping out the estimated 60% compute savings.
Cold starts still impacted 1.8% of invocations during sudden traffic surges."""
    s2 = Source(
        session_id=session.id,
        source_type="url",
        title="HighScale Benchmark: Serverless vs Kubernetes 2024",
        uri="https://benchmark.tech/serverless-vs-k8s-2024",
        publication_date=datetime.now(timezone.utc) - timedelta(days=60),
        author_or_publisher="HighScale Engineering",
        raw_content=s2_text,
        cleaned_content=s2_text,
    )
    db.add(s2)

    # Source 3: Internal Security & Compliance
    s3_text = """Financial Telemetry and Data Protection Standards (2023).
All outbound settlement traffic must originate from static, dedicated NAT gateway IP addresses registered with banking counterparties.
Dynamic IP pooling without static egress proxies is strictly prohibited by banking regulatory compliance framework."""
    s3 = Source(
        session_id=session.id,
        source_type="text",
        title="Enterprise Banking Compliance Policy",
        uri="Internal Document",
        publication_date=datetime.now(timezone.utc) - timedelta(days=400),
        author_or_publisher="Information Security Office",
        raw_content=s3_text,
        cleaned_content=s3_text,
    )
    db.add(s3)
    db.commit()

    # Chunks & Claims for S1
    c1 = DocumentChunk(source_id=s1.id, chunk_index=0, text_content=s1_text, page_number=1, token_count=65)
    db.add(c1)
    db.commit()
    cl1 = AtomicClaim(
        chunk_id=c1.id,
        claim_text="Sub-15ms P99 initialization latency guaranteed with SnapStart.",
        exact_quote="guarantee sub-15ms P99 initialization latency across all standard microservice payloads.",
        claim_type="quantitative",
        date_reference="2024",
        confidence_score=0.98,
        is_verified=True,
    )
    cl2 = AtomicClaim(
        chunk_id=c1.id,
        claim_text="TCO reduced by 60% compared to provisioned Kubernetes clusters.",
        exact_quote="average 60% reduction compared to provisioned Kubernetes EC2 nodes by eliminating idle cluster waste.",
        claim_type="quantitative",
        date_reference="2024",
        confidence_score=0.95,
        is_verified=True,
    )
    db.add_all([cl1, cl2])

    # Chunks & Claims for S2
    c2 = DocumentChunk(source_id=s2.id, chunk_index=0, text_content=s2_text, page_number=None, token_count=72)
    db.add(c2)
    db.commit()
    cl3 = AtomicClaim(
        chunk_id=c2.id,
        claim_text="P99 latency degraded to 145ms under sustained 15,000 req/sec load.",
        exact_quote="sustained requests per second revealed P99 latency degraded to 145ms due to account-level concurrency throttling limits.",
        claim_type="quantitative",
        date_reference="2024",
        confidence_score=0.96,
        is_verified=True,
    )
    cl4 = AtomicClaim(
        chunk_id=c2.id,
        claim_text="Secondary egress and logging costs added $14,200/mo exceeding compute savings.",
        exact_quote="transit and CloudWatch log ingestion charges added $14,200 per month, completely wiping out the estimated 60% compute savings.",
        claim_type="quantitative",
        date_reference="2024",
        confidence_score=0.97,
        is_verified=True,
    )
    db.add_all([cl3, cl4])

    # Chunks & Claims for S3
    c3 = DocumentChunk(source_id=s3.id, chunk_index=0, text_content=s3_text, page_number=None, token_count=45)
    db.add(c3)
    db.commit()
    cl5 = AtomicClaim(
        chunk_id=c3.id,
        claim_text="Outbound settlement traffic requires static dedicated IP addresses.",
        exact_quote="traffic must originate from static, dedicated NAT gateway IP addresses registered with banking counterparties.",
        claim_type="assertion",
        date_reference="2023",
        confidence_score=0.99,
        is_verified=True,
    )
    db.add(cl5)
    db.commit()

    # Requirements
    r1 = Requirement(session_id=session.id, requirement_text="Maximum P99 latency SLA must remain under 25ms under production load", category="performance", weight=2.5, status="conflict", order_index=0)
    r2 = Requirement(session_id=session.id, requirement_text="Total operational cost including network egress must be lower than current EKS baseline", category="cost", weight=2.0, status="conflict", order_index=1)
    r3 = Requirement(session_id=session.id, requirement_text="Static outbound IP whitelisting for banking counterparty compliance", category="security", weight=2.5, status="covered", order_index=2)
    r4 = Requirement(session_id=session.id, requirement_text="Disaster recovery cross-region failover automation under 5 minutes", category="architecture", weight=1.5, status="uncovered", order_index=3)
    db.add_all([r1, r2, r3, r4])
    db.commit()

    # Evidence Links
    el1 = EvidenceLink(requirement_id=r1.id, claim_id=cl1.id, relation_type="supports", relevance_rationale="Vendor asserts sub-15ms P99 latency with SnapStart.", similarity_score=0.88)
    el2 = EvidenceLink(requirement_id=r1.id, claim_id=cl3.id, relation_type="refutes", relevance_rationale="Independent tests show 145ms P99 under burst load violating 25ms SLA.", similarity_score=0.85)
    el3 = EvidenceLink(requirement_id=r2.id, claim_id=cl2.id, relation_type="supports", relevance_rationale="Vendor claims 60% compute savings.", similarity_score=0.79)
    el4 = EvidenceLink(requirement_id=r2.id, claim_id=cl4.id, relation_type="refutes", relevance_rationale="Egress and logging fees offset compute savings.", similarity_score=0.84)
    el5 = EvidenceLink(requirement_id=r3.id, claim_id=cl5.id, relation_type="supports", relevance_rationale="Compliance policy dictates static outbound IP requirement.", similarity_score=0.91)
    db.add_all([el1, el2, el3, el4, el5])

    # Contradictions
    scope_comp_1 = {
        "subject": "Maximum P99 latency SLA",
        "category": "performance",
        "geographic_scope_a": "AWS us-east-1",
        "geographic_scope_b": "AWS us-east-1",
        "applicant_category_a": "Payment Ingestion Service",
        "applicant_category_b": "Payment Ingestion Service",
        "academic_year_a": "2024",
        "academic_year_b": "2024",
        "application_cycle_a": "Production Benchmark",
        "application_cycle_b": "Production Benchmark",
        "numerical_value_a": "15",
        "numerical_value_b": "145",
        "unit_a": "ms",
        "unit_b": "ms",
        "conditions_a": "SnapStart enabled with provisioned concurrency",
        "conditions_b": "Burst traffic load exceeding 15,000 req/sec",
        "scope_alignment": "aligned",
        "divergence_reasons": []
    }
    ct1 = Contradiction(
        session_id=session.id,
        requirement_id=r1.id,
        claim_a_id=cl1.id,
        claim_b_id=cl3.id,
        severity="high",
        is_genuine=True,
        conflict_type="numerical_threshold_divergence",
        conflicting_aspect="P99 Latency SLA under High Concurrency (15ms Vendor claim vs 145ms Benchmark empirical)",
        synthesis_verdict="Vendor benchmark measures cold-start initialization in isolation, whereas the empirical load test surfaces account concurrency pool limits at 15k req/sec.",
        explanation="Both documents evaluate AWS serverless latency for payment ingestion in 2024, but report diametrically opposed P99 latencies (15ms vs 145ms).",
        recommended_action="Execute dedicated shadow load testing on pre-production account to measure real P99 latency with SnapStart under 15k req/sec.",
        scope_comparison_json=json.dumps(scope_comp_1)
    )

    scope_comp_2 = {
        "subject": "Net Operational Cost & TCO",
        "category": "cost",
        "geographic_scope_a": "Multi-AZ Enterprise",
        "geographic_scope_b": "Multi-AZ Enterprise",
        "applicant_category_a": "Cloud Migration",
        "applicant_category_b": "Cloud Migration",
        "academic_year_a": "2024",
        "academic_year_b": "2024",
        "application_cycle_a": "Enterprise Architecture",
        "application_cycle_b": "Enterprise Architecture",
        "numerical_value_a": "60",
        "numerical_value_b": "14200",
        "unit_a": "%",
        "unit_b": "USD",
        "conditions_a": "Idle EC2 compute elimination",
        "conditions_b": "High-volume NAT gateway egress and CloudWatch logs",
        "scope_alignment": "aligned",
        "divergence_reasons": []
    }
    ct2 = Contradiction(
        session_id=session.id,
        requirement_id=r2.id,
        claim_a_id=cl2.id,
        claim_b_id=cl4.id,
        severity="high",
        is_genuine=True,
        conflict_type="numerical_threshold_divergence",
        conflicting_aspect="Net Total Cost of Ownership (60% Savings vs $14,200/mo Auxiliary Transit/Log Fees)",
        synthesis_verdict="The vendor calculation accounts only for idle compute hours and excludes egress data transfer and CloudWatch ingestion volume.",
        explanation="Vendor whitepaper projects a 60% compute cost reduction, whereas empirical production audit proves auxiliary VPC NAT gateway and CloudWatch fees ($14,200/mo) nullify savings.",
        recommended_action="Model complete VPC endpoint routing and CloudWatch log filter subscriptions to quantify true net monthly delta.",
        scope_comparison_json=json.dumps(scope_comp_2)
    )
    db.add_all([ct1, ct2])

    # BlindSpots
    b1 = BlindSpot(
        session_id=session.id,
        question="What is the architectural rollback strategy if concurrency throttle limits cause transaction drop in production?",
        rationale="Lambda concurrency limit adjustments require AWS support intervention that cannot be scaled dynamically in under 4 hours.",
        risk_level="high",
        category="rollback_risk",
        is_resolved=False,
    )
    b2 = BlindSpot(
        session_id=session.id,
        question="What are the monthly VPC NAT Gateway hourly and data processing charges for routing high-volume traffic through static IPs?",
        rationale="NAT Gateway data processing charges ($0.045/GB) often exceed compute fees for streaming payloads.",
        risk_level="high",
        category="cost_hidden",
        is_resolved=False,
    )
    b3 = BlindSpot(
        session_id=session.id,
        question="How does local developer debugging work without mocking 12 distributed serverless cloud services?",
        rationale="Development cycle times can drop 3x if engineers cannot run integration tests locally.",
        risk_level="medium",
        category="operational",
        is_resolved=True,
    )
    db.add_all([b1, b2, b3])
    db.commit()

    return session.id
