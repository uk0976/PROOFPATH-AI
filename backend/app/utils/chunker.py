from typing import List, Dict, Any, Optional
from app.utils.text import normalize_whitespace


def chunk_text_with_provenance(
    text: str,
    max_words: int = 400,
    overlap_words: int = 50,
    page_number: Optional[int] = None
) -> List[Dict[str, Any]]:
    """
    Chunks document text preserving word count, offsets, and page numbers.
    """
    normalized = normalize_whitespace(text)
    words = normalized.split()

    if not words:
        return []

    chunks = []
    chunk_index = 0
    step = max(1, max_words - overlap_words)

    for i in range(0, len(words), step):
        chunk_words = words[i:i + max_words]
        chunk_text = " ".join(chunk_words)

        chunks.append({
            "chunk_index": chunk_index,
            "text_content": chunk_text,
            "page_number": page_number,
            "token_count": len(chunk_words),
        })
        chunk_index += 1

        if i + max_words >= len(words):
            break

    return chunks
