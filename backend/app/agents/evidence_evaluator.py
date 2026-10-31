from typing import Dict, Any
from app.agents.base import BaseAgent


class EvidenceEvaluatorAgent(BaseAgent):
    async def evaluate_relation(
        self,
        requirement_text: str,
        claim_text: str,
        exact_quote: str
    ) -> Dict[str, Any]:
        prompt = f"""
REQUIREMENT: {requirement_text}
CLAIM: {claim_text}
VERBATIM QUOTE: "{exact_quote}"

TASK:
Determine if this claim SUPPORTS, REFUTES, or is PARTIALLY relevant to the requirement.
Return JSON strictly in this structure:
{{
  "relation_type": "supports | refutes | partial | neutral",
  "relevance_rationale": "One concise sentence explaining how this claim answers the requirement"
}}
"""
        system = "You are a forensic legal and technical evidence evaluator."
        res = await self.call_llm_json(prompt, system)

        relation = res.get("relation_type", "supports")
        rationale = res.get("relevance_rationale", "Evidence addresses the core operational constraint.")

        return {
            "relation_type": relation if relation in ["supports", "refutes", "partial", "neutral"] else "supports",
            "relevance_rationale": rationale
        }
