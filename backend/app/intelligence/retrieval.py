from typing import List, Dict, Any, Tuple
from app.intelligence.vector_store import FAISSVectorStore


class RetrievalService:
    def __init__(self, vector_store: FAISSVectorStore):
        self.vector_store = vector_store

    def retrieve_relevant_chunks(self, requirement_text: str, top_k: int = 4) -> List[Tuple[Dict[str, Any], float]]:
        return self.vector_store.similarity_search(requirement_text, top_k=top_k)
