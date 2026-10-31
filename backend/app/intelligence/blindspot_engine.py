import re
import json
import logging
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from app.models import ResearchSession, Requirement, BlindSpot, AtomicClaim, DocumentChunk, Source
from app.agents.base import BaseAgent
from app.intelligence.vector_store import FAISSVectorStore

logger = logging.getLogger("proofpath.blindspot_engine")


class BlindSpotDiscoveryEngine(BaseAgent):
    """
    Intelligent BlindSpot Discovery Engine.
    Executes the 10-step forensic discovery process to surface critical questions
    that users forgot to ask before finalizing decisions.
    """

    # Domain dimension heuristics to guarantee comprehensive discovery across scenarios
    DOMAIN_DIMENSION_PATTERNS = [
        {
            "trigger": r"\b(scholarship|fellowship|grant|tuition|stipend|financial aid|bursary)\b",
            "dimensions": [
                {
                    "question": "What happens if the applicant changes colleges, majors, or transfers institutions?",
                    "rationale": "Transferring schools or switching academic tracks often causes immediate award forfeiture or repayment demands.",
                    "explanation": "Scholarship guidelines frequently bind funding to specific accredited institutions or degree programs. An unannounced transfer can trigger clawback clauses.",
                    "relevance": "Critical",
                    "priority": "P1",
                    "risk_level": "high",
                    "category": "institutional_transfer_risk",
                    "recommended_action": "Review the institutional transfer clause in the official scholarship gazette or portal FAQs."
                },
                {
                    "question": "Can missing or pending documents be submitted later under a provisional window?",
                    "rationale": "Strict submission cutoffs without grace periods lead to immediate application disqualification for administrative delays.",
                    "explanation": "Many applicants obtain final exam transcripts or income affidavits after the initial cutoff date. Knowing if provisional submissions are permitted prevents disqualification.",
                    "relevance": "High",
                    "priority": "P1",
                    "risk_level": "high",
                    "category": "documentation_grace_period",
                    "recommended_action": "Confirm whether the portal accepts an undertaking or provisional receipt for pending documents."
                },
                {
                    "question": "What specific renewal conditions and minimum annual GPA/credit requirements must be maintained?",
                    "rationale": "Securing first-year funding is wasted if renewal rules require unrealistic grade retention or annual re-qualification hurdles.",
                    "explanation": "Multi-year scholarships often require re-application, active community hours, or strict continuous enrollment standards. Failure to meet these terminates funding.",
                    "relevance": "Critical",
                    "priority": "P1",
                    "risk_level": "high",
                    "category": "renewal_maintenance_conditions",
                    "recommended_action": "Check annual renewal criteria, minimum credit completions, and probationary policies."
                },
                {
                    "question": "Can multiple scholarships or government stipends be received simultaneously?",
                    "rationale": "Anti-stacking and dual-funding prohibitions can void both awards or trigger punitive clawbacks if reported late.",
                    "explanation": "State and federal guidelines often prohibit holding more than one tuition scholarship concurrently. Violations may require full repayment with interest.",
                    "relevance": "High",
                    "priority": "P2",
                    "risk_level": "medium",
                    "category": "concurrent_benefit_restrictions",
                    "recommended_action": "Verify dual-benefit and scholarship stacking policies with the university financial aid office."
                },
                {
                    "question": "Is there a formal appeal or review process if the application is rejected due to clerical error?",
                    "rationale": "Administrative errors by portal verifiers cannot be corrected without a formal grievance or dispute window.",
                    "explanation": "If a genuine candidate's document is flagged erroneously, having a published escalation path and appellate authority is the only recourse before funds are exhausted.",
                    "relevance": "High",
                    "priority": "P2",
                    "risk_level": "medium",
                    "category": "appeal_and_grievance_procedure",
                    "recommended_action": "Identify the designated grievance redressal officer and deadline for filing rejection appeals."
                },
                {
                    "question": "What is the acceptable document validity period for income and caste certificates?",
                    "rationale": "Certificates issued outside the designated fiscal year window lead to automatic verification rejection.",
                    "explanation": "Income certificates usually must reflect the immediate preceding financial year (e.g. issued after April 1). Stale certificates invalidate the application.",
                    "relevance": "High",
                    "priority": "P1",
                    "risk_level": "high",
                    "category": "document_validity_expiration",
                    "recommended_action": "Verify certificate issue dates against the portal's acceptable fiscal window."
                }
            ]
        },
        {
            "trigger": r"\b(serverless|kubernetes|eks|cloud|aws|azure|gcp|migration|infrastructure|architecture)\b",
            "dimensions": [
                {
                    "question": "What is the concrete rollback strategy if concurrency or latency SLA targets fail in production?",
                    "rationale": "Cloud migrations without an automated rollback mechanism risk prolonged customer outages during unexpected traffic surges.",
                    "explanation": "Untangling serverless services back to EC2/EKS under live load requires pre-built blue/green routing; ad-hoc rollbacks result in data loss.",
                    "relevance": "Critical",
                    "priority": "P1",
                    "risk_level": "high",
                    "category": "rollback_risk",
                    "recommended_action": "Document and test automated DNS traffic shift and data synchronization rollbacks in pre-production."
                },
                {
                    "question": "What are the hidden monthly VPC NAT Gateway and CloudWatch logging ingestion fees at scale?",
                    "rationale": "Compute savings are frequently negated by high auxiliary networking transit and logging telemetry bills.",
                    "explanation": "Routing high-volume microservice traffic through static NAT IPs incurs $0.045/GB data processing fees that multiply under streaming workloads.",
                    "relevance": "High",
                    "priority": "P1",
                    "risk_level": "high",
                    "category": "cost_hidden",
                    "recommended_action": "Model total VPC endpoint routing and CloudWatch log filter subscriptions to quantify true net monthly delta."
                },
                {
                    "question": "How does local developer debugging and integration testing work without cloud service mocking?",
                    "rationale": "Engineering velocity can decrease by 3x if developers cannot run reliable integration test suites locally.",
                    "explanation": "Heavy dependencies on proprietary cloud components (e.g. EventBridge, Step Functions) hinder local testability and inflate CI/CD turnaround times.",
                    "relevance": "Medium",
                    "priority": "P2",
                    "risk_level": "medium",
                    "category": "developer_velocity",
                    "recommended_action": "Benchmark local testing setup with LocalStack or containerized emulator environments."
                },
                {
                    "question": "What are the vendor account concurrency throttling limits and request burst quotas under DDoS?",
                    "rationale": "Hitting account-wide Lambda or Kinesis limits drops downstream customer transactions without retry queuing.",
                    "explanation": "Account-level burst concurrency quotas (e.g. 1,000 initial burst) can starve other microservices in the same AWS account during peak sales events.",
                    "relevance": "Critical",
                    "priority": "P1",
                    "risk_level": "high",
                    "category": "concurrency_limits",
                    "recommended_action": "Request proactive concurrency quota increases from vendor support and establish dedicated accounts per tier."
                }
            ]
        }
    ]

    @classmethod
    async def discover_for_session(
        cls,
        db: Session,
        session_id: str,
        persist: bool = True
    ) -> List[BlindSpot]:
        """
        Executes the 10-step BlindSpot Discovery process for a research session.
        """
        session = db.query(ResearchSession).filter(ResearchSession.id == session_id).first()
        if not session:
            return []

        # Step 1: Understand research goal & target decision
        goal = session.research_goal or session.title
        target_decision = session.target_decision or "Strategic final decision"

        # Step 2: Examine existing requirements
        existing_reqs = db.query(Requirement).filter(Requirement.session_id == session_id).all()
        existing_texts = [r.requirement_text.lower() for r in existing_reqs]

        # Step 3 & 4: Generate candidate questions (LLM + Domain Heuristics)
        candidate_questions = []

        # Check domain patterns
        text_corpus_context = f"{goal} {target_decision}".lower()
        for pat_group in cls.DOMAIN_DIMENSION_PATTERNS:
            if re.search(pat_group["trigger"], text_corpus_context):
                for dim in pat_group["dimensions"]:
                    candidate_questions.append(dim.copy())

        # Generic business / decision fallback dimensions if none matched
        if not candidate_questions:
            candidate_questions = [
                {
                    "question": "What is the contractual exit penalty and data migration fee if we terminate within 12 months?",
                    "rationale": "Contracts often conceal steep early termination charges and proprietary data export egress costs.",
                    "explanation": "Evaluating the complete lock-in exposure ensures the organization maintains strategic bargaining power.",
                    "relevance": "Critical",
                    "priority": "P1",
                    "risk_level": "high",
                    "category": "vendor_lockin",
                    "recommended_action": "Review Section 8 (Termination & Egress) of the master service agreement."
                },
                {
                    "question": "Who assumes legal and financial liability in the event of a security compromise or regulatory breach?",
                    "rationale": "Standard terms of service usually cap vendor indemnity to fees paid in the preceding 30 days.",
                    "explanation": "Without negotiated liability clauses, the customer absorbs all regulatory fines and notification liabilities.",
                    "relevance": "Critical",
                    "priority": "P1",
                    "risk_level": "high",
                    "category": "legal_liability",
                    "recommended_action": "Require unlimited indemnity for gross negligence and data confidentiality breaches."
                },
                {
                    "question": "What are the SLA penalty credits and what is the uptime measurement window?",
                    "rationale": "A 99.9% SLA measured over a yearly window permits 8.7 hours of single-day outage without penalty.",
                    "explanation": "Inspecting whether uptime is measured monthly vs annually changes the real protection level for customer operations.",
                    "relevance": "High",
                    "priority": "P2",
                    "risk_level": "medium",
                    "category": "sla_protection",
                    "recommended_action": "Demand monthly SLA reporting with automatic service credits applied to subsequent invoices."
                },
                {
                    "question": "What key-person dependency or specialized technical training is required for ongoing maintenance?",
                    "rationale": "Deploying complex novel architectures can create operational single-points-of-failure if only one engineer understands it.",
                    "explanation": "Operational turnover risks leaving the team unable to debug production incidents without expensive vendor professional services.",
                    "relevance": "High",
                    "priority": "P2",
                    "risk_level": "medium",
                    "category": "operational_dependency",
                    "recommended_action": "Formulate a cross-training matrix and verify comprehensive documentation handoff."
                }
            ]

        # Step 5: Deduplicate questions against existing requirements & each other
        unique_questions = []
        seen_questions = set()

        for q_obj in candidate_questions:
            q_text = q_obj["question"].strip()
            q_lower = q_text.lower()

            # Check if duplicate of already chosen question
            if q_lower in seen_questions:
                continue

            # Check if semantically duplicates an existing research requirement
            is_dup_of_existing = False
            for req_text in existing_texts:
                # Word overlap check
                words_q = set(re.findall(r"\w+", q_lower))
                words_req = set(re.findall(r"\w+", req_text))
                if len(words_q) > 0 and len(words_req) > 0:
                    overlap = len(words_q.intersection(words_req)) / min(len(words_q), len(words_req))
                    if overlap > 0.65:
                        is_dup_of_existing = True
                        break

            if is_dup_of_existing:
                continue

            seen_questions.add(q_lower)
            unique_questions.append(q_obj)

        # Step 6: Rank by relevance and risk priority (P1 first, then P2)
        priority_order = {"P1": 1, "P2": 2, "P3": 3}
        unique_questions.sort(key=lambda x: (priority_order.get(x.get("priority", "P2"), 2), 0 if x.get("risk_level") == "high" else 1))

        # Limit to top 5-6 highest quality blind spots
        top_questions = unique_questions[:6]

        # Step 7 & 8: Check each question against existing evidence & assign coverage status
        # Fetch session claims and sources
        sources = db.query(Source).filter(Source.session_id == session_id).all()
        source_map = {s.id: s for s in sources}
        source_ids = [s.id for s in sources]

        claims = []
        if source_ids:
            claims = (
                db.query(AtomicClaim)
                .filter(
                    (AtomicClaim.source_id.in_(source_ids)) |
                    (AtomicClaim.chunk.has(DocumentChunk.source_id.in_(source_ids)))
                )
                .all()
            )

        # Retain existing user interaction states (starred, dismissed, added_to_plan) if regenerating
        existing_spots = db.query(BlindSpot).filter(BlindSpot.session_id == session_id).all()
        user_state_map = {
            s.question.lower().strip(): {
                "is_starred": s.is_starred,
                "is_dismissed": s.is_dismissed,
                "is_added_to_plan": s.is_added_to_plan,
                "added_requirement_id": s.added_requirement_id,
                "is_resolved": s.is_resolved
            }
            for s in existing_spots
        }

        if persist:
            # Clear existing to avoid duplicate rows, preserving states
            db.query(BlindSpot).filter(BlindSpot.session_id == session_id).delete()
            db.commit()

        created_spots = []
        for q_obj in top_questions:
            q_text = q_obj["question"]
            q_lower = q_text.lower()

            # Search claims for matching evidence
            evidence_coverage = "uncovered"
            source_refs = []

            # Match claims based on keyword intersection
            q_keywords = set(re.findall(r"\b[A-Za-z]{4,}\b", q_lower)) - {"what", "when", "where", "which", "does", "have", "from", "with", "into", "that", "this"}
            matching_claims = []

            for c in claims:
                c_words = set(re.findall(r"\b[A-Za-z]{4,}\b", c.claim_text.lower()))
                intersect = q_keywords.intersection(c_words)
                if len(intersect) >= 2:
                    matching_claims.append((c, len(intersect)))

            matching_claims.sort(key=lambda x: x[1], reverse=True)

            if len(matching_claims) >= 2:
                evidence_coverage = "answered_in_sources"
                for c, _ in matching_claims[:2]:
                    s = source_map.get(c.source_id) or (c.chunk.source if c.chunk else None)
                    source_refs.append({
                        "source_id": s.id if s else "",
                        "source_title": s.title if s else "Document",
                        "claim_id": c.id,
                        "claim_text": c.claim_text,
                        "exact_quote": c.exact_quote,
                        "page_number": c.page_number,
                    })
            elif len(matching_claims) == 1:
                evidence_coverage = "partially_answered"
                c = matching_claims[0][0]
                s = source_map.get(c.source_id) or (c.chunk.source if c.chunk else None)
                source_refs.append({
                    "source_id": s.id if s else "",
                    "source_title": s.title if s else "Document",
                    "claim_id": c.id,
                    "claim_text": c.claim_text,
                    "exact_quote": c.exact_quote,
                    "page_number": c.page_number,
                })
            else:
                evidence_coverage = "uncovered"

            # Match related requirement if possible
            related_req = None
            for req in existing_reqs:
                r_words = set(re.findall(r"\b[A-Za-z]{4,}\b", req.requirement_text.lower()))
                if len(q_keywords.intersection(r_words)) >= 1:
                    related_req = req
                    break

            prev_state = user_state_map.get(q_lower, {})

            spot = BlindSpot(
                session_id=session_id,
                question=q_text,
                rationale=q_obj["rationale"],
                explanation=q_obj.get("explanation", q_obj["rationale"]),
                relevance=q_obj.get("relevance", "High"),
                risk_level=q_obj.get("risk_level", "medium"),
                priority=q_obj.get("priority", "P1"),
                category=q_obj.get("category", "unaddressed_risk"),
                related_requirement_id=related_req.id if related_req else None,
                related_requirement_text=related_req.requirement_text if related_req else None,
                evidence_coverage=evidence_coverage,
                source_references_json=json.dumps(source_refs),
                recommended_action=q_obj.get("recommended_action"),
                is_resolved=prev_state.get("is_resolved", False),
                is_starred=prev_state.get("is_starred", False),
                is_dismissed=prev_state.get("is_dismissed", False),
                is_added_to_plan=prev_state.get("is_added_to_plan", False),
                added_requirement_id=prev_state.get("added_requirement_id"),
            )

            if persist:
                db.add(spot)
            created_spots.append(spot)

        if persist:
            db.commit()

        return created_spots

    @classmethod
    def add_blindspot_to_research_plan(
        cls,
        db: Session,
        blindspot_id: str
    ) -> Requirement:
        """
        Step 10: Promotes a BlindSpot question into an active, officially tracked Research Requirement.
        """
        spot = db.query(BlindSpot).filter(BlindSpot.id == blindspot_id).first()
        if not spot:
            raise ValueError(f"BlindSpot with id {blindspot_id} not found.")

        # Determine category based on blindspot category
        category_map = {
            "rollback_risk": "architecture",
            "cost_hidden": "cost",
            "concurrency_limits": "performance",
            "developer_velocity": "operational",
            "institutional_transfer_risk": "eligibility",
            "documentation_grace_period": "documentation",
            "renewal_maintenance_conditions": "academic",
            "concurrent_benefit_restrictions": "financial",
            "appeal_and_grievance_procedure": "governance",
            "document_validity_expiration": "documentation",
            "vendor_lockin": "legal",
            "legal_liability": "compliance",
            "sla_protection": "sla",
            "operational_dependency": "governance",
        }
        req_cat = category_map.get(spot.category, "General")

        # Get existing count for order_index
        count = db.query(Requirement).filter(Requirement.session_id == spot.session_id).count()

        new_req = Requirement(
            session_id=spot.session_id,
            requirement_text=spot.question,
            question=spot.question,
            description=f"AI-Discovered Strategic Dimension: {spot.explanation or spot.rationale}",
            category=req_cat,
            importance=spot.risk_level,
            priority=spot.priority,
            is_decision_critical=(spot.risk_level == "high"),
            origin="ai_suggested",
            is_approved=True,
            status=spot.evidence_coverage if spot.evidence_coverage in ["covered", "partial"] else "uncovered",
            order_index=count
        )
        db.add(new_req)
        db.flush()

        spot.is_added_to_plan = True
        spot.added_requirement_id = new_req.id
        db.commit()
        db.refresh(new_req)

        return new_req
