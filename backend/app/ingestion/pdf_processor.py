import os
import logging
from typing import Dict, Any, List, Optional
import pymupdf as fitz
from app.utils.chunker import chunk_text_with_provenance
from app.ingestion.ocr_processor import extract_text_from_image_bytes

logger = logging.getLogger(__name__)


class PDFProcessor:
    @staticmethod
    def process_pdf(file_path: str) -> Dict[str, Any]:
        """
        Extracts clean text, page numbers, metadata and chunks from a PDF.
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"PDF file not found at: {file_path}")

        doc = fitz.open(file_path)
        total_pages = len(doc)
        full_text_pages = []
        all_chunks: List[Dict[str, Any]] = []

        chunk_counter = 0

        for page_idx in range(total_pages):
            page = doc[page_idx]
            page_num = page_idx + 1
            page_text = page.get_text("text").strip()

            # If page is an image or scanned (very short text)
            if len(page_text) < 30:
                pix = page.get_pixmap(dpi=150)
                ocr_text = extract_text_from_image_bytes(pix.tobytes("png"))
                if ocr_text:
                    page_text = ocr_text

            if page_text:
                full_text_pages.append(f"--- Page {page_num} ---\n{page_text}")
                page_chunks = chunk_text_with_provenance(page_text, max_words=350, overlap_words=40, page_number=page_num)
                for c in page_chunks:
                    c["chunk_index"] = chunk_counter
                    chunk_counter += 1
                    all_chunks.append(c)

        doc_metadata = doc.metadata or {}
        title = doc_metadata.get("title") or os.path.basename(file_path)
        author = doc_metadata.get("author") or doc_metadata.get("creator")
        creation_date = doc_metadata.get("creationDate")

        doc.close()

        cleaned_full_text = "\n\n".join(full_text_pages)

        return {
            "title": title,
            "author": author,
            "raw_creation_date": creation_date,
            "page_count": total_pages,
            "full_text": cleaned_full_text,
            "chunks": all_chunks,
        }
