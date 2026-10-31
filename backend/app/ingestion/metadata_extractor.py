import re
import hashlib
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from urllib.parse import urlparse
import dateparser


def compute_sha256(content: Optional[str]) -> Optional[str]:
    """Generates deterministic SHA-256 hash for ingested text or bytes."""
    if content is None:
        return None
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


def count_words(text: Optional[str]) -> int:
    """Calculates alphanumeric word count accurately."""
    if not text:
        return 0
    return len(re.findall(r'\b\w+\b', text))


def count_chars(text: Optional[str]) -> int:
    """Calculates character count including whitespace."""
    if not text:
        return 0
    return len(text)


def extract_domain(uri: Optional[str]) -> Optional[str]:
    """Extracts normalized hostname/domain from a URL, or None if not a URL."""
    if not uri:
        return None
    try:
        parsed = urlparse(uri)
        if parsed.scheme in ("http", "https") and parsed.netloc:
            # Strip port if present
            netloc = parsed.netloc.split(":")[0].lower()
            return netloc
    except Exception:
        pass
    return None


def parse_pdf_date(pdf_date_str: Optional[str]) -> Optional[datetime]:
    """
    Parses PDF date format strings like:
    'D:20240115123000Z' or 'D:20231015120000+00\'00\''
    """
    if not pdf_date_str:
        return None
    try:
        clean = pdf_date_str.strip()
        if clean.startswith("D:"):
            clean = clean[2:]
        # Remove trailing apostrophes from timezone e.g. +00'00'
        clean = clean.replace("'", "")
        # Extract at least YYYYMMDD
        if len(clean) >= 8 and clean[:8].isdigit():
            year = int(clean[:4])
            month = int(clean[4:6])
            day = int(clean[6:8])
            return datetime(year, month, day, tzinfo=timezone.utc)
    except Exception:
        pass
    return dateparser.parse(pdf_date_str)


def extract_date_from_string(text: Optional[str]) -> Optional[datetime]:
    """Finds and parses the first realistic date in a string or text excerpt."""
    if not text:
        return None

    patterns = [
        r'\b(?:20[0-2][0-9]|199[0-9])-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12][0-9]|3[01])\b',
        r'\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+20[0-2][0-9]\b',
        r'\b\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+20[0-2][0-9]\b',
        r'\b20[0-2][0-9]\b',
    ]

    for p in patterns:
        match = re.search(p, text, re.IGNORECASE)
        if match:
            parsed = dateparser.parse(match.group(0))
            if parsed and parsed.year <= datetime.now(timezone.utc).year + 1:
                return parsed

    return None


def extract_source_metadata(
    raw_content: Optional[str],
    cleaned_content: Optional[str],
    source_type: str,
    uri: Optional[str] = None,
    headers: Optional[Dict[str, str]] = None,
    document_metadata: Optional[Dict[str, Any]] = None,
    publication_date_candidate: Optional[datetime] = None,
) -> Dict[str, Any]:
    """
    Synthesizes complete metadata for a source:
    - Domain
    - Publication date & Last modified date
    - Content hash (SHA-256)
    - Word & character counts
    - Extraction timestamp
    - Author / Publisher
    """
    now = datetime.now(timezone.utc)
    target_content = cleaned_content if cleaned_content is not None else (raw_content or "")

    # Domain
    domain = extract_domain(uri) if source_type == "url" else None

    # Publication date
    pub_date = publication_date_candidate
    if not pub_date and document_metadata:
        raw_cd = document_metadata.get("creationDate") or document_metadata.get("CreationDate")
        if raw_cd:
            pub_date = parse_pdf_date(raw_cd)

    if not pub_date and target_content:
        # Check first 2000 characters for a publication date
        pub_date = extract_date_from_string(target_content[:2000])

    # Last modified date
    last_mod_date = None
    if headers:
        for k, v in headers.items():
            if k.lower() == "last-modified" and v:
                last_mod_date = dateparser.parse(v)
                break

    if not last_mod_date and document_metadata:
        raw_md = document_metadata.get("modDate") or document_metadata.get("ModDate")
        if raw_md:
            last_mod_date = parse_pdf_date(raw_md)

    # Author or publisher
    author_or_publisher = None
    if document_metadata:
        author_or_publisher = (
            document_metadata.get("author")
            or document_metadata.get("Author")
            or document_metadata.get("creator")
            or document_metadata.get("Creator")
            or document_metadata.get("producer")
        )

    # Metrics
    w_count = count_words(target_content)
    c_count = count_chars(target_content)
    c_hash = compute_sha256(target_content) if target_content else None

    return {
        "domain": domain,
        "publication_date": pub_date,
        "last_modified_date": last_mod_date,
        "extraction_timestamp": now,
        "content_hash": c_hash,
        "word_count": w_count,
        "char_count": c_count,
        "author_or_publisher": author_or_publisher,
    }
