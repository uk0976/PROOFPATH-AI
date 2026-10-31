import os
import uuid
import re
from fastapi import UploadFile
from app.config import settings
from app.core.exceptions import AppException

ALLOWED_EXTENSIONS = {".pdf", ".txt", ".md"}
MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024  # 25MB


def sanitize_filename(filename: str) -> str:
    filename = os.path.basename(filename)
    return re.sub(r'[^a-zA-Z0-9_.-]', '_', filename)


async def validate_and_save_upload(file: UploadFile) -> tuple[str, str, int]:
    """
    Validates extension and size, saves safely to UPLOAD_DIR.
    Returns (sanitized_name, absolute_path, size_bytes).
    """
    if not file.filename:
        raise AppException("Filename is missing from upload.", status_code=400, code="INVALID_FILENAME")

    name = sanitize_filename(file.filename)
    _, ext = os.path.splitext(name)

    if ext.lower() not in ALLOWED_EXTENSIONS:
        raise AppException(
            f"Unsupported file extension '{ext}'. Allowed extensions: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
            status_code=415,
            code="UNSUPPORTED_MEDIA_TYPE"
        )

    content = await file.read()
    size = len(content)

    if size > MAX_FILE_SIZE_BYTES:
        raise AppException(
            f"File size ({size / (1024*1024):.1f}MB) exceeds maximum limit of 25MB.",
            status_code=413,
            code="FILE_TOO_LARGE"
        )

    stored_filename = f"{uuid.uuid4().hex}_{name}"
    file_path = os.path.join(settings.UPLOAD_DIR, stored_filename)

    with open(file_path, "wb") as f:
        f.write(content)

    return name, file_path, size
