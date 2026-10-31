import io
import pytest
import pymupdf as fitz
from fastapi.testclient import TestClient
from app.main import app
from app.ingestion.text_cleaner import (
    clean_text,
    clean_pdf_text,
    clean_web_text,
    fix_hyphenated_linebreaks,
    fix_smart_punctuation,
)
from app.ingestion.metadata_extractor import (
    compute_sha256,
    count_words,
    count_chars,
    extract_domain,
    extract_date_from_string,
    extract_source_metadata,
)
from app.ingestion.web_scraper import validate_url_and_check_ssrf, WebScraper
from app.ingestion.pdf_processor import PDFProcessor
from app.core.exceptions import IngestionError

client = TestClient(app)


def test_text_cleaner_features():
    # 1. Smart punctuation
    text = "“Smart Quotes” and ‘Apostrophes’ — with em–dash and non-breaking\u00A0space."
    cleaned = fix_smart_punctuation(text)
    assert '"Smart Quotes"' in cleaned
    assert "'Apostrophes'" in cleaned
    assert "--" in cleaned

    # 2. Hyphenated line breaks
    hyphen_text = "The govern-\nment announced a multi-\nyear initiative."
    stitched = fix_hyphenated_linebreaks(hyphen_text)
    assert "government" in stitched
    assert "multiyear" in stitched

    # 3. Overall cleaner
    dirty_text = "\u200b\u200cSome headline\n\n\n\nParagraph with  multiple    spaces.  \n"
    clean = clean_text(dirty_text)
    assert clean == "Some headline\n\nParagraph with multiple spaces."


def test_metadata_extractor():
    text = "Official memo issued on January 15, 2024 by Department of Energy regarding grants."
    sha = compute_sha256(text)
    assert sha is not None
    assert len(sha) == 64

    assert count_words(text) == 13
    assert count_chars(text) == len(text)

    # Domain extraction
    assert extract_domain("https://www.energy.gov/grants/apply") == "www.energy.gov"
    assert extract_domain("not-a-url") is None

    # Date extraction
    dt = extract_date_from_string(text)
    assert dt is not None
    assert dt.year == 2024
    assert dt.month == 1

    # Metadata builder
    meta = extract_source_metadata(
        raw_content=text,
        cleaned_content=text,
        source_type="url",
        uri="https://www.energy.gov/grants/apply"
    )
    assert meta["domain"] == "www.energy.gov"
    assert meta["word_count"] == 13
    assert meta["publication_date"] is not None


def test_anti_ssrf_protection():
    # Block loopback / localhost
    with pytest.raises(IngestionError, match="SSRF"):
        validate_url_and_check_ssrf("http://localhost:8080/secret")

    with pytest.raises(IngestionError, match="SSRF"):
        validate_url_and_check_ssrf("http://127.0.0.1/admin")

    # Block non-HTTP schemes
    with pytest.raises(IngestionError, match="scheme"):
        validate_url_and_check_ssrf("ftp://example.com/file.txt")

    with pytest.raises(IngestionError, match="scheme"):
        validate_url_and_check_ssrf("file:///etc/passwd")

    # Block private IP ranges directly
    with pytest.raises(IngestionError, match="SSRF"):
        validate_url_and_check_ssrf("http://192.168.1.100/config")

    with pytest.raises(IngestionError, match="SSRF"):
        validate_url_and_check_ssrf("http://10.0.0.5/internal")

    with pytest.raises(IngestionError, match="SSRF"):
        validate_url_and_check_ssrf("http://169.254.169.254/latest/meta-data")


def test_pdf_processor_with_in_memory_pdf(tmp_path):
    # Create a 2-page test PDF with PyMuPDF
    pdf_path = str(tmp_path / "test_document.pdf")
    doc = fitz.open()

    # Page 1
    page1 = doc.new_page()
    page1.insert_text((50, 72), "National Scholarship Program Guidelines\nSection 1: Academic Eligibility\nCandidates must maintain a 3.5 GPA.")

    # Page 2
    page2 = doc.new_page()
    page2.insert_text((50, 72), "Section 2: Application Deadline\nThe final submission window closes on December 15, 2025.")

    doc.set_metadata({
        "title": "Scholarship Guidelines 2025",
        "author": "Department of Education",
        "creationDate": "D:20240110120000Z"
    })
    doc.save(pdf_path)
    doc.close()

    result = PDFProcessor.process_pdf(pdf_path)
    assert result["title"] == "Scholarship Guidelines 2025"
    assert result["author"] == "Department of Education"
    assert result["page_count"] == 2
    assert "Academic Eligibility" in result["full_text"]
    assert "Section 2: Application Deadline" in result["full_text"]
    assert len(result["chunks"]) >= 2
    assert any(c.get("page_number") == 1 for c in result["chunks"])
    assert any(c.get("page_number") == 2 for c in result["chunks"])


