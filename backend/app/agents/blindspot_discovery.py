import re
from typing import List, Dict, Any
from app.agents.base import BaseAgent


class BlindSpotDiscoveryAgent(BaseAgent):
    async def discover_blindspots(
        self,
        goal: str,
        target_decision: str,
        covered_requirements: List[str]
    ) -> List[Dict[str, Any]]:
        prompt = f"""
RESEARCH GOAL: {goal}
TARGET DECISION: {target_decision}
CURRENTLY EVALUATED REQUIREMENTS:
{covered_requirements}

TASK:
Identify 4 to 6 CRITICAL BLIND SPOTS — important, high-impact questions the user FORGOT to ask or consider before making this decision.
Think about:
- Disaster recovery and rollback feasibility
- Hidden ongoing operational costs or surge pricing
- Vendor lock-in and migration friction
- Regulatory jurisdiction / compliance audit exposure
- Key-person dependency or specialized talent requirements

Return JSON strictly in this structure:
{{
  "blindspots": [
    {{
      "question": "Clear, provocative question the user forgot to ask",
      "rationale": "Why this omitted question poses a major operational or financial risk if left unanswered",
      "risk_level": "high | medium | low",
      "category": "vendor_lockin | cost_hidden | rollback_risk | security_exposure | operational"
    }}
  ]
}}
"""
        system = "You are a devil's advocate enterprise strategist. Discover critical unasked questions."
        res = await self.call_llm_json(prompt, system)

        blindspots = res.get("blindspots", [])
        if not blindspots:
            blindspots = self._heuristic_fallback_blindspots(goal)

        return blindspots

    def _heuristic_fallback_blindspots(self, goal: str) -> List[Dict[str, Any]]:
        return [
            {
                "question": "What is the concrete exit and rollback strategy if SLA targets fail in production?",
                "rationale": "Most vendor evaluations only plan for deployment and ignore the cost of untangling data and architectures if things go wrong.",
                "risk_level": "high",
                "category": "rollback_risk"
            },
            {
                "question": "What are the hidden data egress or secondary API call costs at 5x current traffic?",
                "rationale": "Base subscription or server fees often look modest, but network transit and auxiliary API charges can multiply exponentially under real-world scale.",
                "risk_level": "high",
                "category": "cost_hidden"
            },
            {
                "question": "What proprietary formats or SDK dependencies cause irreversible vendor lock-in?",
                "rationale": "If proprietary abstractions are woven across services, switching vendors later could require a multimillion dollar rewrite.",
                "risk_level": "medium",
                "category": "vendor_lockin"
            },
            {
                "question": "Does this solution meet EU GDPR data sovereignty requirements for cross-border data transfer?",
                "rationale": "Regulatory penalties for non-compliant telemetry or backup routing can exceed millions in fines.",
                "risk_level": "medium",
                "category": "security_exposure"
            }
        ]

    def _heuristic_fallback(self, prompt: str) -> Dict[str, Any]:
        match = re.search(r'RESEARCH GOAL:\s*(.*?)\n', prompt)
        goal = match.group(1) if match else "Technology Assessment"
        return {"blindspots": self._heuristic_fallback_blindspots(goal)}
