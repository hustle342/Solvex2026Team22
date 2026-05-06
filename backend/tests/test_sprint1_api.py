# Optimized by Skills Agent for RecruitAI
# Unit Tests – Sprint 1 Upload API, Worker, and Storage
"""
Sprint 1 Integration / Unit Test Suite
=======================================
Covers:
  - Upload API endpoints (single + batch)
  - Job status tracking
  - Storage service operations
  - Worker job processing lifecycle
  - Input validation and error handling
"""

from __future__ import annotations

import io
import json
import os
import tempfile
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

# ── Fixtures ───────────────────────────────────────────────────────────────
# Minimal valid PDF for upload testing
_MINIMAL_PDF = (
    b"%PDF-1.4\n"
    b"1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
    b"2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n"
    b"3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj\n"
    b"xref\n0 4\n"
    b"0000000000 65535 f \n"
    b"0000000009 00000 n \n"
    b"0000000058 00000 n \n"
    b"0000000115 00000 n \n"
    b"trailer<</Root 1 0 R/Size 4>>\n"
    b"startxref\n190\n%%EOF"
)


@pytest.fixture
def temp_dirs(tmp_path):
    """Create temporary upload and parsed directories."""
    upload = tmp_path / "uploads"
    parsed = tmp_path / "parsed"
    upload.mkdir()
    parsed.mkdir()
    return str(upload), str(parsed)


@pytest.fixture
def storage_service(temp_dirs):
    """Create a StorageService with temp directories."""
    upload_dir, parsed_dir = temp_dirs
    # Patch settings so StorageService uses temp dirs
    with patch("backend.core.storage.get_settings") as mock_settings:
        settings = MagicMock()
        settings.UPLOAD_DIR = upload_dir
        settings.PARSED_OUTPUT_DIR = parsed_dir
        mock_settings.return_value = settings
        from backend.core.storage import StorageService
        return StorageService(upload_dir=upload_dir, parsed_dir=parsed_dir)


@pytest.fixture
def job_store():
    """Create a fresh JobStore."""
    from backend.core.worker import JobStore
    return JobStore()


@pytest.fixture
def test_client(temp_dirs):
    """
    Create a FastAPI TestClient with directly-injected dependencies.
    We bypass lifespan init and inject singletons into the upload module
    to avoid mock-propagation issues.
    """
    upload_dir, parsed_dir = temp_dirs

    # Patch get_settings everywhere it's imported
    mock_settings = MagicMock()
    mock_settings.APP_NAME = "RecruitAI"
    mock_settings.APP_VERSION = "test"
    mock_settings.DEBUG = True
    mock_settings.API_PREFIX = "/api/v1"
    mock_settings.UPLOAD_DIR = upload_dir
    mock_settings.PARSED_OUTPUT_DIR = parsed_dir
    mock_settings.ALLOWED_MIME_TYPES = ["application/pdf"]
    mock_settings.MAX_UPLOAD_SIZE_MB = 20
    mock_settings.max_upload_bytes = 20 * 1024 * 1024
    mock_settings.PARSER_OCR_ENABLED = False
    mock_settings.PARSER_MAX_PAGES = 30
    mock_settings.BATCH_CONCURRENT_LIMIT = 10

    with patch("backend.core.config.get_settings", return_value=mock_settings), \
         patch("backend.core.storage.get_settings", return_value=mock_settings), \
         patch("backend.api.upload.get_settings", return_value=mock_settings):

        import backend.api.upload as upload_mod
        from backend.core.storage import StorageService
        from backend.core.worker import JobStore, CVParseWorker
        from backend.cv_parser import PDFCVParser
        from backend.cv_parser.config import ParserConfig

        # Manually inject dependencies into the upload module
        upload_mod._storage = StorageService(upload_dir=upload_dir, parsed_dir=parsed_dir)
        upload_mod._job_store = JobStore()

        parser = PDFCVParser(config=ParserConfig(
            enable_ocr_fallback=False,
            max_pages=30,
            max_file_size=20 * 1024 * 1024,
        ))
        upload_mod._worker = CVParseWorker(
            parser=parser,
            storage=upload_mod._storage,
            job_store=upload_mod._job_store,
        )

        from backend.main import create_app
        app = create_app()
        client = TestClient(app)
        yield client

        # Clean up singletons
        upload_mod._storage = None
        upload_mod._job_store = None
        upload_mod._worker = None


# ═══════════════════════════════════════════════════════════════════════════
# Storage Tests
# ═══════════════════════════════════════════════════════════════════════════
class TestStorageService:

    def test_save_and_retrieve_upload(self, storage_service):
        job_id = storage_service.save_upload(_MINIMAL_PDF, "test_cv.pdf")
        assert job_id
        path = storage_service.get_upload_path(job_id)
        assert path.exists()
        assert path.read_bytes() == _MINIMAL_PDF

    def test_save_parsed_result(self, storage_service):
        result = {"contact": {"name": "Test"}, "confidence_score": 0.9}
        path = storage_service.save_parsed_result("test-123", result)
        assert path.exists()

        loaded = storage_service.get_parsed_result("test-123")
        assert loaded is not None
        assert loaded["confidence_score"] == 0.9

    def test_get_nonexistent_result_returns_none(self, storage_service):
        assert storage_service.get_parsed_result("nonexistent") is None

    def test_delete_upload(self, storage_service):
        job_id = storage_service.save_upload(_MINIMAL_PDF, "delete_test.pdf")
        assert storage_service.delete_upload(job_id) is True
        assert storage_service.delete_upload(job_id) is False  # already deleted

    def test_list_parsed_results(self, storage_service):
        for i in range(3):
            storage_service.save_parsed_result(
                f"job-{i}",
                {"source_file": f"cv{i}.pdf", "confidence_score": 0.5 + i * 0.1, "parsed_at": "2026-01-01"},
            )
        results = storage_service.list_parsed_results()
        assert len(results) == 3

    def test_upload_not_found_raises(self, storage_service):
        from backend.core.storage import StorageError
        with pytest.raises(StorageError):
            storage_service.get_upload_path("does-not-exist")


