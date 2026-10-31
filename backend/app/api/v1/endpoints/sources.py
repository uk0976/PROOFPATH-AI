import os
import uuid
import aiofiles
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.config import settings
from app.models import ResearchSession, Source, DocumentChunk
from app.schemas.sources import (
    URLSourceCreate,
    TextSourceCreate,
    SourceResponse,
)
from app.ingestion.pdf_processor import PDFProcessor
from app.ingestion.web_scraper import WebScraper
from app.utils.chunker import chunk_text_with_provenance

router = APIRouter(prefix="/sources", tags=["Sources"])


@router.post("/{session_id}/upload-pdf", response_model=SourceResponse, status_code=status.HTTP_201_CREATED)
async def upload_pdf(
    session_id: str,
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    session = db.query(ResearchSession).filter(ResearchSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Research session not found")

    filename = file.filename or "uploaded.pdf"
    file_id = str(uuid.uuid4())
    stored_path = os.path.join(settings.UPLOAD_DIR, f"{file_id}_{filename}")

    async with aiofiles.open(stored_path, "wb") as out_file:
        content = await file.read()
        await out_file.write(content)

    try:
        proc_result = PDFProcessor.process_pdf(stored_path)
    except Exception as e:
        if os.path.exists(stored_path):
            os.remove(stored_path)
        raise HTTPException(status_code=400, detail=f"Failed to process PDF: {str(e)}")

    source = Source(
        session_id=session_id,
        source_type="pdf",
        title=title or proc_result.get("title") or filename,
        uri=filename,
        storage_path=stored_path,
        raw_content=proc_result.get("full_text"),
        cleaned_content=proc_result.get("full_text"),
        author_or_publisher=proc_result.get("author"),
    )
    db.add(source)
    db.commit()
    db.refresh(source)

    # Persist chunks
    for c_data in proc_result.get("chunks", []):
        chunk = DocumentChunk(
            source_id=source.id,
            chunk_index=c_data["chunk_index"],
            text_content=c_data["text_content"],
            page_number=c_data.get("page_number"),
            token_count=c_data.get("token_count", 0)
        )
        db.add(chunk)
    db.commit()

    return SourceResponse(
        id=source.id,
        session_id=source.session_id,
        source_type=source.source_type,
        title=source.title,
        uri=source.uri,
        publication_date=source.publication_date,
        author_or_publisher=source.author_or_publisher,
        chunk_count=len(source.chunks),
        created_at=source.created_at
    )


@router.post("/{session_id}/add-url", response_model=SourceResponse, status_code=status.HTTP_201_CREATED)
async def add_url_source(
    session_id: str,
    data: URLSourceCreate,
    db: Session = Depends(get_db)
):
    session = db.query(ResearchSession).filter(ResearchSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Research session not found")

    try:
        scrape_result = await WebScraper.scrape_url(data.url)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to scrape URL: {str(e)}")

    source = Source(
        session_id=session_id,
        source_type="url",
        title=data.title or scrape_result.get("title") or data.url,
        uri=data.url,
        raw_content=scrape_result.get("full_text"),
        cleaned_content=scrape_result.get("full_text"),
        publication_date=scrape_result.get("publication_date"),
    )
    db.add(source)
    db.commit()
    db.refresh(source)

    for c_data in scrape_result.get("chunks", []):
        chunk = DocumentChunk(
            source_id=source.id,
            chunk_index=c_data["chunk_index"],
            text_content=c_data["text_content"],
            token_count=c_data.get("token_count", 0)
        )
        db.add(chunk)
    db.commit()

    return SourceResponse(
        id=source.id,
        session_id=source.session_id,
        source_type=source.source_type,
        title=source.title,
        uri=source.uri,
        publication_date=source.publication_date,
        author_or_publisher=source.author_or_publisher,
        chunk_count=len(source.chunks),
        created_at=source.created_at
    )


@router.post("/{session_id}/add-text", response_model=SourceResponse, status_code=status.HTTP_201_CREATED)
def add_text_source(
    session_id: str,
    data: TextSourceCreate,
    db: Session = Depends(get_db)
):
    session = db.query(ResearchSession).filter(ResearchSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Research session not found")

    source = Source(
        session_id=session_id,
        source_type="text",
        title=data.title,
        uri="Manual Paste",
        raw_content=data.content,
        cleaned_content=data.content,
    )
    db.add(source)
    db.commit()
    db.refresh(source)

    chunks = chunk_text_with_provenance(data.content, max_words=350, overlap_words=40)
    for c_data in chunks:
        chunk = DocumentChunk(
            source_id=source.id,
            chunk_index=c_data["chunk_index"],
            text_content=c_data["text_content"],
            token_count=c_data.get("token_count", 0)
        )
        db.add(chunk)
    db.commit()

    return SourceResponse(
        id=source.id,
        session_id=source.session_id,
        source_type=source.source_type,
        title=source.title,
        uri=source.uri,
        publication_date=source.publication_date,
        author_or_publisher=source.author_or_publisher,
        chunk_count=len(source.chunks),
        created_at=source.created_at
    )


@router.get("/{session_id}", response_model=List[SourceResponse])
def list_session_sources(session_id: str, db: Session = Depends(get_db)):
    sources = db.query(Source).filter(Source.session_id == session_id).all()
    return [
        SourceResponse(
            id=s.id,
            session_id=s.session_id,
            source_type=s.source_type,
            title=s.title,
            uri=s.uri,
            publication_date=s.publication_date,
            author_or_publisher=s.author_or_publisher,
            chunk_count=len(s.chunks),
            created_at=s.created_at
        )
        for s in sources
    ]
