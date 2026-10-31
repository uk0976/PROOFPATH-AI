import os
import logging
from typing import Dict, Any, List, Optional
import pymupdf as fitz

from app.ingestion.text_cleaner import clean_pdf_text, clean_text
from app.ingestion.ocr_processor import extract_text_from_image_bytes, is_ocr_available
from app.utils.chunker import chunk_text_with_provenance
from app.core.exceptions import IngestionError

logger = logging.getLogger(__name__)

# Max PDF file size: 50 MB
MAX_PDF_FILE_SIZE_BYTES = 50 * 1024 * 1024
# Scanned page detection threshold in characters
SCANNED_PAGE_CHAR_THRESHOLD = 50


class PDFProcessor:
    @staticmethod
    def validate_pdf_file(file_path: str) -> None:
        """Validates that the file exists, conforms to file size limits, and contains PDF magic bytes."""
        if not os.path.exists(file_path):
            raise IngestionError(f"PDF file not found at: {file_path}")

        file_size = os.path.getsize(file_path)
        if file_size == 0:
            raise IngestionError("PDF file is completely empty (0 bytes).")

        if file_size > MAX_PDF_FILE_SIZE_BYTES:
            raise IngestionError(f"PDF file size ({file_size / (1024*1024):.1f} MB) exceeds maximum allowed size of 50 MB.")

        with open(file_path, "rb") as f:
            header = f.read(1024)
            if b"%PDF-" not in header:
                raise IngestionError("Invalid file header: file is not a valid PDF document.")

    @classmethod
    def process_pdf(cls, file_path: str) -> Dict[str, Any]:
        """
        Processes a PDF document:
        - Validates file integrity and magic bytes
        - Iterates through all pages preserving page numbers
        - Detects scanned / image pages and applies OCR where supported
        - Extracts document metadata
        - Cleans text and generates granular chunks with provenance
        """
        cls.validate_pdf_file(file_path)

        try:
            doc = fitz.open(file_path)
        except Exception as e:
            raise IngestionError(f"Corrupted or unreadable PDF document: {str(e)}")

        try:
            total_pages = len(doc)
            if total_pages == 0:
                raise IngestionError("PDF document has 0 pages.")

            full_text_pages: List[str] = []
            all_chunks: List[Dict[str, Any]] = []
            chunk_counter = 0
            scanned_pages_count = 0
            ocr_applied_count = 0
            ocr_ready = is_ocr_available()

            for page_idx in range(total_pages):
                page = doc[page_idx]
                page_num = page_idx + 1

                # 1. Native text extraction
                raw_page_text = page.get_text("text").strip()
                page_text = clean_text(raw_page_text)
                is_scanned = False
                is_ocr = False

                # 2. Check for scanned / image page
                images_in_page = page.get_images()
                if len(page_text) < SCANNED_PAGE_CHAR_THRESHOLD and len(images_in_page) > 0:
                    is_scanned = True
                    scanned_pages_count += 1

                    if ocr_ready:
                        try:
                            # Render page at 200 DPI for high-fidelity OCR
                            pix = page.get_pixmap(dpi=200)
                            ocr_result = extract_text_from_image_bytes(pix.tobytes("png"))
                            if ocr_result and len(ocr_result.strip()) > len(page_text):
                                page_text = clean_text(ocr_result)
                                is_ocr = True
                                ocr_applied_count += 1
                        except Exception as ocr_err:
                            logger.warning(f"OCR failed for page {page_num}: {ocr_err}")

                if page_text:
                    full_text_pages.append(f"--- Page {page_num} ---\n{page_text}")
                    page_chunks = chunk_text_with_provenance(
                        page_text,
                        max_words=350,
                        overlap_words=40,
                        page_number=page_num
                    )
                    for c in page_chunks:
                        c["chunk_index"] = chunk_counter
                        c["is_ocr"] = is_ocr
                        chunk_counter += 1
                        all_chunks.append(c)

            doc_metadata = doc.metadata or {}
            title = doc_metadata.get("title") or os.path.basename(file_path)
            author = doc_metadata.get("author") or doc_metadata.get("creator")
            creation_date = doc_metadata.get("creationDate")
            mod_date = doc_metadata.get("modDate")

            cleaned_full_text = clean_pdf_text("\n\n".join(full_text_pages))

            return {
                "title": title,
                "author": author,
                "raw_creation_date": creation_date,
                "raw_mod_date": mod_date,
                "page_count": total_pages,
                "scanned_pages_count": scanned_pages_count,
                "ocr_applied_count": ocr_applied_count,
                "full_text": cleaned_full_text,
                "chunks": all_chunks,
                "document_metadata": doc_metadata,
            }
        finally:
            doc.close()
