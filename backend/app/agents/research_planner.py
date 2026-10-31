import re
from typing import List, Dict, Any
from app.agents.base import BaseAgent


class ResearchPlannerAgent(BaseAgent):
    async def decompose_goal(self, goal: str, target_decision: str = "", max_criteria: int = 6) -> List[Dict[str, Any]]:
        prompt = f"""
Decompose this high-stakes research goal into {max_criteria} distinct, mutually exclusive, collectively exhaustive (MECE) evaluation criteria/requirements.

RESEARCH GOAL: {goal}
TARGET DECISION: {target_decision or 'Strategic technical or business decision'}

Return JSON strictly in this structure:
{{
  "requirements": [
    {{
      "requirement_text": "Detailed statement of evaluation requirement",
      "category": "functional | cost | security | compliance | performance | architecture",
      "weight": 1.0 to 3.0
    }}
  ]
}}
"""
        system = "You are a senior enterprise research strategist. Decompose goals into rigorous, actionable criteria."
        res = await self.call_llm_json(prompt, system)

        reqs = res.get("requirements", [])
        if not reqs:
            reqs = self._heuristic_fallback_reqs(goal)

        return reqs

    def _heuristic_fallback_reqs(self, goal: str) -> List[Dict[str, Any]]:
        return [
            {"requirement_text": f"Performance and throughput latency targets for: {goal}", "category": "performance", "weight": 2.0},
            {"requirement_text": f"Operational cost and total cost of ownership (TCO) for: {goal}", "category": "cost", "weight": 2.5},
            {"requirement_text": f"Security standards, data protection and compliance (SOC2/GDPR) for: {goal}", "category": "security", "weight": 2.0},
            {"requirement_text": f"Architectural scalability, failover and high availability for: {goal}", "category": "architecture", "weight": 1.5},
            {"requirement_text": f"Migration effort, developer complexity and rollback strategy for: {goal}", "category": "functional", "weight": 1.5},
        ]

    def _heuristic_fallback(self, prompt: str) -> Dict[str, Any]:
        match = re.search(r'RESEARCH GOAL:\s*(.*?)\n', prompt)
        goal = match.group(1) if match else "Technology Assessment"
        return {"requirements": self._heuristic_fallback_reqs(goal)}
