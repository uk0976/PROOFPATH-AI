import os
from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models import ResearchSession, Source, DocumentChunk
from app.schemas.sources import (
    SourceResponse,
    SourceDetailResponse,
    SourceUrlRequest,
    SourceTextRequest,
)
from app.ingestion.pdf_processor import PDFProcessor
from app.ingestion.web_scraper import WebScraper
from app.utils.file_validation import validate_and_save_upload
from app.utils.chunker import chunk_text_with_provenance
from app.core.exceptions import NotFoundError, IngestionError

router = APIRouter(tags=["Sources"])


@router.post("/sources/upload", response_model=SourceResponse, status_code=status.HTTP_201_CREATED)
async def upload_source_file(
    research_id: str = Form(..., description="ID of the research session"),
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    session = db.query(ResearchSession).filter(ResearchSession.id == research_id).first()
    if not session:
        raise NotFoundError("ResearchSession", research_id)

    name, file_path, size = await validate_and_save_upload(file)

    try:
        proc_result = PDFProcessor.process_pdf(file_path)
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise IngestionError(f"Failed to extract document contents: {str(e)}")

    source = Source(
        session_id=research_id,
        source_type="pdf",
        title=title or proc_result.get("title") or name,
        uri=name,
        storage_path=file_path,
        raw_content=proc_result.get("full_text"),
        cleaned_content=proc_result.get("full_text"),
        author_or_publisher=proc_result.get("author"),
    )
    db.add(source)
    db.commit()
    db.refresh(source)

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




@router.post("/sources/url", response_model=SourceResponse, status_code=status.HTTP_201_CREATED)
async def add_source_url(
    data: SourceUrlRequest,
    db: Session = Depends(get_db)
):
    session = db.query(ResearchSession).filter(ResearchSession.id == data.research_id).first()
    if not session:
        raise NotFoundError("ResearchSession", data.research_id)

    try:
        scrape_result = await WebScraper.scrape_url(data.url)
    except Exception as e:
        raise IngestionError(f"Failed to scrape URL: {str(e)}")

    source = Source(
        session_id=data.research_id,
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


@router.post("/sources/text", response_model=SourceResponse, status_code=status.HTTP_201_CREATED)
def add_source_text(
    data: SourceTextRequest,
    db: Session = Depends(get_db)
):
    session = db.query(ResearchSession).filter(ResearchSession.id == data.research_id).first()
    if not session:
        raise NotFoundError("ResearchSession", data.research_id)

    source = Source(
        session_id=data.research_id,
        source_type="text",
        title=data.title,
        uri=f"text://note-{data.title[:20].strip().replace(' ', '-')}",
        raw_content=data.content,
        cleaned_content=data.content,
    )
    db.add(source)
    db.commit()
    db.refresh(source)

    chunks_data = chunk_text_with_provenance(data.content)
    for c_data in chunks_data:
        chunk = DocumentChunk(
            source_id=source.id,
            chunk_index=c_data["chunk_index"],
            text_content=c_data["text_content"],
            token_count=c_data.get("token_count", 0),
            start_char=c_data.get("start_char"),
            end_char=c_data.get("end_char"),
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


@router.get("/research/{research_id}/sources", response_model=List[SourceResponse])
def get_research_sources(research_id: str, db: Session = Depends(get_db)):
    session = db.query(ResearchSession).filter(ResearchSession.id == research_id).first()
    if not session:
        raise NotFoundError("ResearchSession", research_id)

    sources = db.query(Source).filter(Source.session_id == research_id).all()
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


@router.get("/sources/{source_id}", response_model=SourceDetailResponse)
def get_source_detail(source_id: str, db: Session = Depends(get_db)):
    source = db.query(Source).filter(Source.id == source_id).first()
    if not source:
        raise NotFoundError("Source", source_id)
    return source


@router.delete("/sources/{source_id}", status_code=status.HTTP_200_OK)
def delete_source(source_id: str, db: Session = Depends(get_db)):
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
    return {"success": True, "message": f"Source '{source_id}' successfully deleted."}
