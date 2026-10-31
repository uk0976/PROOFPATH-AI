import json
from typing import List, Dict, Any
from app.agents.base import BaseAgent


class ContradictionAnalyzerAgent(BaseAgent):
    async def analyze_conflicts(
        self,
        requirement_text: str,
        claims: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Examines claims mapped to a requirement for contradictions across sources.
        """
        if len(claims) < 2:
            return []

        # Only compare claims from DIFFERENT sources
        pairs_to_compare = []
        for i in range(len(claims)):
            for j in range(i + 1, len(claims)):
                if claims[i].get("source_id") != claims[j].get("source_id"):
                    pairs_to_compare.append((claims[i], claims[j]))

        if not pairs_to_compare:
            return []

        claims_repr = json.dumps([
            {
                "claim_id": c["id"],
                "source_title": c.get("source_title", "Source"),
                "claim_text": c["claim_text"],
                "quote": c.get("exact_quote", ""),
                "date": c.get("date_reference")
            }
            for c in claims
        ], indent=2)

        prompt = f"""
EVALUATION REQUIREMENT: {requirement_text}

CLAIMS FROM COMPETING SOURCES:
{claims_repr}

TASK:
Identify any direct contradictions, conflicting metrics (e.g. latency, cost, limits), or mutually exclusive statements between these sources.
If no genuine contradiction exists, return an empty list.

Return JSON strictly in this structure:
{{
  "contradictions": [
    {{
      "claim_a_id": "exact id from claims list",
      "claim_b_id": "exact id from claims list",
      "severity": "high | medium | low",
      "conflicting_aspect": "Specific parameter or factual assertion where sources diverge",
      "synthesis_verdict": "Forensic evaluation explaining why they conflict and which is more credible or current"
    }}
  ]
}}
"""
        system = "You are a forensic evidence auditor. Identify genuine contradictions between competing sources with zero false alarms."
        res = await self.call_llm_json(prompt, system)

        conflicts = res.get("contradictions", [])
        return conflicts