def test_pdf_processor_rejects_non_pdf(tmp_path):
    bad_file = tmp_path / "fake.pdf"
    bad_file.write_text("This is plain text pretending to be a PDF.")

    with pytest.raises(IngestionError, match="Invalid file header"):
        PDFProcessor.process_pdf(str(bad_file))


def test_sources_api_full_lifecycle(tmp_path):
    # 1. Create a fresh session
    create_res = client.post("/api/v1/research", json={
        "title": "Multi-Source Ingestion Integration Test",
        "research_goal": "Verify all supported ingestion formats and retry flows.",
        "target_decision": "Verify data ingestion completeness"
    })
    assert create_res.status_code == 201
    session_id = create_res.json()["id"]

    # 2. Add Plain Text Source
    text_res = client.post("/api/v1/sources/text", json={
        "research_id": session_id,
        "title": "Internal Memo on Scholarship Limits",
        "content": "Official Directive: Maximum allowable household gross income cannot exceed $75,000 annually. Verified by Department."
    })
    assert text_res.status_code == 201
    text_data = text_res.json()
    assert text_data["source_type"] == "text"
    assert text_data["title"] == "Internal Memo on Scholarship Limits"
    assert text_data["word_count"] > 0
    assert text_data["content_hash"] is not None
    text_source_id = text_data["id"]

    # 3. Add PDF Upload
    pdf_path = str(tmp_path / "grant_rules.pdf")
    doc = fitz.open()
    p = doc.new_page()
    p.insert_text((50, 72), "Grant Requirement: Recipients must submit quarterly progress reports.")
    doc.set_metadata({"title": "Grant Rules and Stipulations"})
    doc.save(pdf_path)
    doc.close()

    with open(pdf_path, "rb") as f:
        pdf_res = client.post(
            "/api/v1/sources/upload",
            data={"research_id": session_id, "title": "Grant Rules and Stipulations"},
            files={"file": ("grant_rules.pdf", f, "application/pdf")}
        )
    assert pdf_res.status_code == 201
    pdf_data = pdf_res.json()
    assert pdf_data["source_type"] == "pdf"
    assert pdf_data["chunk_count"] >= 1
    pdf_source_id = pdf_data["id"]

    # 4. Multi-PDF Upload
    pdf2_path = str(tmp_path / "doc2.pdf")
    doc2 = fitz.open()
    doc2.new_page().insert_text((50, 72), "Document Two Content for batch upload verification.")
    doc2.save(pdf2_path)
    doc2.close()

    with open(pdf_path, "rb") as f1, open(pdf2_path, "rb") as f2:
        batch_pdf_res = client.post(
            "/api/v1/sources/upload-multiple",
            data={"research_id": session_id},
            files=[
                ("files", ("doc1.pdf", f1, "application/pdf")),
                ("files", ("doc2.pdf", f2, "application/pdf"))
            ]
        )
    assert batch_pdf_res.status_code == 201
    batch_pdf_data = batch_pdf_res.json()
    assert batch_pdf_data["total_submitted"] == 2
    assert batch_pdf_data["total_successful"] == 2

    # 5. Batch URLs with SSRF blocked entry
    batch_url_res = client.post("/api/v1/sources/urls", json={
        "research_id": session_id,
        "urls": [
            "http://127.0.0.1:9999/blocked-ssrf",
            "http://192.168.1.55/internal-router"
        ]
    })
    assert batch_url_res.status_code == 201
    batch_url_data = batch_url_res.json()
    assert batch_url_data["total_submitted"] == 2
    assert batch_url_data["total_failed"] == 2
    # Verify failed sources were recorded with error details rather than fabricated
    assert all(s["processing_status"] == "failed" for s in batch_url_data["sources"])
    assert all("SSRF" in (s.get("error_details") or "") for s in batch_url_data["sources"])

    # 6. Retrieve all sources for session
    list_res = client.get(f"/api/v1/research/{session_id}/sources")
    assert list_res.status_code == 200
    all_sources = list_res.json()
    # 1 text + 1 pdf + 2 batch pdfs + 2 batch failed urls = 6 sources
    assert len(all_sources) >= 6

    # 7. Get source detail
    detail_res = client.get(f"/api/v1/sources/{text_source_id}")
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert "Official Directive" in detail["cleaned_content"]
    assert len(detail["chunks"]) >= 1

    # 8. Retry failed source extraction
    failed_src_id = batch_url_data["sources"][0]["id"]
    retry_res = client.post(f"/api/v1/sources/{failed_src_id}/retry")
    assert retry_res.status_code == 200
    retried = retry_res.json()
    # Since URL is still 127.0.0.1, it should remain failed with descriptive error
    assert retried["processing_status"] == "failed"

    # 9. Delete source
    del_res = client.delete(f"/api/v1/sources/{text_source_id}")
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True

    # Verify deleted
    get_del = client.get(f"/api/v1/sources/{text_source_id}")
    assert get_del.status_code == 404
