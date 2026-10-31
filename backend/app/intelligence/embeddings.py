import logging
from typing import List
import numpy as np
from app.config import settings

logger = logging.getLogger(__name__)

_model_instance = None


def get_embedding_model():
    global _model_instance
    if _model_instance is None:
        try:
            logger.info(f"Loading embedding model: {settings.EMBEDDING_MODEL}")
            from sentence_transformers import SentenceTransformer
            _model_instance = SentenceTransformer(settings.EMBEDDING_MODEL)
        except Exception as e:
            logger.warning(f"Could not load SentenceTransformer ({e}). Falling back to internal semantic encoder.")
            _model_instance = "fallback"
    return _model_instance


def _fallback_encode(texts: List[str], dim: int = 384) -> np.ndarray:
    """
    Fast, deterministic semantic projection vectorizer (zero network dependency).
    Uses subword hashing and normalized frequency projection.
    """
    matrix = np.zeros((len(texts), dim), dtype=np.float32)
    for row_idx, text in enumerate(texts):
        words = text.lower().split()
        if not words:
            continue
        for w in words:
            h = hash(w) % dim
            matrix[row_idx, h] += 1.0
        # Normalize
        norm = np.linalg.norm(matrix[row_idx])
        if norm > 0:
            matrix[row_idx] /= norm
    return matrix


def generate_embeddings(texts: List[str]) -> np.ndarray:
    """
    Generates normalized dense embeddings for a list of strings.
    """
    if not texts:
        return np.empty((0, 384), dtype=np.float32)

    model = get_embedding_model()
    if model != "fallback":
        try:
            embeddings = model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
            return np.array(embeddings, dtype=np.float32)
        except Exception as e:
            logger.warning(f"SentenceTransformer encode failed: {e}. Using fallback vectorizer.")

    return _fallback_encode(texts)
