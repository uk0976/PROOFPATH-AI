import re
import json
import logging
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from app.models import Contradiction, AtomicClaim, Requirement, ResearchSession, Source

logger = logging.getLogger("proofpath.contradiction_engine")


class ScopeExtractor:
    """
    Extracts the 10 forensic scope dimensions from claims and requirements.
    """

    # Applicant categories regex patterns
    APPLICANT_PATTERNS = [
        (r"\b(undergrad(?:uate)?|bachelor(?:'s)?|ug|first[- ]year)\b", "Undergraduate"),
        (r"\b(postgrad(?:uate)?|master(?:'s)?|pg|graduate)\b", "Postgraduate"),
        (r"\b(ph\.?d|doctoral|research scholar)\b", "Doctoral / PhD"),
        (r"\b(high[- ]school|secondary|12th)\b", "High School"),
        (r"\b(international|foreign|non-citizen)\b", "International Students"),
        (r"\b(domestic|citizen|in-state|resident)\b", "Domestic / In-State"),
        (r"\b(reserved|sc|st|obc|ews|quota)\b", "Reserved / Quota Category"),
        (r"\b(general category|unreserved|merit)\b", "General Category"),
    ]

    # Geographic scope regex patterns
    GEO_PATTERNS = [
        (r"\b(in-state|state resident|domicile)\b", "In-State / Domiciled"),
        (r"\b(out-of-state|non-resident|inter-state)\b", "Out-of-State"),
        (r"\b(national|nationwide|federal|pan-india)\b", "National"),
        (r"\b(california|texas|new york|delhi|maharashtra|karnataka)\b", "State-Specific"),
        (r"\b(global|international|cross-border)\b", "International"),
    ]

    # Cycle and academic year patterns
    YEAR_PATTERN = re.compile(r"\b(202[0-9](?:[-–]20?2[0-9])?)\b")
    CYCLE_PATTERN = re.compile(r"\b(fall|spring|summer|winter|round\s*[0-9]|cycle\s*[0-9]|intake\s*202[0-9]|phase\s*[0-9])\b", re.IGNORECASE)

    # Numerical threshold & unit patterns
    NUMERICAL_PERCENT_PATTERN = re.compile(r"(\d+(?:\.\d+)?)\s*(%|percent(?:age)?)", re.IGNORECASE)
    NUMERICAL_GPA_PATTERN = re.compile(r"\b([0-4](?:\.\d+)?)\s*(?:gpa|cgpa|scale)\b", re.IGNORECASE)
    NUMERICAL_CURRENCY_PATTERN = re.compile(r"(\$|€|£|₹|rs\.?|usd|inr)\s*(\d+(?:,\d{3})*(?:\.\d+)?)|\b(\d+(?:,\d{3})*(?:\.\d+)?)\s*(usd|inr|dollars|rupees)\b", re.IGNORECASE)
    NUMERICAL_LATENCY_PATTERN = re.compile(r"(\d+(?:\.\d+)?)\s*(ms|milliseconds|seconds|s)\b", re.IGNORECASE)

    @classmethod
    def extract_scope(cls, text: str, claim: Optional[Any] = None) -> Dict[str, Any]:
        """
        Extracts multi-dimensional scope metadata from claim text and associated metadata.
        """
        lower = text.lower()

        # 1. Applicant Category
        applicant = "All Applicants"
        for pat, label in cls.APPLICANT_PATTERNS:
            if re.search(pat, lower):
                applicant = label
                break

        # 2. Geographic Scope
        geo = "National / General"
        for pat, label in cls.GEO_PATTERNS:
            match = re.search(pat, lower)
            if match:
                geo = match.group(0).title()
                break

        # 3. Academic Year
        year_match = cls.YEAR_PATTERN.search(text)
        year = year_match.group(1) if year_match else (getattr(claim, "date_reference", None) if claim else None)

        # 4. Application Cycle
        cycle_match = cls.CYCLE_PATTERN.search(text)
        cycle = cycle_match.group(0).title() if cycle_match else (getattr(claim, "applicable_period", None) if claim else None)

        # 5. Numerical Value & Unit
        num_val = None
        unit = None

        pct_match = cls.NUMERICAL_PERCENT_PATTERN.search(text)
        if pct_match:
            num_val = pct_match.group(1)
            unit = "%"
        else:
            gpa_match = cls.NUMERICAL_GPA_PATTERN.search(text)
            if gpa_match:
                num_val = gpa_match.group(1)
                unit = "GPA"
            else:
                lat_match = cls.NUMERICAL_LATENCY_PATTERN.search(text)
                if lat_match:
                    num_val = lat_match.group(1)
                    unit = lat_match.group(2)
                else:
                    curr_match = cls.NUMERICAL_CURRENCY_PATTERN.search(text)
                    if curr_match:
                        # Extract non-empty group
                        val_str = curr_match.group(2) or curr_match.group(3)
                        unit_str = curr_match.group(1) or curr_match.group(4)
                        num_val = val_str.replace(",", "")
                        unit = unit_str.upper()

        # 6. Conditions
        conditions = "Standard eligibility conditions"
        if "full-time" in lower:
            conditions = "Full-time enrollment required"
        elif "part-time" in lower:
            conditions = "Part-time enrollment permitted"
        elif "income" in lower:
            conditions = "Household income ceiling applicable"
        elif "snapstart" in lower or "concurrency" in lower:
            conditions = "Provisioned concurrency / SnapStart operational profile"

        return {
            "applicant_category": applicant,
            "geographic_scope": geo,
            "academic_year": year,
            "application_cycle": cycle,
            "numerical_value": num_val,
            "unit": unit,
            "conditions": conditions,
        }


