import re
import uuid
import logging
from typing import List, Dict, Any, Optional
from app.agents.base import BaseAgent

logger = logging.getLogger("proofpath.agents.research_planner")


class ResearchPlannerAgent(BaseAgent):
    """
    Intelligent Research Planner AI Agent.
    Converts broad, ambiguous user questions into structured, independently verifiable
    research requirements with strict anti-hallucination scoping.
    """

    async def decompose_goal(
        self,
        goal: str,
        target_decision: str = "",
        domain_context: Optional[str] = None,
        max_criteria: int = 8
    ) -> List[Dict[str, Any]]:
        """
        Decomposes research goal into structured requirements via Gemini API (with fallback).
        Each requirement includes question, category, description, importance, priority, and decision-critical flag.
        """
        prompt = f"""
You are the Lead Intelligence Strategist at PROOFPATH AI.
Your objective is to decompose a broad research goal into structured, independently verifiable research requirements and specific questions.

RESEARCH GOAL: {goal}
TARGET DECISION: {target_decision or 'Comprehensive evaluation prior to critical decision'}
DOMAIN CONTEXT: {domain_context or 'Auto-detect (e.g. Scholarship, Business, Government Service, Technology)'}
MAX REQUIREMENTS: {max_criteria}

CRITICAL DECOMPOSITION INSTRUCTIONS:
1. Break down the user's inquiry into {max_criteria} distinct, mutually exclusive, and collectively exhaustive (MECE) criteria.
2. If the inquiry relates to SCHOLARSHIPS or GRANTS, you MUST explicitly cover:
   - Eligibility requirements
   - Academic requirements
   - Income/Financial requirements
   - Required documents
   - Application deadlines
   - Application procedure
   - Renewal conditions
   - Restrictions
   - Exceptions
3. If the inquiry relates to BUSINESS RESEARCH, cover:
   - Market opportunity & TAM
   - Unit economics & pricing
   - Competitive moats & differentiation
   - Regulatory compliance & licensing
   - Customer acquisition cost & churn
   - Technical & operational execution risk
4. If the inquiry relates to GOVERNMENT SERVICES, cover:
   - Statutory entitlement & qualifications
   - Proof of identity & documentation proofs
   - Processing timelines & SLA guarantees
   - Renewal/Recertification rules
   - Legal restrictions & exceptions
   - Appeals procedure & dispute resolution
5. For EVERY requirement, classify:
   - "importance": "critical" | "high" | "medium" | "low"
   - "priority": "P0" (absolute dealbreaker/gatekeeper) | "P1" (essential) | "P2" (recommended) | "P3" (supplementary)
   - "is_decision_critical": true if failing this requirement immediately disqualifies or halts the decision.
   - "weight": float between 1.0 and 3.0 (3.0 for P0/critical).

RETURN STRICTLY A JSON OBJECT WITH THIS STRUCTURE:
{{
  "domain_detected": "scholarship | business | government_service | technology | general",
  "requirements": [
    {{
      "question": "Direct, actionable interrogative question addressing this criterion",
      "requirement_text": "Precise, verifiable assertion statement specifying what must be proven",
      "category": "Standard category name",
      "description": "Comprehensive explanation of what evidence is needed and why this matters for the decision",
      "importance": "critical | high | medium | low",
      "priority": "P0 | P1 | P2 | P3",
      "weight": 2.5,
      "is_decision_critical": true
    }}
  ]
}}
"""
        system = (
            "You are an expert investigative intelligence strategist. "
            "Convert ambiguous user requests into rigorous, falsifiable research specifications. "
            "Return valid JSON only."
        )

        res = await self.call_llm_json(prompt, system)

        raw_reqs = res.get("requirements", [])
        if not raw_reqs:
            logger.info("Using domain-aware heuristic decomposition fallback.")
            raw_reqs = self._heuristic_domain_decomposition(goal, domain_context)

        # Deduplicate and clean requirements
        deduped = self._deduplicate_requirements(raw_reqs)
        return deduped[:max_criteria]

    def _deduplicate_requirements(self, reqs: List[Dict[str, Any]], threshold: float = 0.65) -> List[Dict[str, Any]]:
        """
        Removes semantically duplicate or heavily overlapping questions.
        Uses token set intersection and normalized string matching.
        """
        unique_reqs: List[Dict[str, Any]] = []

        def get_tokens(text: str) -> set:
            words = re.findall(r'\b[a-zA-Z]{3,}\b', text.lower())
            stopwords = {"what", "when", "where", "which", "who", "whom", "this", "that", "with", "from", "have", "must", "should", "will", "does", "been", "their", "there", "about", "into", "over", "more", "everything", "know", "before", "after"}
            return {w for w in words if w not in stopwords}

        for candidate in reqs:
            q_text = candidate.get("question") or candidate.get("requirement_text") or ""
            c_tokens = get_tokens(q_text)

            is_dup = False
            for existing in unique_reqs:
                e_text = existing.get("question") or existing.get("requirement_text") or ""
                e_tokens = get_tokens(e_text)

                if not c_tokens or not e_tokens:
                    continue

                # Jaccard Token Similarity
                intersection = len(c_tokens.intersection(e_tokens))
                union = len(c_tokens.union(e_tokens))
                similarity = intersection / union if union > 0 else 0.0

                # Same category + high word overlap
                same_cat = candidate.get("category", "").lower() == existing.get("category", "").lower()
                if similarity >= threshold or (same_cat and similarity >= 0.5):
                    is_dup = True
                    break

            if not is_dup:
                unique_reqs.append(candidate)

        return unique_reqs

    def _heuristic_domain_decomposition(self, goal: str, domain_context: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Rich domain-aware heuristic fallback engine for:
        1. Government Scholarship scenarios
        2. Business & Enterprise Research scenarios
        3. Government Service & Public Benefits scenarios
        4. Technology & Cloud Architecture scenarios
        """
        goal_lower = goal.lower()
        context_lower = (domain_context or "").lower()

        # -------------------------------------------------------------
        # SCENARIO 1: Government Scholarship / Fellowship / Academic Grant
        # -------------------------------------------------------------
        if any(k in goal_lower or k in context_lower for k in ["scholarship", "grant", "tuition", "fellowship", "academic aid", "college funding", "university"]):
            return [
                {
                    "question": "What are the core eligibility criteria including citizenship, residency, and age limits?",
                    "requirement_text": "Applicant must satisfy mandatory legal eligibility thresholds including valid citizenship status, state residency tenure, and age stipulations.",
                    "category": "Eligibility Requirements",
                    "description": "Examine statutory qualification rules to prevent disqualification on preliminary legal or demographic grounds.",
                    "importance": "critical",
                    "priority": "P0",
                    "weight": 3.0,
                    "is_decision_critical": True
                },
                {
                    "question": "What minimum GPA, standardized test scores, and prerequisite coursework are required?",
                    "requirement_text": "Applicant must meet or exceed minimum cumulative GPA thresholds, accredited course prerequisites, and institutional academic standards.",
                    "category": "Academic Requirements",
                    "description": "Verify empirical grade-point requirements, transcript validation criteria, and academic program accreditation compatibility.",
                    "importance": "critical",
                    "priority": "P0",
                    "weight": 2.8,
                    "is_decision_critical": True
                },
                {
                    "question": "What are the family income ceilings, financial need formulas, and EFC/SAI limits?",
                    "requirement_text": "Applicant household adjusted gross income (AGI) and calculated financial need must fall within published threshold caps.",
                    "category": "Income Requirements",
                    "description": "Assess need-based means testing thresholds, tax return filing proofs, and sibling/dependent allocation formulas.",
                    "importance": "high",
                    "priority": "P1",
                    "weight": 2.5,
                    "is_decision_critical": True
                },
                {
                    "question": "Which official documents, certified transcripts, tax forms, and recommendation letters must be submitted?",
                    "requirement_text": "Application package must include certified academic transcripts, official tax returns (W-2/1040), letters of recommendation, and personal statements.",
                    "category": "Required Documents",
                    "description": "Audit full documentation checklist to ensure zero missing exhibits or uncertified records during preliminary review.",
                    "importance": "high",
                    "priority": "P1",
                    "weight": 2.2,
                    "is_decision_critical": False
                },
                {
                    "question": "What are the exact submission deadlines, timezones, and early decision priority cut-offs?",
                    "requirement_text": "Applications, supporting documents, and referee evaluations must be submitted before published timezone-stamped closing deadlines.",
                    "category": "Application Deadlines",
                    "description": "Confirm hard cut-off timestamps, grace periods, and difference between priority and regular filing cycles.",
                    "importance": "critical",
                    "priority": "P0",
                    "weight": 3.0,
                    "is_decision_critical": True
                },
                {
                    "question": "What is the step-by-step submission procedure, portal workflow, and verification process?",
                    "requirement_text": "Candidate must successfully complete online portal registration, identity verification, document indexing, and confirmation acknowledgment.",
                    "category": "Application Procedure",
                    "description": "Map the formal workflow from electronic portal registration to final application receipt ID confirmation.",
                    "importance": "medium",
                    "priority": "P2",
                    "weight": 1.8,
                    "is_decision_critical": False
                },
                {
                    "question": "What minimum ongoing GPA, credit hours, and progress reports are needed to renew the funding annually?",
                    "requirement_text": "Recipient must maintain continuous full-time enrollment, minimum 3.0 term GPA, and submit annual satisfactory academic progress (SAP) certifications.",
                    "category": "Renewal Conditions",
                    "description": "Identify annual maintenance stipulations to safeguard against retroactive forfeiture or multi-year grant loss.",
                    "importance": "high",
                    "priority": "P1",
                    "weight": 2.4,
                    "is_decision_critical": False
                },
                {
                    "question": "What restrictions apply regarding outside employment, concurrent scholarships, or repayment clawbacks?",
                    "requirement_text": "Funding prohibits concurrent full tuition waivers, limits weekly on-campus work hours, and imposes mandatory clawback for premature withdrawal.",
                    "category": "Restrictions",
                    "description": "Examine legal non-stackability clauses, employment limits, and mandatory service payback obligations.",
                    "importance": "medium",
                    "priority": "P2",
                    "weight": 2.0,
                    "is_decision_critical": False
                },
                {
                    "question": "What special hardship exceptions, medical leave provisions, or appeal avenues are available if criteria are missed?",
                    "requirement_text": "The committee maintains an established appeals procedure for documented medical emergencies, catastrophic family hardship, or delayed transcript submissions.",
                    "category": "Exceptions",
                    "description": "Verify formal grievance procedures, hardship waiver allowances, and administrative appeal deadlines.",
                    "importance": "medium",
                    "priority": "P2",
                    "weight": 1.6,
                    "is_decision_critical": False
                }
            ]

        # -------------------------------------------------------------
        # SCENARIO 2: Government Services, Benefits & Public Compliance
        # -------------------------------------------------------------
        elif any(k in goal_lower or k in context_lower for k in ["government service", "benefit", "passport", "visa", "citizen", "license", "permit", "subsidy", "welfare"]):
            return [
                {
                    "question": "What statutory legal entitlement standards govern qualification for this government service?",
                    "requirement_text": "Applicant must satisfy codified statutory criteria governing entitlement jurisdiction and program authority.",
                    "category": "Statutory Entitlement",
                    "description": "Verify primary legal authority and qualification mandates to prevent administrative rejection.",
                    "importance": "critical",
                    "priority": "P0",
                    "weight": 3.0,
                    "is_decision_critical": True
                },
                {
                    "question": "What primary identification documents and proof of residency are accepted by the agency?",
                    "requirement_text": "Applicant must produce federally compliant Real-ID documents, primary citizenship verification, and state residency utility proofs.",
                    "category": "Documentation Proofs",
                    "description": "Audit strict acceptable document lists, certified translations, and biometric verification requirements.",
                    "importance": "critical",
                    "priority": "P0",
                    "weight": 2.8,
                    "is_decision_critical": True
                },
                {
                    "question": "What are the published agency processing timelines, statutory review periods, and expedited options?",
                    "requirement_text": "Agency processing must adhere to statutory turnaround standards with documented tracking mechanisms.",
                    "category": "Processing Timelines",
                    "description": "Quantify end-to-end processing delays, backlog averages, and expedited fee options.",
                    "importance": "high",
                    "priority": "P1",
                    "weight": 2.2,
                    "is_decision_critical": False
                },
                {
                    "question": "What fee schedules, fee waiver criteria, and acceptable payment instruments are mandated?",
                    "requirement_text": "All application filing fees must be remitted in exact statutory amounts via approved payment methods.",
                    "category": "Filing Fees & Waivers",
                    "description": "Check non-refundable filing fees, fee exemption eligibility guidelines, and surcharge policies.",
                    "importance": "medium",
                    "priority": "P2",
                    "weight": 1.8,
                    "is_decision_critical": False
                },
                {
                    "question": "What formal administrative appeal procedures exist in the event of an adverse agency determination?",
                    "requirement_text": "Agency regulations provide an administrative review process with a 30-day notice of appeal filing deadline.",
                    "category": "Appeals & Recourse",
                    "description": "Establish due process timelines, evidentiary reconsideration standards, and legal representation rights.",
                    "importance": "high",
                    "priority": "P1",
                    "weight": 2.4,
                    "is_decision_critical": False
                },
                {
                    "question": "What periodic recertification reports or status changes must be disclosed to maintain active standing?",
                    "requirement_text": "Beneficiaries must report income, residence, or status changes within 10 business days of occurrence.",
                    "category": "Ongoing Compliance",
                    "description": "Map ongoing compliance requirements to prevent suspension or civil recovery actions.",
                    "importance": "medium",
                    "priority": "P2",
                    "weight": 1.9,
                    "is_decision_critical": False
                }
            ]

        # -------------------------------------------------------------
        # SCENARIO 3: Business, Market & Commercial Feasibility Research
        # -------------------------------------------------------------
        elif any(k in goal_lower or k in context_lower for k in ["business", "market", "commercial", "competitor", "startup", "revenue", "investment", "economics"]):
            return [
                {
                    "question": "What is the validated Total Addressable Market (TAM), Serviceable Market (SAM), and CAGR growth trajectory?",
                    "requirement_text": "Market analysis must demonstrate a verifiable TAM exceeding $1B with double-digit projected CAGR across key segments.",
                    "category": "Market Sizing & TAM",
                    "description": "Scrutinize bottom-up customer counts, pricing power, and independent analyst growth projections.",
                    "importance": "critical",
                    "priority": "P0",
                    "weight": 2.8,
                    "is_decision_critical": True
                },
                {
                    "question": "What are the unit economics, contribution margins, and customer lifetime value (LTV) relative to CAC?",
                    "requirement_text": "Business model must yield an LTV-to-CAC ratio of at least 3.0x with customer payback period under 12 months.",
                    "category": "Unit Economics",
                    "description": "Verify gross margin sustainability, variable customer service overhead, and net expansion rates.",
                    "importance": "critical",
                    "priority": "P0",
                    "weight": 3.0,
                    "is_decision_critical": True
                },
                {
                    "question": "What defensible competitive moats and technological differentiators prevent commoditization by incumbents?",
                    "requirement_text": "Product architecture must exhibit proprietary intellectual property, network effects, or 10x workflow efficiency over legacy rivals.",
                    "category": "Competitive Moats",
                    "description": "Assess patent protection, proprietary dataset flywheels, and customer switching cost barriers.",
                    "importance": "high",
                    "priority": "P1",
                    "weight": 2.5,
                    "is_decision_critical": False
                },
                {
                    "question": "What regulatory compliance licenses, industry certifications, and legal liabilities govern operations?",
                    "requirement_text": "Operations must maintain requisite regulatory approvals, data privacy certifications (GDPR/CCPA), and commercial liability coverage.",
                    "category": "Regulatory Compliance",
                    "description": "Identify regulatory hurdles, mandatory compliance filings, and potential antitrust or consumer protection exposure.",
                    "importance": "high",
                    "priority": "P1",
                    "weight": 2.6,
                    "is_decision_critical": True
                },
                {
                    "question": "What are the primary customer acquisition channels, conversion funnels, and organic distribution multipliers?",
                    "requirement_text": "Go-to-market plan must prove repeatable customer acquisition with predictable conversion rates and organic referral viral loops.",
                    "category": "Go-To-Market & Distribution",
                    "description": "Audit channel saturation, paid ad dependency, partner co-selling dynamics, and enterprise sales cycles.",
                    "importance": "medium",
                    "priority": "P2",
                    "weight": 2.0,
                    "is_decision_critical": False
                },
                {
                    "question": "What operational bottlenecks, supply chain dependencies, and key personnel risks could jeopardize scale?",
                    "requirement_text": "Enterprise risk matrix must establish mitigation plans for single-source vendor dependencies and critical talent attrition.",
                    "category": "Operational Risk",
                    "description": "Audit operational resilience, infrastructure scaling limits, and vendor concentration risks.",
                    "importance": "medium",
                    "priority": "P2",
                    "weight": 1.8,
                    "is_decision_critical": False
                }
            ]

        # -------------------------------------------------------------
        # SCENARIO 4: Default / Technology Architecture Assessment
        # -------------------------------------------------------------
        else:
            return [
                {
                    "question": f"What are the precise performance, latency (P99), and throughput targets for: {goal}?",
                    "requirement_text": f"System must achieve sub-50ms P99 end-to-end response times and sustain peak load throughput for: {goal}.",
                    "category": "Performance Benchmarks",
                    "description": "Establish quantitative empirical throughput and latency criteria under realistic production stress.",
                    "importance": "critical",
                    "priority": "P0",
                    "weight": 3.0,
                    "is_decision_critical": True
                },
                {
                    "question": f"What are the total operational costs, software licensing, and cloud hosting TCO for: {goal}?",
                    "requirement_text": f"Total cost of ownership must align with strategic enterprise budget boundaries with transparent unit cost scaling.",
                    "category": "Cost & TCO",
                    "description": "Quantify compute, storage, license, and ongoing operational engineering maintenance expenses.",
                    "importance": "high",
                    "priority": "P1",
                    "weight": 2.6,
                    "is_decision_critical": True
                },
                {
                    "question": f"What security certifications, data encryption standards, and compliance frameworks are required for: {goal}?",
                    "requirement_text": f"Solution must support end-to-end encryption in transit/rest and satisfy SOC2 Type II, ISO 27001, or FedRAMP standards.",
                    "category": "Security & Compliance",
                    "description": "Examine audit readiness, vulnerability remediation SLAs, and access control governance.",
                    "importance": "critical",
                    "priority": "P0",
                    "weight": 2.8,
                    "is_decision_critical": True
                },
                {
                    "question": f"What high availability, multi-region failover, and disaster recovery RTO/RPO SLAs are guaranteed?",
                    "requirement_text": f"Architecture must provide 99.99% uptime SLA with automated multi-zone failover and RTO under 15 minutes.",
                    "category": "Availability & Disaster Recovery",
                    "description": "Verify failover automation, partition resilience, and data loss guarantees during regional blackouts.",
                    "importance": "high",
                    "priority": "P1",
                    "weight": 2.4,
                    "is_decision_critical": False
                },
                {
                    "question": f"What developer complexity, migration overhead, and rollback procedures govern implementation for: {goal}?",
                    "requirement_text": f"Implementation must deliver comprehensive SDKs, backwards-compatible API contracts, and zero-downtime rollback strategies.",
                    "category": "Developer Experience & Migration",
                    "description": "Assess learning curve, migration tooling, operational risk, and team onboarding timelines.",
                    "importance": "medium",
                    "priority": "P2",
                    "weight": 1.9,
                    "is_decision_critical": False
                }
            ]

    def _heuristic_fallback(self, prompt: str) -> Dict[str, Any]:
        match = re.search(r'RESEARCH GOAL:\s*(.*?)\n', prompt)
        goal = match.group(1) if match else "Strategic Assessment"
        goal_lower = goal.lower()
        domain = "technology"
        if any(k in goal_lower for k in ["scholarship", "fellowship", "academic aid", "tuition", "study aid"]):
            domain = "scholarship"
        elif any(k in goal_lower for k in ["business", "startup", "commercial", "unit economics", "competitor", "market opportunity"]):
            domain = "business"
        elif any(k in goal_lower for k in ["government service", "disability", "citizen benefit", "passport", "visa"]):
            domain = "government_service"

        reqs = self._heuristic_domain_decomposition(goal, domain)
        return {"domain_detected": domain, "requirements": reqs}