# ═══════════════════════════════════════════════════════════════════════════
# Job Store Tests
# ═══════════════════════════════════════════════════════════════════════════
class TestJobStore:

    def test_create_and_get_job(self, job_store):
        job = job_store.create("j1", "cv.pdf")
        assert job.job_id == "j1"
        assert job.filename == "cv.pdf"
        assert job_store.get("j1") is not None

    def test_get_nonexistent_returns_none(self, job_store):
        assert job_store.get("nonexistent") is None

    def test_list_all(self, job_store):
        job_store.create("a", "a.pdf")
        job_store.create("b", "b.pdf")
        jobs = job_store.list_all()
        assert len(jobs) == 2

    def test_update_job(self, job_store):
        from backend.core.worker import JobStatus
        job = job_store.create("u1", "u.pdf")
        job.status = JobStatus.COMPLETED
        job_store.update(job)
        updated = job_store.get("u1")
        assert updated.status == JobStatus.COMPLETED


# ═══════════════════════════════════════════════════════════════════════════
# Worker Tests
# ═══════════════════════════════════════════════════════════════════════════
class TestCVParseWorker:

    @pytest.mark.asyncio
    async def test_process_job_completed(self, storage_service, job_store):
        from backend.core.worker import CVParseWorker, JobStatus

        # Save a file first
        job_id = storage_service.save_upload(_MINIMAL_PDF, "worker_test.pdf")
        job_store.create(job_id, "worker_test.pdf")

        # Create a mock parser
        mock_parser = MagicMock()
        mock_result = MagicMock()
        mock_result.confidence_score = 0.85
        mock_result.error = None
        mock_result.to_dict.return_value = {
            "contact": {"name": "Test"},
            "confidence_score": 0.85,
            "error": None,
        }
        mock_parser.parse.return_value = mock_result

        worker = CVParseWorker(mock_parser, storage_service, job_store)
        result_job = await worker.process(job_id)

        assert result_job.status == JobStatus.COMPLETED
        assert result_job.confidence_score == 0.85

    @pytest.mark.asyncio
    async def test_process_nonexistent_job_raises(self, storage_service, job_store):
        from backend.core.worker import CVParseWorker, WorkerError

        mock_parser = MagicMock()
        worker = CVParseWorker(mock_parser, storage_service, job_store)
        with pytest.raises(WorkerError):
            await worker.process("nonexistent-job")


# ═══════════════════════════════════════════════════════════════════════════
# API Endpoint Tests
# ═══════════════════════════════════════════════════════════════════════════
class TestHealthEndpoint:

    def test_health_check(self, test_client):
        resp = test_client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"


class TestUploadEndpoint:

    def test_single_upload_accepted(self, test_client):
        resp = test_client.post(
            "/api/v1/upload",
            files={"file": ("test_cv.pdf", _MINIMAL_PDF, "application/pdf")},
        )
        assert resp.status_code == 202
        data = resp.json()
        assert data["job_id"]
        assert data["status"] == "pending"
        assert data["filename"] == "test_cv.pdf"

    def test_upload_non_pdf_rejected(self, test_client):
        resp = test_client.post(
            "/api/v1/upload",
            files={"file": ("test.txt", b"not a pdf", "text/plain")},
        )
        assert resp.status_code == 415

    def test_upload_empty_file_rejected(self, test_client):
        resp = test_client.post(
            "/api/v1/upload",
            files={"file": ("empty.pdf", b"", "application/pdf")},
        )
        assert resp.status_code == 400

    def test_batch_upload(self, test_client):
        files = [
            ("files", ("cv1.pdf", _MINIMAL_PDF, "application/pdf")),
            ("files", ("cv2.pdf", _MINIMAL_PDF, "application/pdf")),
        ]
        resp = test_client.post("/api/v1/upload/batch", files=files)
        assert resp.status_code == 202
        data = resp.json()
        assert data["total"] == 2
        assert all(j["job_id"] for j in data["jobs"])

    def test_batch_upload_empty_rejected(self, test_client):
        resp = test_client.post("/api/v1/upload/batch", files=[])
        assert resp.status_code in (400, 422)

    def test_batch_upload_limit_exceeded(self, test_client):
        # limit is 10, upload 11 files
        files = [("files", (f"cv{i}.pdf", _MINIMAL_PDF, "application/pdf")) for i in range(11)]
        resp = test_client.post("/api/v1/upload/batch", files=files)
        assert resp.status_code == 400
        assert "limit" in resp.json()["detail"].lower()


class TestJobEndpoints:

    def test_list_jobs(self, test_client):
        # Upload a file first
        test_client.post(
            "/api/v1/upload",
            files={"file": ("cv.pdf", _MINIMAL_PDF, "application/pdf")},
        )
        resp = test_client.get("/api/v1/jobs")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_get_job_status(self, test_client):
        # Upload first
        upload_resp = test_client.post(
            "/api/v1/upload",
            files={"file": ("cv.pdf", _MINIMAL_PDF, "application/pdf")},
        )
        job_id = upload_resp.json()["job_id"]
        resp = test_client.get(f"/api/v1/jobs/{job_id}")
        assert resp.status_code == 200
        assert resp.json()["job_id"] == job_id

    def test_get_nonexistent_job_404(self, test_client):
        resp = test_client.get("/api/v1/jobs/nonexistent-id")
        assert resp.status_code == 404
