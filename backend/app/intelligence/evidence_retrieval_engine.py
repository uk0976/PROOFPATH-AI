import re
import logging
from typing import List, Dict, Any, Tuple, Optional
import numpy as np
from sqlalchemy.orm import Session

from app.models import (
    ResearchSession,
    Source,
    DocumentChunk,
    Requirement,
    AtomicClaim,
    EvidenceLink,
)
from app.intelligence.vector_store import FAISSVectorStore
from app.intelligence.embeddings import generate_embeddings
from app.utils.text import normalize_whitespace

logger = logging.getLogger(__name__)


def compute_keyword_overlap_score(query: str, text: str) -> float:
    """
    Computes lexical token overlap score with emphasis on numbers and specific entities.
    Returns float in range [0.0, 1.0].
    """
    if not query or not text:
        return 0.0

    q_tokens = set(re.findall(r'\b[a-zA-Z0-9$%]+\b', query.lower()))
    if not q_tokens:
        return 0.0

    t_tokens = set(re.findall(r'\b[a-zA-Z0-9$%]+\b', text.lower()))
    if not t_tokens:
        return 0.0

    common = q_tokens.intersection(t_tokens)

    # Give extra weight to numeric tokens (dates, percentages, limits)
    weight_total = 0.0
    weight_match = 0.0
    for tok in q_tokens:
        w = 2.0 if re.search(r'\d', tok) else 1.0
        weight_total += w
        if tok in common:
            weight_match += w

    return weight_match / weight_total if weight_total > 0 else 0.0


