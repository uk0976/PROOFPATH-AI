from typing import List, Dict, Any
from datetime import datetime, timezone


class TemporalAnalyzerAgent:
    @staticmethod
    def audit_temporal_freshness(sources: List[Any], claims: List[Any]) -> List[Dict[str, Any]]:
        now = datetime.now(timezone.utc)
        results = []

        for s in sources:
            pub_date = s.publication_date
            age_months = None
            status = "unknown"
            warning = None

            if pub_date:
                # Ensure timezone-aware comparison
                if pub_date.tzinfo is None:
                    pub_date = pub_date.replace(tzinfo=timezone.utc)
                age_months = round((now - pub_date).days / 30.0, 1)
                if age_months > 24:
                    status = "outdated"
                    warning = f"Source published {age_months} months ago. Specifications and pricing may be deprecated."
                elif age_months > 12:
                    status = "aging"
                    warning = f"Source is {age_months} months old. Verify if newer revisions or SDK versions exist."
                else:
                    status = "fresh"
            else:
                warning = "No explicit publication timestamp detected. Source recency cannot be guaranteed."

            source_claims = [c for c in claims if getattr(c, "source_id", "") == s.id or (hasattr(c, "chunk") and c.chunk and c.chunk.source_id == s.id)]
            stale_claims = []
            for sc in source_claims:
                if sc.date_reference and any(yr in str(sc.date_reference) for yr in ["2020", "2021", "2022", "2023"]):
                    stale_claims.append({
                        "id": sc.id,
                        "source_id": s.id,
                        "source_title": s.title,
                        "source_type": s.source_type,
                        "claim_text": sc.claim_text,
                        "exact_quote": sc.exact_quote,
                        "date_reference": sc.date_reference,
                        "confidence_score": sc.confidence_score or 1.0
                    })

            results.append({
                "source_id": s.id,
                "source_title": s.title,
                "publication_date": pub_date.strftime("%Y-%m-%d") if pub_date else None,
                "age_in_months": age_months,
                "status": status,
                "decay_warning": warning,
                "stale_claims": stale_claims,
            })

        return results
