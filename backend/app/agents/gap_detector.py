from typing import List, Dict, Any
from app.agents.base import BaseAgent


class GapDetectorAgent(BaseAgent):
    async def detect_gaps(
        self,
        requirements: List[Dict[str, Any]],
        evidence_counts: Dict[str, int]
    ) -> List[Dict[str, Any]]:
        """
        Evaluates requirements with zero or sparse claims to formulate gap findings.
        """
        gaps = []

        uncovered_reqs = [
            r for r in requirements
            if evidence_counts.get(r["id"], 0) == 0
        ]
        partial_reqs = [
            r for r in requirements
            if 0 < evidence_counts.get(r["id"], 0) < 2
        ]

        if not uncovered_reqs and not partial_reqs:
            return []

        prompt = f"""
EVALUATION REQUIREMENTS WITH MISSING EVIDENCE:
Uncovered: {[r['requirement_text'] for r in uncovered_reqs]}
Partially Covered: {[r['requirement_text'] for r in partial_reqs]}

TASK:
Analyze the missing information for each unaddressed requirement.
Return JSON strictly in this structure:
{{
  "gaps": [
    {{
      "requirement_text": "Text of requirement",
      "gap_summary": "Concise summary of what critical data is omitted",
      "missing_aspects": ["Specific metric 1", "Specific parameter 2"],
      "impact_level": "high | medium | low",
      "suggested_action": "Specific inquiry or additional document to request"
    }}
  ]
}}
"""
        system = "You are an expert information completeness auditor."
        res = await self.call_llm_json(prompt, system)
        detected = res.get("gaps", [])

        # Map back to requirement IDs
        result = []
        for r in uncovered_reqs:
            match = next((g for g in detected if g.get("requirement_text") == r["requirement_text"]), None)
            result.append({
                "requirement_id": r["id"],
                "requirement_text": r["requirement_text"],
                "category": r.get("category", "functional"),
                "status": "uncovered",
                "gap_summary": match.get("gap_summary", "No evidence or documentation was provided across any ingested source for this requirement.") if match else "No evidence provided across sources.",
                "missing_aspects": match.get("missing_aspects", ["Benchmarks", "Production verification"]) if match else ["Omitted entirely from ingested sources"],
                "impact_level": match.get("impact_level", "high") if match else "high",
                "suggested_action": match.get("suggested_action", "Request vendor specifications or third-party audits.") if match else "Request vendor specifications.",
            })

        for r in partial_reqs:
            match = next((g for g in detected if g.get("requirement_text") == r["requirement_text"]), None)
            result.append({
                "requirement_id": r["id"],
                "requirement_text": r["requirement_text"],
                "category": r.get("category", "functional"),
                "status": "partial",
                "gap_summary": match.get("gap_summary", "Only single uncorroborated claim provided; lacks multi-source consensus.") if match else "Single uncorroborated claim.",
                "missing_aspects": match.get("missing_aspects", ["Comparative validation"]) if match else ["Independent corroboration"],
                "impact_level": match.get("impact_level", "medium") if match else "medium",
                "suggested_action": match.get("suggested_action", "Cross-check with independent user benchmark reports.") if match else "Cross-check with independent benchmark.",
            })

        return result