class EvidenceRetrievalEngine:
    """
    Hybrid Semantic & Keyword Evidence Retrieval Engine.
    Combines dense SentenceTransformer vector search in FAISS with sparse lexical matching,
    metadata filtering, passage ranking, and requirement-to-claim mapping.
    """

    def __init__(self, dimension: int = 384):
        self.vector_store = FAISSVectorStore(dimension=dimension)
        self.chunk_records: List[Dict[str, Any]] = []

    def index_chunks(self, chunks: List[DocumentChunk]) -> int:
        """Indexes document chunks into FAISS with complete provenance metadata."""
        self.vector_store.clear()
        self.chunk_records.clear()

        if not chunks:
            return 0

        texts = []
        metadatas = []

        for c in chunks:
            src = c.source
            text = c.text_content
            meta = {
                "chunk_id": c.id,
                "source_id": c.source_id,
                "source_title": src.title if src else "Source Document",
                "source_type": src.source_type if src else "text",
                "source_uri": src.uri if src else None,
                "source_domain": getattr(src, "domain", None),
                "page_number": c.page_number,
                "token_count": c.token_count,
                "text_content": text,
            }
            texts.append(text)
            metadatas.append(meta)
            self.chunk_records.append(meta)

        self.vector_store.add_documents(texts, metadatas)
        logger.info(f"Indexed {len(texts)} chunks into FAISS vector store.")
        return len(texts)

    def retrieve_relevant_passages(
        self,
        query: str,
        top_k: int = 5,
        source_type_filter: Optional[str] = None,
        source_id_filter: Optional[str] = None,
    ) -> List[Tuple[Dict[str, Any], float]]:
        """
        Executes hybrid retrieval:
        1. Dense semantic similarity search via FAISS
        2. Sparse keyword matching
        3. Reciprocal weighted fusion
        4. Metadata filtering
        """
        if not query or self.vector_store.index.ntotal == 0:
            return []

        # Retrieve a broader pool from FAISS
        dense_results = self.vector_store.similarity_search(query, top_k=min(top_k * 3, 20))

        hybrid_ranked: List[Tuple[Dict[str, Any], float]] = []

        for meta, semantic_sim in dense_results:
            # Metadata filtering
            if source_type_filter and meta.get("source_type") != source_type_filter:
                continue
            if source_id_filter and meta.get("source_id") != source_id_filter:
                continue

            # Calculate keyword overlap
            keyword_score = compute_keyword_overlap_score(query, meta.get("text_content", ""))

            # Normalize semantic similarity from [-1, 1] to [0, 1]
            norm_semantic = max(0.0, min(1.0, (semantic_sim + 1.0) / 2.0))

            # Hybrid score: 70% semantic, 30% exact keywords
            combined_score = (0.70 * norm_semantic) + (0.30 * keyword_score)

            hybrid_ranked.append((meta, float(combined_score)))

        # Sort descending by hybrid score
        hybrid_ranked.sort(key=lambda x: x[1], reverse=True)
        return hybrid_ranked[:top_k]

    @staticmethod
    def match_claims_to_requirement(
        requirement: Requirement,
        claims: List[AtomicClaim],
        similarity_threshold: float = 0.30,
        top_k: int = 6
    ) -> List[Tuple[AtomicClaim, str, str, float]]:
        """
        Matches atomic claims against a specific requirement.
        Returns a list of tuples: (claim, relation_type, relevance_rationale, score).
        Relation types: 'supports', 'refutes', 'partial', 'neutral'.
        """
        if not claims:
            return []

        req_query = f"{requirement.requirement_text} {requirement.question or ''} {requirement.category or ''}"
        req_emb = generate_embeddings([req_query])[0]

        claim_texts = [f"{c.category}: {c.claim_text}" for c in claims]
        claim_embeddings = generate_embeddings(claim_texts)

        # Cosine similarity (dot product of normalized embeddings)
        sim_scores = np.dot(claim_embeddings, req_emb)

        matched: List[Tuple[AtomicClaim, str, str, float]] = []

        for idx, sim in enumerate(sim_scores):
            claim = claims[idx]
            lex_score = compute_keyword_overlap_score(req_query, claim.claim_text)
            norm_sim = max(0.0, min(1.0, (float(sim) + 1.0) / 2.0))
            score = (0.75 * norm_sim) + (0.25 * lex_score)

            # Category boost
            if claim.category and requirement.category and claim.category.lower() == requirement.category.lower():
                score = min(1.0, score + 0.10)

            if score >= similarity_threshold:
                # Infer relation type
                lower_claim = claim.claim_text.lower()
                relation = "supports"
                if any(w in lower_claim for w in ["ineligible", "not permitted", "cannot", "exceeds", "prohibited", "disqualified"]):
                    relation = "refutes"
                elif score < 0.45:
                    relation = "partial"

                rationale = (
                    f"Directly addresses {requirement.category.lower()} criteria: "
                    f"'{claim.claim_text}' with {score*100:.1f}% semantic relevance."
                )

                matched.append((claim, relation, rationale, score))

        matched.sort(key=lambda x: x[3], reverse=True)
        return matched[:top_k]

    @classmethod
    def execute_session_evidence_mapping(
        cls,
        db: Session,
        session_id: str,
        similarity_threshold: float = 0.30,
        top_k: int = 5
    ) -> Dict[str, Any]:
        """
        Executes end-to-end evidence retrieval and requirement mapping for a research session:
        1. Retrieves all DocumentChunks and AtomicClaims for session
        2. Indexes chunks in FAISS
        3. Maps claims to requirements and saves EvidenceLink rows in SQLite
        4. Updates Requirement status (covered, partial, uncovered, conflict)
        5. Computes overall coverage and evidence metrics
        """
        session = db.query(ResearchSession).filter(ResearchSession.id == session_id).first()
        if not session:
            raise ValueError(f"Research session {session_id} not found.")

        # 1. Fetch chunks & claims
        chunks = (
            db.query(DocumentChunk)
            .join(Source)
            .filter(Source.session_id == session_id, Source.processing_status != "failed")
            .all()
        )
        claims = (
            db.query(AtomicClaim)
            .join(DocumentChunk)
            .join(Source)
            .filter(Source.session_id == session_id)
            .all()
        )
        requirements = (
            db.query(Requirement)
            .filter(Requirement.session_id == session_id)
            .order_by(Requirement.order_index)
            .all()
        )

        engine = cls()
        engine.index_chunks(chunks)

        # Clear existing evidence links for idempotency
        db.query(EvidenceLink).filter(
            EvidenceLink.requirement_id.in_([r.id for r in requirements])
        ).delete(synchronize_session=False)
        db.commit()

        links_created = 0
        covered_count = 0
        partial_count = 0
        uncovered_count = 0

        for req in requirements:
            matched_claims = engine.match_claims_to_requirement(
                requirement=req,
                claims=claims,
                similarity_threshold=similarity_threshold,
                top_k=top_k
            )

            support_count = 0
            has_refutation = False

            for claim, rel_type, rationale, score in matched_claims:
                link = EvidenceLink(
                    requirement_id=req.id,
                    claim_id=claim.id,
                    relation_type=rel_type,
                    relevance_rationale=rationale,
                    similarity_score=float(score),
                )
                db.add(link)
                links_created += 1

                if rel_type == "supports":
                    support_count += 1
                elif rel_type == "refutes":
                    has_refutation = True

            # Update requirement status
            if has_refutation:
                req.status = "conflict"
            elif support_count >= 2:
                req.status = "covered"
                covered_count += 1
            elif support_count == 1:
                req.status = "partial"
                partial_count += 1
            else:
                req.status = "uncovered"
                uncovered_count += 1

        db.commit()

        total_reqs = len(requirements)
        coverage_pct = ((covered_count + (0.5 * partial_count)) / total_reqs * 100.0) if total_reqs > 0 else 0.0

        return {
            "session_id": session_id,
            "chunks_indexed": len(chunks),
            "claims_analyzed": len(claims),
            "requirements_evaluated": total_reqs,
            "evidence_links_created": links_created,
            "covered_requirements": covered_count,
            "partial_requirements": partial_count,
            "uncovered_requirements": uncovered_count,
            "coverage_percentage": round(coverage_pct, 1),
        }
