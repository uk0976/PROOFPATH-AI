import logging
from typing import List, Dict, Any, Tuple
import faiss
import numpy as np
from app.intelligence.embeddings import generate_embeddings

logger = logging.getLogger(__name__)


class FAISSVectorStore:
    def __init__(self, dimension: int = 384):
        self.dimension = dimension
        self.index = faiss.IndexFlatIP(dimension)  # Inner Product with normalized vectors = Cosine Sim
        self.metadata: List[Dict[str, Any]] = []

    def add_documents(self, texts: List[str], metadatas: List[Dict[str, Any]]) -> None:
        if not texts:
            return

        embeddings = generate_embeddings(texts)
        self.index.add(embeddings)
        self.metadata.extend(metadatas)

    def similarity_search(self, query: str, top_k: int = 5) -> List[Tuple[Dict[str, Any], float]]:
        if self.index.ntotal == 0:
            return []

        query_emb = generate_embeddings([query])
        k = min(top_k, self.index.ntotal)
        scores, indices = self.index.search(query_emb, k)

        results = []
        for score, idx in zip(scores[0], indices[0]):
            if idx != -1 and idx < len(self.metadata):
                results.append((self.metadata[idx], float(score)))

        return results

    def clear(self) -> None:
        self.index.reset()
        self.metadata.clear()