class ContradictionIntelligenceEngine:
    """
    Forensic Cross-Source Contradiction Intelligence Engine.
    Performs 10-dimensional pairwise scope comparison across claims from competing sources.
    Strictly distinguishes Genuine Conflicts from False Conflicts (Scope Differentiations).
    """

    @classmethod
    def compare_claims_forensically(
        cls,
        claim_a: Dict[str, Any],
        claim_b: Dict[str, Any],
        requirement_text: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Executes exhaustive 10-dimensional comparison between two competing claims.
        """
        text_a = claim_a.get("claim_text", "")
        text_b = claim_b.get("claim_b", "") or claim_b.get("claim_text", "")
        source_a_id = claim_a.get("source_id", "A")
        source_b_id = claim_b.get("source_id", "B")

        scope_a = ScopeExtractor.extract_scope(text_a)
        scope_b = ScopeExtractor.extract_scope(text_b)

        # Subject & Category
        category = claim_a.get("category") or claim_b.get("category") or "General"
        subject = requirement_text or "Institutional Policy Criterion"

        # Compare dimensions
        divergences = []

        # 1. Applicant Category Divergence
        app_diff = False
        if scope_a["applicant_category"] != "All Applicants" and scope_b["applicant_category"] != "All Applicants":
            if scope_a["applicant_category"] != scope_b["applicant_category"]:
                app_diff = True
                divergences.append(f"Applicant cohorts differ: '{scope_a['applicant_category']}' vs '{scope_b['applicant_category']}'.")

        # 2. Geographic Scope Divergence
        geo_diff = False
        if scope_a["geographic_scope"] != "National / General" and scope_b["geographic_scope"] != "National / General":
            if scope_a["geographic_scope"].lower() != scope_b["geographic_scope"].lower():
                geo_diff = True
                divergences.append(f"Geographic jurisdictions differ: '{scope_a['geographic_scope']}' vs '{scope_b['geographic_scope']}'.")

        # 3. Academic Year / Cycle Divergence
        cycle_diff = False
        year_a = scope_a["academic_year"]
        year_b = scope_b["academic_year"]
        if year_a and year_b and year_a != year_b:
            cycle_diff = True
            divergences.append(f"Academic years differ: '{year_a}' vs '{year_b}'.")

        cycle_a = scope_a["application_cycle"]
        cycle_b = scope_b["application_cycle"]
        if cycle_a and cycle_b and cycle_a.lower() != cycle_b.lower():
            cycle_diff = True
            divergences.append(f"Application cycles differ: '{cycle_a}' vs '{cycle_b}'.")

        # 4. Numerical Divergence
        num_a = scope_a["numerical_value"]
        num_b = scope_b["numerical_value"]
        num_mismatch = False
        if num_a and num_b:
            try:
                val_a = float(num_a)
                val_b = float(num_b)
                if abs(val_a - val_b) > 0.001:
                    num_mismatch = True
            except ValueError:
                if str(num_a) != str(num_b):
                    num_mismatch = True

        # Decision Matrix: Genuine vs False Conflict
        is_genuine = True
        conflict_type = "direct_factual_clash"
        severity = "medium"
        scope_alignment = "aligned"
        explanation = ""
        action = ""

        # Case 1: False Conflict due to Applicant Category difference (e.g. Undergrad 60% vs Postgrad 65%)
        if app_diff:
            is_genuine = False
            scope_alignment = "divergent"
            conflict_type = "scope_divergence"
            severity = "low"
            explanation = (
                f"False Conflict / Compatible Rules: Source A applies to '{scope_a['applicant_category']}', "
                f"whereas Source B applies to '{scope_b['applicant_category']}'. The divergent specifications "
                f"({num_a or 'rule A'} vs {num_b or 'rule B'}) reflect separate cohort criteria rather than an institutional contradiction."
            )
            action = (
                f"Determine whether your application falls under '{scope_a['applicant_category']}' or "
                f"'{scope_b['applicant_category']}' to apply the appropriate threshold."
            )

        # Case 2: False Conflict due to Geographic Domicile divergence (In-State vs Out-of-State)
        elif geo_diff:
            is_genuine = False
            scope_alignment = "divergent"
            conflict_type = "jurisdiction_divergence"
            severity = "low"
            explanation = (
                f"False Conflict / Jurisdiction Differentiation: Source A references '{scope_a['geographic_scope']}' "
                f"criteria, whereas Source B references '{scope_b['geographic_scope']}'. Divergent figures are attributable "
                f"to residency status distinctions."
            )
            action = "Verify the candidate's legal domicile or residency category before selecting the governing rule."

        # Case 3: Different Application Cycles (e.g. 2024 vs 2026)
        elif cycle_diff and (year_a != year_b):
            is_genuine = False
            scope_alignment = "divergent"
            conflict_type = "timeline_conflict"
            severity = "medium"
            explanation = (
                f"Temporal Cycle Divergence: Source A references cycle '{year_a or cycle_a}', whereas Source B references '{year_b or cycle_b}'. "
                f"These rules apply to different application windows. Verify which circular governs the active admission period."
            )
            action = f"Cross-reference the latest gazette to confirm whether '{year_b or cycle_b}' supersedes '{year_a or cycle_a}'."

        # Case 4: Genuine Conflict on Numerical Thresholds for the same scope
        elif num_mismatch:
            is_genuine = True
            scope_alignment = "aligned"
            conflict_type = "numerical_threshold_divergence"
            severity = "high"
            explanation = (
                f"Genuine Numerical Contradiction: Both sources address the same scope ({scope_a['applicant_category']}, "
                f"{year_a or 'active cycle'}), but prescribe incompatible thresholds: Source A states {num_a}{scope_a['unit'] or ''}, "
                f"while Source B states {num_b}{scope_b['unit'] or ''}."
            )
            action = (
                f"Escalate discrepancy to the issuing authority or program officer. Request official written confirmation "
                f"whether {num_a}{scope_a['unit'] or ''} or {num_b}{scope_b['unit'] or ''} represents the binding requirement."
            )

        # Case 5: Direct Assertional Clash (e.g. Mandatory vs Optional, True vs False)
        else:
            is_genuine = True
            scope_alignment = "aligned"
            conflict_type = "direct_factual_clash"
            severity = "high"
            explanation = (
                f"Direct Fact Clash: Competing sources make irreconcilable assertions regarding '{subject}'. "
                f"Source A asserts '{text_a[:100]}...', while Source B asserts '{text_b[:100]}...'."
            )
            action = "Audit primary legislation or official circulars to determine which document holds legal precedence."

        scope_comparison_dict = {
            "subject": subject,
            "category": category,
            "geographic_scope_a": scope_a["geographic_scope"],
            "geographic_scope_b": scope_b["geographic_scope"],
            "applicant_category_a": scope_a["applicant_category"],
            "applicant_category_b": scope_b["applicant_category"],
            "academic_year_a": scope_a["academic_year"],
            "academic_year_b": scope_b["academic_year"],
            "application_cycle_a": scope_a["application_cycle"],
            "application_cycle_b": scope_b["application_cycle"],
            "numerical_value_a": str(num_a) if num_a is not None else None,
            "numerical_value_b": str(num_b) if num_b is not None else None,
            "unit_a": scope_a["unit"],
            "unit_b": scope_b["unit"],
            "effective_date_a": scope_a.get("effective_date"),
            "effective_date_b": scope_b.get("effective_date"),
            "conditions_a": scope_a["conditions"],
            "conditions_b": scope_b["conditions"],
            "scope_alignment": scope_alignment,
            "divergence_reasons": divergences,
        }

        aspect_label = f"{subject} ({scope_a['applicant_category']}): {num_a or 'Spec A'} vs {num_b or 'Spec B'}"

        return {
            "is_genuine": is_genuine,
            "conflict_type": conflict_type,
            "severity": severity,
            "conflicting_aspect": aspect_label,
            "synthesis_verdict": explanation,
            "explanation": explanation,
            "recommended_action": action,
            "scope_comparison": scope_comparison_dict,
        }

    @classmethod
    def evaluate_session_contradictions(
        cls,
        db: Session,
        session_id: str,
        persist: bool = True
    ) -> List[Contradiction]:
        """
        Cross-audits all atomic claims mapped to requirements in a research session.
        Applies pairwise 10-dimensional scope comparison across competing sources.
        """
        reqs = db.query(Requirement).filter(Requirement.session_id == session_id).all()
        created_contradictions = []

        if persist:
            # Delete prior records for clean idempotent run
            db.query(Contradiction).filter(Contradiction.session_id == session_id).delete()
            db.commit()

        for req in reqs:
            # Fetch claims linked to this requirement
            claims = (
                db.query(AtomicClaim)
                .join(AtomicClaim.evidence_links)
                .filter(AtomicClaim.evidence_links.any(requirement_id=req.id))
                .all()
            )

            # Fallback if no evidence links: look for claims via chunk source in same session
            if len(claims) < 2:
                from app.models import DocumentChunk
                source_ids = [s.id for s in db.query(Source).filter(Source.session_id == session_id).all()]
                if source_ids:
                    claims = (
                        db.query(AtomicClaim)
                        .filter(
                            (AtomicClaim.source_id.in_(source_ids)) |
                            (AtomicClaim.chunk.has(DocumentChunk.source_id.in_(source_ids)))
                        )
                        .filter(AtomicClaim.category == req.category)
                        .all()
                    )

            if len(claims) < 2:
                continue

            # Compare pairs from DIFFERENT sources
            compared_pairs = set()
            for i in range(len(claims)):
                for j in range(i + 1, len(claims)):
                    ca = claims[i]
                    cb = claims[j]

                    source_a = ca.source_id or (ca.chunk.source_id if ca.chunk else None)
                    source_b = cb.source_id or (cb.chunk.source_id if cb.chunk else None)

                    # Only compare claims originating from distinct sources
                    if not source_a or not source_b or source_a == source_b:
                        continue

                    pair_key = tuple(sorted([ca.id, cb.id]))
                    if pair_key in compared_pairs:
                        continue
                    compared_pairs.add(pair_key)

                    claim_a_dict = {
                        "id": ca.id,
                        "source_id": source_a,
                        "claim_text": ca.claim_text,
                        "exact_quote": ca.exact_quote,
                        "category": ca.category,
                        "date_reference": ca.date_reference,
                        "applicable_period": ca.applicable_period,
                    }
                    claim_b_dict = {
                        "id": cb.id,
                        "source_id": source_b,
                        "claim_text": cb.claim_text,
                        "exact_quote": cb.exact_quote,
                        "category": cb.category,
                        "date_reference": cb.date_reference,
                        "applicable_period": cb.applicable_period,
                    }

                    eval_res = cls.compare_claims_forensically(
                        claim_a_dict,
                        claim_b_dict,
                        requirement_text=req.requirement_text
                    )

                    contradiction = Contradiction(
                        session_id=session_id,
                        requirement_id=req.id,
                        claim_a_id=ca.id,
                        claim_b_id=cb.id,
                        severity=eval_res["severity"],
                        conflicting_aspect=eval_res["conflicting_aspect"],
                        synthesis_verdict=eval_res["synthesis_verdict"],
                        is_genuine=eval_res["is_genuine"],
                        conflict_type=eval_res["conflict_type"],
                        scope_comparison_json=json.dumps(eval_res["scope_comparison"]),
                        explanation=eval_res["explanation"],
                        recommended_action=eval_res["recommended_action"],
                    )

                    if persist:
                        db.add(contradiction)
                        if eval_res["is_genuine"]:
                            req.status = "conflict"
                    created_contradictions.append(contradiction)

        if persist:
            db.commit()

        return created_contradictions
