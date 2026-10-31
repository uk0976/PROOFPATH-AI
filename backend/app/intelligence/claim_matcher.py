from typing import List, Dict, Any, Tuple
import numpy as np
from app.intelligence.embeddings import generate_embeddings


class ClaimMatcher:
    @staticmethod
    def match_claims_to_requirement(
        requirement_text: str,
        claims: List[Dict[str, Any]],
        similarity_threshold: float = 0.35,
        top_k: int = 6
    ) -> List[Tuple[Dict[str, Any], float]]:
        """
        Computes cosine similarity between requirement text and claims.
        Returns matching claims above threshold.
        """
        if not claims:
            return []

        req_embedding = generate_embeddings([requirement_text])[0]
        claim_texts = [c["claim_text"] for c in claims]
        claim_embeddings = generate_embeddings(claim_texts)

        # Dot product of normalized vectors
        scores = np.dot(claim_embeddings, req_embedding)

        matched = []
        for idx, score in enumerate(scores):
            if score >= similarity_threshold:
                matched.append((claims[idx], float(score)))

        # Sort descending by similarity score
        matched.sort(key=lambda x: x[1], reverse=True)
        return matched[:top_k]
