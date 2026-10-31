from typing import List, Dict, Any, Tuple
from datetime import datetime, timezone


class DecisionReadinessScorer:
    @staticmethod
    def calculate_readiness(
        requirements: List[Any],
        contradictions: List[Any],
        sources: List[Any],
        claims: List[Any]
    ) -> Dict[str, float]:
        """
        Calculates explainable 4-factor Decision-Readiness Index (DRI).
        Returns scores normalized from 0.0 to 100.0.
        """
        # 1. Coverage Factor (weight = 0.35)
        # Requirements covered vs total
        total_reqs = len(requirements)
        if total_reqs == 0:
            coverage_score = 0.0
        else:
            covered_count = sum(1 for r in requirements if r.status == "covered")
            partial_count = sum(1 for r in requirements if r.status == "partial")
            coverage_ratio = (covered_count + (0.5 * partial_count)) / total_reqs
            coverage_score = min(100.0, max(0.0, coverage_ratio * 100.0))

        # 2. Consistency Factor (weight = 0.30)
        # Penalty for high and medium contradictions
        if total_reqs == 0:
            consistency_score = 100.0
        else:
            high_conflicts = sum(1 for c in contradictions if c.severity == "high")
            med_conflicts = sum(1 for c in contradictions if c.severity == "medium")
            low_conflicts = sum(1 for c in contradictions if c.severity == "low")
            penalty = (high_conflicts * 25.0) + (med_conflicts * 12.0) + (low_conflicts * 5.0)
            consistency_score = max(0.0, 100.0 - penalty)

        # 3. Freshness Factor (weight = 0.15)
        # Check source publication age
        total_sources = len(sources)
        if total_sources == 0:
            freshness_score = 50.0
        else:
            now = datetime.now(timezone.utc)
            source_scores = []
            for s in sources:
                if s.publication_date:
                    pub = s.publication_date
                    if pub.tzinfo is None:
                        pub = pub.replace(tzinfo=timezone.utc)
                    age_months = (now - pub).days / 30.0
                    if age_months <= 12:
                        source_scores.append(100.0)
                    elif age_months <= 24:
                        source_scores.append(75.0)
                    elif age_months <= 36:
                        source_scores.append(50.0)
                    else:
                        source_scores.append(25.0)
                else:
                    source_scores.append(65.0)  # neutral if date not stated
            freshness_score = sum(source_scores) / total_sources

        # 4. Verification Factor (weight = 0.20)
        # Ratio of verified quotes with exact substring matches
        total_claims = len(claims)
        if total_claims == 0:
            verification_score = 0.0
        else:
            verified_count = sum(1 for c in claims if getattr(c, "is_verified", False))
            verification_score = (verified_count / total_claims) * 100.0

        # Weighted Final Composite Index
        dri = (
            (0.35 * coverage_score) +
            (0.30 * consistency_score) +
            (0.15 * freshness_score) +
            (0.20 * verification_score)
        )

        return {
            "readiness_score": round(dri, 1),
            "coverage_score": round(coverage_score, 1),
            "consistency_score": round(consistency_score, 1),
            "freshness_score": round(freshness_score, 1),
            "verification_score": round(verification_score, 1),
        }

    @staticmethod
    def get_readiness_tier(score: float) -> Tuple[str, str]:
        """
        Returns (tier_label, recommendation).
        """
        if score >= 80.0:
            return "Decision-Ready", "High confidence. Minimal gaps remaining. Safe to proceed to decision."
        elif score >= 50.0:
            return "Conditional Proceed", "Moderate confidence. Crucial contradictions or gaps require verification before sign-off."
        else:
            return "Critical Blindspots", "High risk of premature decision. Major unaddressed requirements or conflicting data detected."
