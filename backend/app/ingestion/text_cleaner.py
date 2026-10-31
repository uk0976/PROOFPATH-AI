import re
import html
import unicodedata
from typing import Optional


def normalize_unicode(text: str) -> str:
    """Normalize unicode characters using NFKC decomposition and recomposition."""
    if not text:
        return ""
    return unicodedata.normalize("NFKC", text)


def remove_control_characters(text: str) -> str:
    """Remove invisible non-printable control characters, preserving newlines and tabs."""
    if not text:
        return ""
    # Strip zero-width chars (e.g., \u200b, \u200c, \u200d, \ufeff)
    text = re.sub(r'[\u200b-\u200f\ufeff]', '', text)
    # Strip ASCII control characters except \t and \n
    text = "".join(ch for ch in text if ch in ('\n', '\t', '\r') or unicodedata.category(ch)[0] != 'C')
    return text


def fix_smart_punctuation(text: str) -> str:
    """Replaces typography-specific quotes, apostrophes, and dashes with standard ASCII equivalents."""
    if not text:
        return ""
    replacements = {
        '\u2018': "'",  # Left single quotation mark
        '\u2019': "'",  # Right single quotation mark
        '\u201A': "'",  # Single low-9 quotation mark
        '\u201B': "'",  # Single high-reversed-9 quotation mark
        '\u201C': '"',  # Left double quotation mark
        '\u201D': '"',  # Right double quotation mark
        '\u201E': '"',  # Double low-9 quotation mark
        '\u201F': '"',  # Double high-reversed-9 quotation mark
        '\u2013': '-',  # En dash
        '\u2014': '--', # Em dash
        '\u2026': '...',# Horizontal ellipsis
        '\u00A0': ' ',  # Non-breaking space
        '\u202F': ' ',  # Narrow no-break space
    }
    for orig, repl in replacements.items():
        text = text.replace(orig, repl)
    return text


def fix_hyphenated_linebreaks(text: str) -> str:
    """Stitches words hyphenated across line breaks back together, e.g., 'govern-\nment' -> 'government'."""
    if not text:
        return ""
    return re.sub(r'(\b[A-Za-z]{2,})-\s*\n\s*([A-Za-z]{2,}\b)', r'\1\2', text)


def strip_html_residue(text: str) -> str:
    """Strips residual HTML/script/style elements and decodes HTML entities."""
    if not text:
        return ""
    # Strip script/style blocks if raw html leaked
    text = re.sub(r'<(script|style|noscript)[^>]*>.*?</\1>', ' ', text, flags=re.DOTALL | re.IGNORECASE)
    # Strip all remaining tags
    text = re.sub(r'<[^>]+>', ' ', text)
    # Unescape HTML entities
    text = html.unescape(text)
    return text


def clean_text(text: Optional[str]) -> str:
    """
    Primary text cleaning pipeline:
    1. Unicode normalization (NFKC)
    2. Smart punctuation harmonization
    3. Control character and zero-width stripping
    4. Hyphenated word repair
    5. HTML entity and tag stripping
    6. Whitespace and newline consolidation
    """
    if not text:
        return ""

    text = normalize_unicode(text)
    text = fix_smart_punctuation(text)
    text = remove_control_characters(text)
    text = fix_hyphenated_linebreaks(text)
    text = strip_html_residue(text)

    # Standardize line endings to \n
    text = text.replace('\r\n', '\n').replace('\r', '\n')

    # Collapse consecutive horizontal whitespace (spaces/tabs) to a single space
    lines = []
    for line in text.split('\n'):
        cleaned_line = re.sub(r'[ \t]+', ' ', line).strip()
        lines.append(cleaned_line)

    text = '\n'.join(lines)

    # Collapse more than two consecutive newlines into exactly two
    text = re.sub(r'\n{3,}', '\n\n', text)

    return text.strip()


def clean_pdf_text(text: Optional[str]) -> str:
    """Specialized cleaner for PDF extractions, removing header/footer artifact markers."""
    if not text:
        return ""
    cleaned = clean_text(text)
    # Remove repetitive page numbering lines like "Page 1 of 12" or "1 / 10" if standing alone
    cleaned = re.sub(r'(?m)^\s*(?:Page\s+\d+(?:\s*(?:of|/)\s*\d+)?|\d+\s*/\s*\d+)\s*$', '', cleaned)
    cleaned = re.sub(r'\n{3,}', '\n\n', cleaned)
    return cleaned.strip()


def clean_web_text(text: Optional[str]) -> str:
    """Specialized cleaner for web scrapings, removing cookie/consent fragments if present."""
    if not text:
        return ""
    cleaned = clean_text(text)
    # Filter common cookie consent lines if separated by newlines
    cookie_patterns = [
        r'(?i)^\s*(?:we use cookies|accept all cookies|cookie policy|manage preferences)\.?\s*$',
        r'(?i)^\s*(?:skip to (?:main )?content|all rights reserved)\.?\s*$',
    ]
    for cp in cookie_patterns:
        cleaned = re.sub(cp, '', cleaned, flags=re.MULTILINE)
    cleaned = re.sub(r'\n{3,}', '\n\n', cleaned)
    return cleaned.strip()
