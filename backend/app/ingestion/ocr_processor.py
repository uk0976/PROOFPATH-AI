import io
import logging
from typing import Optional
from PIL import Image

logger = logging.getLogger(__name__)

try:
    import pytesseract
    TESSERACT_AVAILABLE = True
except ImportError:
    TESSERACT_AVAILABLE = False


def extract_text_from_image_bytes(image_bytes: bytes) -> Optional[str]:
    """
    Attempts OCR on image bytes using pytesseract if available.
    """
    if not TESSERACT_AVAILABLE:
        logger.warning("pytesseract is not installed or available; skipping OCR.")
        return None

    try:
        image = Image.open(io.BytesIO(image_bytes))
        text = pytesseract.image_to_string(image)
        return text.strip() if text else None
    except Exception as e:
        logger.debug(f"OCR execution skipped or failed: {e}")
        return None
