import re
import logging
from typing import List, Dict, Any, Optional
from app.agents.base import BaseAgent
from app.schemas.claims import ClaimExtractionResponse, ExtractedClaimItem
from app.utils.text import verify_substring_match, normalize_whitespace

logger = logging.getLogger(__name__)


class ClaimExtractorAgent(BaseAgent):
    """
    Forensic Claim Extraction Agent powered by Gemini API.
    Decomposes multi-clause assertions into atomic, independently verifiable claims
    with strict anti-hallucination quote grounding and Pydantic validation.
    """

    async def extract_claims_from_chunk(
        self,
        chunk_text: str,
        source_title: str = "",
        page_number: Optional[int] = None,
        source_id: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Extracts atomic claims from a chunk of text using Gemini API.
        Enforces Pydantic schema validation and verbatim substring verification.
        """
        if not chunk_text or len(chunk_text.strip()) < 15:
            return []

        prompt = f"""
SOURCE DOCUMENT: {source_title}
PAGE NUMBER: {page_number if page_number is not None else 'N/A'}
PASSAGE:
\"\"\"{chunk_text}\"\"\"

TASK:
Extract all independently verifiable atomic claims from this passage.
A compound sentence MUST be decomposed into separate atomic statements.
Example:
Original sentence: "Applicants must be Indian citizens, score at least 60% and satisfy the annual income limit."
Must be decomposed into:
1. "Applicants must be Indian citizens."
2. "Applicants must score at least 60%."
3. "Applicants must satisfy the annual income limit."

RULES:
1. "original_evidence_text" MUST be a word-for-word verbatim quote copied directly from the passage above.
2. "claim_text" must be a clean, standalone, independently verifiable factual statement.
3. Categorize each claim into: "Eligibility", "Academic", "Income", "Documentation", "Deadlines", "Financial", "Technical", "Governance", or "General".
4. Identify "applicable_period" if a year, date, quarter, or timeline is mentioned (or null).
5. Specify "claim_type": "quantitative" (if it contains numbers/percentages), "assertion", "temporal", "caveat", or "recommendation".
6. Specify "extraction_confidence": float between 0.80 and 1.0.

Return JSON adhering strictly to this schema:
{{
  "claims": [
    {{
      "claim_text": "Applicants must be Indian citizens.",
      "category": "Eligibility",
      "original_evidence_text": "Applicants must be Indian citizens, score at least 60% and satisfy the annual income limit.",
      "page_number": {page_number if page_number is not None else 'null'},
      "paragraph_reference": "Section 1",
      "applicable_period": "2024",
      "extraction_confidence": 0.98,
      "claim_type": "assertion"
    }}
  ]
}}
"""
        system = (
            "You are a forensic legal & intelligence auditor. Your mission is to extract atomic, "
            "independently verifiable factual statements with zero hallucination and 100% exact verbatim quotes."
        )

        verified_claims: List[Dict[str, Any]] = []

        try:
            res = await self.call_llm_json(prompt, system)
            # Validate output using Pydantic
            parsed = ClaimExtractionResponse.model_validate(res)

            for item in parsed.claims:
                quote = item.original_evidence_text.strip()
                is_match, ratio = verify_substring_match(quote, chunk_text)

                # Anti-hallucination validation: ensure the quote exists in the source text
                if not is_match and ratio < 0.70:
                    logger.debug(f"Quote rejected due to lack of verbatim grounding: '{quote[:60]}...'")
                    continue

                claim_dict = {
                    "source_id": source_id,
                    "claim_text": item.claim_text.strip(),
                    "category": item.category.strip() or "General",
                    "original_evidence_text": quote,
                    "exact_quote": quote,
                    "page_number": item.page_number or page_number,
                    "paragraph_reference": item.paragraph_reference or (f"Page {page_number}" if page_number else None),
                    "applicable_period": item.applicable_period,
                    "date_reference": item.applicable_period,
                    "extraction_confidence": float(item.extraction_confidence),
                    "confidence_score": float(item.extraction_confidence),
                    "claim_type": item.claim_type,
                    "is_verified": is_match or (ratio >= 0.85),
                }
                verified_claims.append(claim_dict)

        except Exception as e:
            logger.warning(f"Gemini API claim extraction error ({e}). Executing heuristic atomic decomposer.")

        # If LLM returned no claims or failed, use deterministic heuristic fallback
        if not verified_claims:
            verified_claims = self._heuristic_atomic_decomposition(
                chunk_text=chunk_text,
                source_id=source_id,
                page_number=page_number
            )

        return verified_claims

    # Compatibility method for existing pipeline call
    async def extract_claims(self, chunk_text: str, source_title: str = "") -> List[Dict[str, Any]]:
        return await self.extract_claims_from_chunk(chunk_text=chunk_text, source_title=source_title)

    def _heuristic_atomic_decomposition(
        self,
        chunk_text: str,
        source_id: Optional[str] = None,
        page_number: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Deterministic, zero-hallucination atomic decomposition parser.
        Splits text into sentences, detects compound clauses ('and', 'or', commas),
        and extracts atomic statements with exact verbatim quotes.
        """
        sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', chunk_text) if len(s.strip()) > 15]
        extracted: List[Dict[str, Any]] = []

        for sentence in sentences:
            # Check for compound clauses e.g. "Applicants must be X, score Y and satisfy Z"
            decomposed_clauses = self._split_compound_sentence(sentence)

            for clause in decomposed_clauses:
                # Infer category
                cat = "General"
                lower = clause.lower()
                if any(w in lower for w in ["citizen", "eligible", "eligibility", "resident", "qualified"]):
                    cat = "Eligibility"
                elif any(w in lower for w in ["gpa", "grade", "score", "percent", "%", "academic", "degree"]):
                    cat = "Academic"
                elif any(w in lower for w in ["income", "household", "salary", "gross", "$", "usd", "tax"]):
                    cat = "Income"
                elif any(w in lower for w in ["document", "transcript", "certificate", "id proof", "submit"]):
                    cat = "Documentation"
                elif any(w in lower for w in ["deadline", "date", "window", "close", "before", "annual"]):
                    cat = "Deadlines"
                elif any(w in lower for w in ["fee", "tuition", "cost", "grant", "stipend", "disbursement"]):
                    cat = "Financial"
                elif any(w in lower for w in ["kubernetes", "latency", "eks", "cluster", "aws", "architecture"]):
                    cat = "Technical"

                # Infer claim type
                claim_type = "quantitative" if re.search(r'\d+', clause) else "assertion"

                # Extract date reference if present
                date_match = re.search(r'\b(20[2-3][0-9]|Q[1-4]\s*20[2-3][0-9]|FY\s*20[2-3][0-9])\b', clause)
                applicable_period = date_match.group(0) if date_match else None

                extracted.append({
                    "source_id": source_id,
                    "claim_text": clause.strip(),
                    "category": cat,
                    "original_evidence_text": sentence,
                    "exact_quote": sentence,
                    "page_number": page_number,
                    "paragraph_reference": f"Page {page_number}" if page_number else None,
                    "applicable_period": applicable_period,
                    "date_reference": applicable_period,
                    "extraction_confidence": 0.90,
                    "confidence_score": 0.90,
                    "claim_type": claim_type,
                    "is_verified": True,
                })

        return extracted

    def _split_compound_sentence(self, sentence: str) -> List[str]:
        """
        Splits compound sentences into atomic statements.
        Example:
        'Applicants must be Indian citizens, score at least 60% and satisfy the annual income limit.'
        Produces:
        - 'Applicants must be Indian citizens.'
        - 'Applicants must score at least 60%.'
        - 'Applicants must satisfy the annual income limit.'
        """
        # Look for subject + modal pattern e.g. "Applicants must ... , ... and ..."
        modal_match = re.match(r'^([A-Z][a-zA-Z\s]+?\b(?:must|shall|should|need to|are required to|cannot|may not))\s+(.+)$', sentence, re.IGNORECASE)
        if modal_match:
            prefix = modal_match.group(1).strip()
            rest = modal_match.group(2).strip().rstrip('.?!')
            # Split by commas and 'and' / 'or'
            sub_clauses = re.split(r',\s*(?:and\s+|or\s+)?|\s+and\s+|\s+or\s+', rest)
            clean_sub_clauses = [c.strip() for c in sub_clauses if len(c.strip()) > 5]
            if len(clean_sub_clauses) > 1:
                results = []
                for sc in clean_sub_clauses:
                    # If clause doesn't start with a verb, keep prefix
                    full_clause = f"{prefix} {sc}."
                    results.append(full_clause)
                return results

        return [sentence]

    def _heuristic_fallback(self, prompt: str) -> Dict[str, Any]:
        match = re.search(r'PASSAGE:\s*"""(.*?)"""', prompt, re.DOTALL)
        text = match.group(1) if match else ""
        claims = self._heuristic_atomic_decomposition(text)
        return {"claims": claims}
