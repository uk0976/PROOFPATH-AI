import io
import os
import logging
from typing import Optional, Tuple, Union
from PIL import Image, ImageOps, ImageFilter

logger = logging.getLogger(__name__)

# Track OCR capability
_OCR_INITIALIZED = False
_OCR_AVAILABLE = False
_OCR_VERSION = None


def _check_and_init_tesseract() -> Tuple[bool, Optional[str]]:
    global _OCR_INITIALIZED, _OCR_AVAILABLE, _OCR_VERSION
    if _OCR_INITIALIZED:
        return _OCR_AVAILABLE, _OCR_VERSION

    _OCR_INITIALIZED = True
    try:
        import pytesseract
        # On Windows, check common default install locations if not in PATH
        if os.name == 'nt':
            common_windows_paths = [
                os.environ.get("TESSERACT_CMD"),
                r"C:\Program Files\Tesseract-OCR\tesseract.exe",
                r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
                os.path.expanduser(r"~\AppData\Local\Programs\Tesseract-OCR\tesseract.exe"),
            ]
            for candidate in common_windows_paths:
                if candidate and os.path.isfile(candidate):
                    pytesseract.pytesseract.tesseract_cmd = candidate
                    break

        version = pytesseract.get_tesseract_version()
        _OCR_AVAILABLE = True
        _OCR_VERSION = str(version)
        logger.info(f"Tesseract OCR is available and initialized (version {_OCR_VERSION}).")
        return True, _OCR_VERSION
    except Exception as e:
        _OCR_AVAILABLE = False
        _OCR_VERSION = None
        logger.info(f"Tesseract OCR is not available on this host: {e}")
        return False, None


def is_ocr_available() -> bool:
    """Returns True if Tesseract OCR is installed and operational."""
    available, _ = _check_and_init_tesseract()
    return available


def extract_text_from_image_bytes(
    image_input: Union[bytes, Image.Image],
    enhance_for_ocr: bool = True
) -> Optional[str]:
    """
    Extracts text from image bytes or a PIL Image using Tesseract OCR.
    Applies grayscale and contrast enhancements when enhance_for_ocr is True.
    Returns None if OCR is unavailable or fails.
    """
    available, _ = _check_and_init_tesseract()
    if not available:
        return None

    try:
        import pytesseract

        if isinstance(image_input, bytes):
            image = Image.open(io.BytesIO(image_input))
        else:
            image = image_input

        # Image enhancement for scanned documents
        if enhance_for_ocr:
            # Convert to grayscale
            if image.mode not in ('L', '1'):
                image = image.convert('L')
            # Increase contrast
            image = ImageOps.autocontrast(image)

        # Run OCR with page segmentation mode 3 (Fully automatic page segmentation)
        custom_config = r'--oem 3 --psm 3'
        text = pytesseract.image_to_string(image, config=custom_config)
        cleaned = text.strip() if text else ""
        return cleaned if cleaned else None
    except Exception as e:
        logger.debug(f"OCR execution skipped or encountered an error: {e}")
        return None
