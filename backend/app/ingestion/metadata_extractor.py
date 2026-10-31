import re
from datetime import datetime
from typing import Optional, Tuple
import dateparser


def extract_date_from_string(text: str) -> Optional[datetime]:
    """
    Finds and parses the first realistic date in a string.
    """
    if not text:
        return None

    # Common year/month patterns
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
            if parsed and parsed.year <= datetime.utcnow().year + 1:
                return parsed

    return None
