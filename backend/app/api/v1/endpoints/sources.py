import os
from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models import ResearchSession, Source
from app.schemas.sources import (
    SourceResponse,
    SourceDetailResponse,
    SourceUrlRequest,
    SourceBatchUrlRequest,
    SourceTextRequest,
    BatchIngestionResponse,
)
from app.services.source_service import SourceService
from app.utils.file_validation import validate_and_save_upload
from app.core.exceptions import NotFoundError, IngestionError

router = APIRouter(tags=["Sources"])


def _to_source_response(s: Source) -> SourceResponse:
    return SourceResponse(
        id=s.id,
        session_id=s.session_id,
        source_type=s.source_type,
        title=s.title,
        uri=s.uri,
        domain=s.domain,
        publication_date=s.publication_date,
        last_modified_date=s.last_modified_date,
        extraction_timestamp=s.extraction_timestamp,
        author_or_publisher=s.author_or_publisher,
        processing_status=s.processing_status or "processed",
        error_details=s.error_details,
        content_hash=s.content_hash,
        word_count=s.word_count or 0,
        char_count=s.char_count or 0,
        chunk_count=len(s.chunks),
        created_at=s.created_at,
    )


@router.post("/sources/upload", response_model=SourceResponse, status_code=status.HTTP_201_CREATED)
async def upload_source_file(
    research_id: str = Form(..., description="ID of the research session"),
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """Uploads and processes a single PDF document with text/scanned extraction and page tracking."""
    session = db.query(ResearchSession).filter(ResearchSession.id == research_id).first()
    if not session:
        raise NotFoundError("ResearchSession", research_id)

    name, file_path, size = await validate_and_save_upload(file)

    try:
        source = SourceService.ingest_pdf(
            db=db,
            session_id=research_id,
            file_path=file_path,
            filename=name,
            title=title,
            save_on_failure=False,
        )
        return _to_source_response(source)
    except Exception as e:
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except OSError:
                pass
        raise IngestionError(f"Failed to extract document contents: {str(e)}")


@router.post("/sources/upload-multiple", response_model=BatchIngestionResponse, status_code=status.HTTP_201_CREATED)
async def upload_multiple_source_files(
    research_id: str = Form(..., description="ID of the research session"),
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db)
):
    """Uploads and ingests multiple PDF documents in a single batch request."""
    session = db.query(ResearchSession).filter(ResearchSession.id == research_id).first()
    if not session:
        raise NotFoundError("ResearchSession", research_id)

    results: List[SourceResponse] = []
    success_count = 0
    fail_count = 0

    for file in files:
        try:
            name, file_path, size = await validate_and_save_upload(file)
            source = SourceService.ingest_pdf(
                db=db,
                session_id=research_id,
                file_path=file_path,
                filename=name,
                save_on_failure=True,
            )
            resp = _to_source_response(source)
            results.append(resp)
            if source.processing_status == "processed":
                success_count += 1
            else:
                fail_count += 1
        except Exception as e:
            # Handle validation/upload failures gracefully
            fail_count += 1
            results.append(
                SourceResponse(
                    id=f"failed-{len(results)}",
                    session_id=research_id,
                    source_type="pdf",
                    title=getattr(file, "filename", "unnamed.pdf") or "unnamed.pdf",
                    uri=getattr(file, "filename", "unnamed.pdf"),
                    processing_status="failed",
                    error_details=str(e),
                    created_at=session.created_at,
                )
            )

    return BatchIngestionResponse(
        sources=results,
        total_submitted=len(files),
        total_successful=success_count,
        total_failed=fail_count,
    )


@router.post("/sources/url", response_model=SourceResponse, status_code=status.HTTP_201_CREATED)
async def add_source_url(
    data: SourceUrlRequest,
    db: Session = Depends(get_db)
):
    """Scrapes and ingests a single website URL with anti-SSRF protections and metadata extraction."""
    source = await SourceService.ingest_url(
        db=db,
        session_id=data.research_id,
        url=data.url,
        title=data.title,
        save_on_failure=False,
    )
    return _to_source_response(source)


@router.post("/sources/urls", response_model=BatchIngestionResponse, status_code=status.HTTP_201_CREATED)
async def add_source_urls_batch(
    data: SourceBatchUrlRequest,
    db: Session = Depends(get_db)
):
    """Scrapes and ingests multiple URLs in a single batch, preserving individual failure states."""
    sources = await SourceService.ingest_urls_batch(
        db=db,
        session_id=data.research_id,
        urls=data.urls,
    )
    responses = [_to_source_response(s) for s in sources]
    successful = sum(1 for s in sources if s.processing_status == "processed")
    failed = len(sources) - successful

    return BatchIngestionResponse(
        sources=responses,
        total_submitted=len(data.urls),
        total_successful=successful,
        total_failed=failed,
    )


@router.post("/sources/text", response_model=SourceResponse, status_code=status.HTTP_201_CREATED)
def add_source_text(
    data: SourceTextRequest,
    db: Session = Depends(get_db)
):
    """Cleans and ingests plain text notes, policies, or memorandums."""
    source = SourceService.ingest_plain_text(
        db=db,
        session_id=data.research_id,
        title=data.title,
        content=data.content,
    )
    return _to_source_response(source)


@router.post("/sources/{source_id}/retry", response_model=SourceResponse, status_code=status.HTTP_200_OK)
async def retry_source(
    source_id: str,
    db: Session = Depends(get_db)
):
    """Re-attempts extraction for a failed source."""
    source = await SourceService.retry_source_extraction(db, source_id)
    return _to_source_response(source)


@router.get("/research/{research_id}/sources", response_model=List[SourceResponse])
def get_research_sources(research_id: str, db: Session = Depends(get_db)):
    """Retrieves all sources attached to a given research session."""
    session = db.query(ResearchSession).filter(ResearchSession.id == research_id).first()
    if not session:
        raise NotFoundError("ResearchSession", research_id)

    sources = db.query(Source).filter(Source.session_id == research_id).order_by(Source.created_at.desc()).all()
    return [_to_source_response(s) for s in sources]


@router.get("/sources/{source_id}", response_model=SourceDetailResponse)
def get_source_detail(source_id: str, db: Session = Depends(get_db)):
    """Retrieves full source content, metadata, and segmented chunks."""
    source = db.query(Source).filter(Source.id == source_id).first()
    if not source:
        raise NotFoundError("Source", source_id)
    return source


@router.delete("/sources/{source_id}", status_code=status.HTTP_200_OK)
def delete_source(source_id: str, db: Session = Depends(get_db)):
    """Deletes a source, its underlying file, and all derived chunks."""
    SourceService.delete_source(db, source_id)
    return {"success": True, "message": f"Source '{source_id}' successfully deleted."}
