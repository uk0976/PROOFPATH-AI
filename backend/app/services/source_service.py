import os
import json
import logging
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.models import ResearchSession, Source, DocumentChunk
from app.ingestion.web_scraper import WebScraper
from app.ingestion.pdf_processor import PDFProcessor
from app.ingestion.text_cleaner import clean_text
from app.ingestion.metadata_extractor import extract_source_metadata, extract_domain
from app.utils.chunker import chunk_text_with_provenance
from app.core.exceptions import NotFoundError, IngestionError

logger = logging.getLogger(__name__)


class SourceService:
    @staticmethod
    def _create_chunks_for_source(db: Session, source_id: str, chunks_data: List[Dict[str, Any]]) -> None:
        """Helper to batch create DocumentChunk rows for a source."""
        for c_data in chunks_data:
            chunk = DocumentChunk(
                source_id=source_id,
                chunk_index=c_data["chunk_index"],
                text_content=c_data["text_content"],
                page_number=c_data.get("page_number"),
                start_char=c_data.get("start_char"),
                end_char=c_data.get("end_char"),
                token_count=c_data.get("token_count", 0),
            )
            db.add(chunk)

    @classmethod
    async def ingest_url(
        cls,
        db: Session,
        session_id: str,
        url: str,
        title: Optional[str] = None,
        save_on_failure: bool = False,
    ) -> Source:
        """
        Scrapes and ingests a single web URL into the research session.
        If save_on_failure is True, persists a failed Source record with error details.
        """
        session = db.query(ResearchSession).filter(ResearchSession.id == session_id).first()
        if not session:
            raise NotFoundError("ResearchSession", session_id)

        clean_url = url.strip()
        domain = extract_domain(clean_url)
        now = datetime.now(timezone.utc)

        try:
            scrape_result = await WebScraper.scrape_url(clean_url)
            full_text = scrape_result.get("full_text", "")
            meta = extract_source_metadata(
                raw_content=full_text,
                cleaned_content=full_text,
                source_type="url",
                uri=clean_url,
                headers=scrape_result.get("headers"),
                publication_date_candidate=scrape_result.get("publication_date"),
            )

            source = Source(
                session_id=session_id,
                source_type="url",
                title=title or scrape_result.get("title") or clean_url,
                uri=clean_url,
                domain=domain,
                raw_content=full_text,
                cleaned_content=full_text,
                publication_date=meta.get("publication_date"),
                last_modified_date=meta.get("last_modified_date") or scrape_result.get("last_modified_date"),
                extraction_timestamp=meta.get("extraction_timestamp") or now,
                author_or_publisher=scrape_result.get("author") or meta.get("author_or_publisher"),
                content_hash=meta.get("content_hash"),
                word_count=meta.get("word_count", 0),
                char_count=meta.get("char_count", 0),
                processing_status="processed",
                error_details=None,
            )
            db.add(source)
            db.commit()
            db.refresh(source)

            cls._create_chunks_for_source(db, source.id, scrape_result.get("chunks", []))
            db.commit()
            db.refresh(source)
            return source

        except Exception as e:
            err_msg = str(e)
            logger.warning(f"URL ingestion failed for '{clean_url}': {err_msg}")
            if save_on_failure:
                failed_source = Source(
                    session_id=session_id,
                    source_type="url",
                    title=title or clean_url,
                    uri=clean_url,
                    domain=domain,
                    extraction_timestamp=now,
                    processing_status="failed",
                    error_details=err_msg,
                )
                db.add(failed_source)
                db.commit()
                db.refresh(failed_source)
                return failed_source
            raise IngestionError(f"Failed to scrape URL: {err_msg}")

    @classmethod
    async def ingest_urls_batch(
        cls,
        db: Session,
        session_id: str,
        urls: List[str],
    ) -> List[Source]:
        """Ingests multiple web URLs in batch, preserving individual failure states."""
        session = db.query(ResearchSession).filter(ResearchSession.id == session_id).first()
        if not session:
            raise NotFoundError("ResearchSession", session_id)

        results: List[Source] = []
        for url in urls:
            clean = url.strip()
            if not clean:
                continue
            src = await cls.ingest_url(db, session_id, clean, save_on_failure=True)
            results.append(src)
        return results

    @classmethod
    def ingest_pdf(
        cls,
        db: Session,
        session_id: str,
        file_path: str,
        filename: str,
        title: Optional[str] = None,
        save_on_failure: bool = False,
    ) -> Source:
        """Processes and ingests a single PDF file on disk."""
        session = db.query(ResearchSession).filter(ResearchSession.id == session_id).first()
        if not session:
            raise NotFoundError("ResearchSession", session_id)

        now = datetime.now(timezone.utc)

        try:
            proc_result = PDFProcessor.process_pdf(file_path)
            full_text = proc_result.get("full_text", "")
            doc_meta = proc_result.get("document_metadata", {})

            meta = extract_source_metadata(
                raw_content=full_text,
                cleaned_content=full_text,
                source_type="pdf",
                uri=filename,
                document_metadata=doc_meta,
            )

            source = Source(
                session_id=session_id,
                source_type="pdf",
                title=title or proc_result.get("title") or filename,
                uri=filename,
                storage_path=file_path,
                raw_content=full_text,
                cleaned_content=full_text,
                publication_date=meta.get("publication_date"),
                last_modified_date=meta.get("last_modified_date"),
                extraction_timestamp=meta.get("extraction_timestamp") or now,
                author_or_publisher=proc_result.get("author") or meta.get("author_or_publisher"),
                metadata_json=json.dumps({
                    "page_count": proc_result.get("page_count", 0),
                    "scanned_pages_count": proc_result.get("scanned_pages_count", 0),
                    "ocr_applied_count": proc_result.get("ocr_applied_count", 0),
                }),
                content_hash=meta.get("content_hash"),
                word_count=meta.get("word_count", 0),
                char_count=meta.get("char_count", 0),
                processing_status="processed",
                error_details=None,
            )
            db.add(source)
            db.commit()
            db.refresh(source)

            cls._create_chunks_for_source(db, source.id, proc_result.get("chunks", []))
            db.commit()
            db.refresh(source)
            return source

        except Exception as e:
            err_msg = str(e)
            logger.warning(f"PDF extraction failed for '{filename}': {err_msg}")
            if save_on_failure:
                failed_source = Source(
                    session_id=session_id,
                    source_type="pdf",
                    title=title or filename,
                    uri=filename,
                    storage_path=file_path,
                    extraction_timestamp=now,
                    processing_status="failed",
                    error_details=err_msg,
                )
                db.add(failed_source)
                db.commit()
                db.refresh(failed_source)
                return failed_source
            if os.path.exists(file_path):
                try:
                    os.remove(file_path)
                except OSError:
                    pass
            raise IngestionError(f"Failed to extract document contents: {err_msg}")

    @classmethod
    def ingest_plain_text(
        cls,
        db: Session,
        session_id: str,
        title: str,
        content: str,
    ) -> Source:
        """Cleans and ingests raw pasted text or memorandum."""
        session = db.query(ResearchSession).filter(ResearchSession.id == session_id).first()
        if not session:
            raise NotFoundError("ResearchSession", session_id)

        cleaned = clean_text(content)
        if not cleaned:
            raise IngestionError("Provided text document contains no readable alphanumeric characters.")

        now = datetime.now(timezone.utc)
        meta = extract_source_metadata(
            raw_content=content,
            cleaned_content=cleaned,
            source_type="text",
            uri=f"text://note-{title[:30].strip().replace(' ', '-')}",
        )

        source = Source(
            session_id=session_id,
            source_type="text",
            title=title.strip(),
            uri=f"text://note-{title[:30].strip().replace(' ', '-')}",
            raw_content=content,
            cleaned_content=cleaned,
            publication_date=meta.get("publication_date"),
            extraction_timestamp=meta.get("extraction_timestamp") or now,
            content_hash=meta.get("content_hash"),
            word_count=meta.get("word_count", 0),
            char_count=meta.get("char_count", 0),
            processing_status="processed",
            error_details=None,
        )
        db.add(source)
        db.commit()
        db.refresh(source)

        chunks_data = chunk_text_with_provenance(cleaned, max_words=350, overlap_words=40)
        cls._create_chunks_for_source(db, source.id, chunks_data)
        db.commit()
        db.refresh(source)
        return source

    @classmethod
    async def retry_source_extraction(cls, db: Session, source_id: str) -> Source:
        """
        Re-executes extraction for a previously failed or pending source.
        Re-fetches URLs or re-analyzes stored PDFs.
        """
        source = db.query(Source).filter(Source.id == source_id).first()
        if not source:
            raise NotFoundError("Source", source_id)

        now = datetime.now(timezone.utc)

        # Remove existing chunks if any
        db.query(DocumentChunk).filter(DocumentChunk.source_id == source_id).delete()
        db.commit()

        if source.source_type == "url":
            if not source.uri:
                source.processing_status = "failed"
                source.error_details = "Source has no URL URI to scrape."
                db.commit()
                return source

            try:
                scrape_result = await WebScraper.scrape_url(source.uri)
                full_text = scrape_result.get("full_text", "")
                meta = extract_source_metadata(
                    raw_content=full_text,
                    cleaned_content=full_text,
                    source_type="url",
                    uri=source.uri,
                    headers=scrape_result.get("headers"),
                    publication_date_candidate=scrape_result.get("publication_date"),
                )

                source.title = source.title or scrape_result.get("title") or source.uri
                source.domain = scrape_result.get("domain") or extract_domain(source.uri)
                source.raw_content = full_text
                source.cleaned_content = full_text
                source.publication_date = meta.get("publication_date")
                source.last_modified_date = meta.get("last_modified_date") or scrape_result.get("last_modified_date")
                source.extraction_timestamp = now
                source.author_or_publisher = scrape_result.get("author") or meta.get("author_or_publisher")
                source.content_hash = meta.get("content_hash")
                source.word_count = meta.get("word_count", 0)
                source.char_count = meta.get("char_count", 0)
                source.processing_status = "processed"
                source.error_details = None

                db.commit()
                cls._create_chunks_for_source(db, source.id, scrape_result.get("chunks", []))
                db.commit()
                db.refresh(source)
                return source
            except Exception as e:
                source.processing_status = "failed"
                source.error_details = f"Retry failed: {str(e)}"
                db.commit()
                db.refresh(source)
                return source

        elif source.source_type == "pdf":
            if not source.storage_path or not os.path.exists(source.storage_path):
                source.processing_status = "failed"
                source.error_details = "Original PDF file no longer found on server storage."
                db.commit()
                return source

            try:
                proc_result = PDFProcessor.process_pdf(source.storage_path)
                full_text = proc_result.get("full_text", "")
                doc_meta = proc_result.get("document_metadata", {})
                meta = extract_source_metadata(
                    raw_content=full_text,
                    cleaned_content=full_text,
                    source_type="pdf",
                    uri=source.uri,
                    document_metadata=doc_meta,
                )

                source.title = source.title or proc_result.get("title") or source.uri
                source.raw_content = full_text
                source.cleaned_content = full_text
                source.publication_date = meta.get("publication_date")
                source.last_modified_date = meta.get("last_modified_date")
                source.extraction_timestamp = now
                source.author_or_publisher = proc_result.get("author") or meta.get("author_or_publisher")
                source.content_hash = meta.get("content_hash")
                source.word_count = meta.get("word_count", 0)
                source.char_count = meta.get("char_count", 0)
                source.processing_status = "processed"
                source.error_details = None
                source.metadata_json = json.dumps({
                    "page_count": proc_result.get("page_count", 0),
                    "scanned_pages_count": proc_result.get("scanned_pages_count", 0),
                    "ocr_applied_count": proc_result.get("ocr_applied_count", 0),
                })

                db.commit()
                cls._create_chunks_for_source(db, source.id, proc_result.get("chunks", []))
                db.commit()
                db.refresh(source)
                return source
            except Exception as e:
                source.processing_status = "failed"
                source.error_details = f"Retry failed: {str(e)}"
                db.commit()
                db.refresh(source)
                return source

        elif source.source_type == "text":
            cleaned = clean_text(source.raw_content or "")
            meta = extract_source_metadata(
                raw_content=source.raw_content,
                cleaned_content=cleaned,
                source_type="text",
                uri=source.uri,
            )
            source.cleaned_content = cleaned
            source.extraction_timestamp = now
            source.content_hash = meta.get("content_hash")
            source.word_count = meta.get("word_count", 0)
            source.char_count = meta.get("char_count", 0)
            source.processing_status = "processed"
            source.error_details = None

            db.commit()
            chunks_data = chunk_text_with_provenance(cleaned, max_words=350, overlap_words=40)
            cls._create_chunks_for_source(db, source.id, chunks_data)
            db.commit()
            db.refresh(source)
            return source

        return source

    @classmethod
    def delete_source(cls, db: Session, source_id: str) -> bool:
        """Deletes a source and removes any physical PDF on disk."""
        source = db.query(Source).filter(Source.id == source_id).first()
        if not source:
            raise NotFoundError("Source", source_id)

        if source.storage_path and os.path.exists(source.storage_path):
            try:
                os.remove(source.storage_path)
            except OSError:
                pass

        db.delete(source)
        db.commit()
        return True
