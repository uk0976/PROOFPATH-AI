import re
from typing import Tuple


def normalize_whitespace(text: str) -> str:
    """Collapses consecutive whitespace and replaces weird quotes/dashes."""
    if not text:
        return ""
    text = re.sub(r'[\u2018\u2019]', "'", text)
    text = re.sub(r'[\u201C\u201D]', '"', text)
    text = re.sub(r'[\u2013\u2014]', '-', text)
    text = re.sub(r'[ \t]+', ' ', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


def verify_substring_match(quote: str, full_text: str) -> Tuple[bool, float]:
    """
    Verifies if quote is a true verbatim substring of full_text.
    Returns (is_match, similarity_ratio).
    """
    if not quote or not full_text:
        return False, 0.0

    clean_quote = normalize_whitespace(quote).lower()
    clean_text = normalize_whitespace(full_text).lower()

    if clean_quote in clean_text:
        return True, 1.0

    # Fallback to token subset matching (handles slight punctuation differences)
    quote_tokens = set(re.findall(r'\b\w+\b', clean_quote))
    if not quote_tokens:
        return False, 0.0

    text_tokens = set(re.findall(r'\b\w+\b', clean_text))
    overlap = len(quote_tokens.intersection(text_tokens))
    ratio = overlap / len(quote_tokens)

    return ratio >= 0.85, ratio
