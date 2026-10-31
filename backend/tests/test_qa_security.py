import os
import io
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.ingestion.web_scraper import validate_url_and_check_ssrf
from app.ingestion.pdf_processor import PDFProcessor
from app.core.exceptions import IngestionError

client = TestClient(app)


class TestSecurityAndInputValidation:
    """Rigorous QA Security & Validation Suite for ProofPath AI."""

    @pytest.fixture
    def test_session_id(self):
        """Creates a temporary research session for security testing."""
        res = client.post(
            "/api/v1/research",
            json={
                "title": "QA Security Test Investigation",
                "research_goal": "Verify endpoint resilience against injection, SSRF, and file exploits.",
            },
        )
        assert res.status_code == 201
        sid = res.json()["id"]
        yield sid
        client.delete(f"/api/v1/research/{sid}")

    @pytest.mark.parametrize(
        "blocked_url",
        [
            "http://127.0.0.1:8000/admin",
            "http://127.0.0.1",
            "http://localhost:8000",
            "http://0.0.0.0:8080",
            "http://169.254.169.254/latest/meta-data",
            "http://192.168.1.1/router-settings",
            "http://10.0.0.5/internal-api",
            "http://172.16.0.1/metrics",
            "file:///etc/passwd",
            "ftp://ftp.internal.corp/secret.txt",
            "gopher://gopher.floodgap.com",
            "javascript:alert(1)",
        ],
    )
    def test_anti_ssrf_and_protocol_filtering(self, blocked_url: str):
        """Verify that private IP ranges, cloud metadata, and non-HTTP protocols are rejected."""
        with pytest.raises(IngestionError):
            validate_url_and_check_ssrf(blocked_url)

    def test_api_source_url_ssrf_rejection(self, test_session_id: str):
        """Verify that the POST /api/v1/sources/url endpoint rejects unsafe loopback / private addresses with 422."""
        res = client.post(
            "/api/v1/sources/url",
            json={
                "research_id": test_session_id,
                "url": "http://169.254.169.254/latest/meta-data",
            },
        )
        assert res.status_code == 422
        body_text = str(res.json()).lower()
        assert "blocked" in body_text or "ssrf" in body_text

    def test_pdf_processor_rejects_corrupted_header(self, tmp_path):
        """Verify that files lacking %PDF header are strictly rejected."""
        fake_pdf = tmp_path / "corrupt.pdf"
        fake_pdf.write_bytes(b"THIS IS NOT A VALID PDF FILE HEADER AT ALL")
        with pytest.raises(IngestionError) as exc_info:
            PDFProcessor.validate_pdf_file(str(fake_pdf))
        assert "not a valid pdf" in str(exc_info.value).lower()

    def test_pdf_processor_rejects_zero_byte_file(self, tmp_path):
        """Verify that empty 0-byte uploads are cleanly rejected."""
        empty_pdf = tmp_path / "empty.pdf"
        empty_pdf.write_bytes(b"")
        with pytest.raises(IngestionError) as exc_info:
            PDFProcessor.validate_pdf_file(str(empty_pdf))
        assert "empty" in str(exc_info.value).lower()

    def test_oversized_pdf_rejection(self, tmp_path):
        """Verify that files exceeding 50MB limit are rejected."""
        huge_pdf = tmp_path / "huge.pdf"
        huge_pdf.write_bytes(b"%PDF-1.4 " + b"A" * (51 * 1024 * 1024))
        with pytest.raises(IngestionError) as exc_info:
            PDFProcessor.validate_pdf_file(str(huge_pdf))
        assert "exceeds maximum allowed size" in str(exc_info.value).lower()

    def test_api_upload_rejects_non_pdf_extension(self, test_session_id: str):
        """Verify POST /api/v1/sources/upload rejects non-PDF mime/extension with 415 or 422."""
        file_payload = ("test.exe", b"MZ\x90\x00\x03\x00\x00\x00", "application/octet-stream")
        res = client.post(
            "/api/v1/sources/upload",
            data={"research_id": test_session_id},
            files={"file": file_payload},
        )
        assert res.status_code in [415, 422]
        body_text = str(res.json()).lower()
        assert "unsupported" in body_text or "pdf" in body_text

    def test_research_session_input_validation(self):
        """Verify that empty research goals or invalid payloads return 422."""
        # Missing required fields
        res = client.post("/api/v1/research", json={})
        assert res.status_code == 422

        # Empty whitespace title/goal
        res2 = client.post(
            "/api/v1/research",
            json={"title": "   ", "research_goal": "   "},
        )
        assert res2.status_code == 422

    def test_cors_preflight_configuration(self):
        """Verify that CORS preflight requests receive appropriate headers."""
        res = client.options(
            "/api/v1/research",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "Content-Type",
            },
        )
        assert res.status_code == 200
        assert "access-control-allow-origin" in res.headers
        assert res.headers["access-control-allow-origin"] in ["http://localhost:5173", "*"]

    def test_sensitive_error_leakage_prevention(self):
        """Verify that 404 responses do not leak database passwords, file paths, or internal tracebacks."""
        res = client.get("/api/v1/research/non-existent-uuid-12345")
        assert res.status_code == 404
        content = res.text.lower()
        assert "traceback" not in content
        assert "password" not in content
        assert "sqlite3.operationalerror" not in content
        assert "select * from" not in content
