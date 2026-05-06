# Optimized by Skills Agent for RecruitAI
# FastAPI Upload API – Single and Batch PDF Upload Endpoints
"""
Upload Router
=============
Provides REST endpoints for CV (PDF) ingestion:

  POST /api/v1/upload          → Single PDF upload
  POST /api/v1/upload/batch    → Batch PDF upload (multiple files)
  GET  /api/v1/jobs            → List all parse jobs
  GET  /api/v1/jobs/{job_id}   → Get job status + parsed result

Each upload triggers an async parse job via the CVParseWorker.
"""

from __future__ import annotations

import logging
from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, File, HTTPException, UploadFile, status
from pydantic import BaseModel

from backend.core.config import get_settings
from backend.core.storage import StorageService, StorageError
from backend.core.worker import CVParseWorker, JobStore, JobStatus, ParseJob
from backend.cv_parser import PDFCVParser, ParserConfig

logger = logging.getLogger("recruitai.api.upload")

# ── Dependency singletons (initialised in create_app) ──────────────────────
_storage: Optional[StorageService] = None
_job_store: Optional[JobStore] = None
_worker: Optional[CVParseWorker] = None

router = APIRouter(tags=["upload"])


def init_upload_deps() -> None:
    """Initialise module-level singletons. Called once at app startup."""
    global _storage, _job_store, _worker
    settings = get_settings()

    _storage = StorageService()
    _job_store = JobStore()

    parser_config = ParserConfig(
        enable_ocr_fallback=settings.PARSER_OCR_ENABLED,
        max_pages=settings.PARSER_MAX_PAGES,
        max_file_size=settings.max_upload_bytes,
    )
    parser = PDFCVParser(config=parser_config)
    _worker = CVParseWorker(parser=parser, storage=_storage, job_store=_job_store)


# ── Response Models ────────────────────────────────────────────────────────
class UploadResponse(BaseModel):
    job_id: str
    filename: str
    status: str
    message: str


class BatchUploadResponse(BaseModel):
    total: int
    jobs: List[UploadResponse]


class JobStatusResponse(BaseModel):
    job_id: str
    filename: str
    status: str
    created_at: str
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    duration_ms: float = 0.0
    confidence_score: float = 0.0
    error: Optional[str] = None
    parsed_result: Optional[dict] = None


# ── Helpers ────────────────────────────────────────────────────────────────
def _validate_pdf(file: UploadFile) -> None:
    """Validate that the uploaded file is a PDF."""
    settings = get_settings()
    content_type = file.content_type or ""
    filename = file.filename or ""

    if content_type not in settings.ALLOWED_MIME_TYPES and not filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Yalnızca PDF dosyaları kabul edilir. Gönderilen tip: {content_type}",
        )


async def _enqueue_parse(job_id: str, background_tasks: BackgroundTasks) -> None:
    """Enqueue a parse job as a FastAPI background task."""
    background_tasks.add_task(_run_parse_job, job_id)


async def _run_parse_job(job_id: str) -> None:
    """Background task wrapper for the worker."""
    try:
        await _worker.process(job_id)  # type: ignore[union-attr]
    except Exception as exc:
        logger.exception("Background parse failed for job %s: %s", job_id, exc)


# ── Endpoints ──────────────────────────────────────────────────────────────
@router.post(
    "/upload",
    response_model=UploadResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Tekli PDF CV yükleme",
    description="Tek bir PDF dosyası yükler ve arka planda ayrıştırma işlemini başlatır.",
)
async def upload_single(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(..., description="PDF formatında CV dosyası"),
) -> UploadResponse:
    """Upload a single PDF CV and enqueue it for parsing."""
    _validate_pdf(file)
    settings = get_settings()

    # Read file content
    content = await file.read()
    if len(content) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Boş dosya yüklenemez.",
        )
    if len(content) > settings.max_upload_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Dosya boyutu {settings.MAX_UPLOAD_SIZE_MB}MB sınırını aşıyor.",
        )

    # Save to storage
    try:
        job_id = _storage.save_upload(content, file.filename or "upload.pdf")  # type: ignore[union-attr]
    except StorageError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Dosya kaydedilemedi: {exc}",
        )

    # Create job record
    _job_store.create(job_id, file.filename or "upload.pdf")  # type: ignore[union-attr]

    # Enqueue background parse
    await _enqueue_parse(job_id, background_tasks)

    logger.info("Upload accepted: %s → job %s", file.filename, job_id)
    return UploadResponse(
        job_id=job_id,
        filename=file.filename or "upload.pdf",
        status=JobStatus.PENDING.value,
        message="CV yüklendi. Ayrıştırma işlemi arka planda başlatıldı.",
    )


@router.post(
    "/upload/batch",
    response_model=BatchUploadResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Toplu PDF CV yükleme",
    description="Birden fazla PDF dosyası yükler ve her biri için arka planda ayrıştırma başlatır.",
)
async def upload_batch(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(..., description="PDF formatında CV dosyaları"),
) -> BatchUploadResponse:
    """Upload multiple PDF CVs and enqueue them for parsing."""
    if not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="En az bir dosya yüklemelisiniz. / At least one file is required.",
        )

    settings = get_settings()

    # v2.0: enforce batch concurrent limit
    from backend.cv_parser.config import ErrorMessages
    batch_limit = getattr(settings, "BATCH_CONCURRENT_LIMIT", 10)
    if len(files) > batch_limit:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{ErrorMessages.BATCH_LIMIT_EXCEEDED['tr']} (max: {batch_limit}) / "
                   f"{ErrorMessages.BATCH_LIMIT_EXCEEDED['en']} (max: {batch_limit})",
        )
    jobs: List[UploadResponse] = []

    for file in files:
        try:
            _validate_pdf(file)
            content = await file.read()

            if len(content) == 0:
                jobs.append(UploadResponse(
                    job_id="",
                    filename=file.filename or "unknown",
                    status="failed",
                    message="Boş dosya atlandı.",
                ))
                continue

            if len(content) > settings.max_upload_bytes:
                jobs.append(UploadResponse(
                    job_id="",
                    filename=file.filename or "unknown",
                    status="failed",
                    message=f"Dosya boyutu {settings.MAX_UPLOAD_SIZE_MB}MB sınırını aşıyor.",
                ))
                continue

            job_id = _storage.save_upload(content, file.filename or "upload.pdf")  # type: ignore[union-attr]
            _job_store.create(job_id, file.filename or "upload.pdf")  # type: ignore[union-attr]
            await _enqueue_parse(job_id, background_tasks)

            jobs.append(UploadResponse(
                job_id=job_id,
                filename=file.filename or "upload.pdf",
                status=JobStatus.PENDING.value,
                message="Kuyruğa eklendi.",
            ))

        except HTTPException as exc:
            jobs.append(UploadResponse(
                job_id="",
                filename=file.filename or "unknown",
                status="failed",
                message=exc.detail,
            ))
        except Exception as exc:
            logger.warning("Batch upload error for %s: %s", file.filename, exc)
            jobs.append(UploadResponse(
                job_id="",
                filename=file.filename or "unknown",
                status="failed",
                message=f"Hata: {exc}",
            ))

    logger.info("Batch upload: %d files, %d accepted", len(files), sum(1 for j in jobs if j.job_id))
    return BatchUploadResponse(total=len(jobs), jobs=jobs)


@router.get(
    "/jobs",
    response_model=List[JobStatusResponse],
    summary="Tüm parse işlemlerini listele",
)
async def list_jobs() -> List[JobStatusResponse]:
    """List all parse jobs with their current status."""
    jobs = _job_store.list_all()  # type: ignore[union-attr]
    return [
        JobStatusResponse(
            job_id=j.job_id,
            filename=j.filename,
            status=j.status.value,
            created_at=j.created_at,
            started_at=j.started_at,
            completed_at=j.completed_at,
            duration_ms=j.duration_ms,
            confidence_score=j.confidence_score,
            error=j.error,
        )
        for j in jobs
    ]


@router.get(
    "/jobs/{job_id}",
    response_model=JobStatusResponse,
    summary="Belirli bir parse işleminin durumunu sorgula",
)
async def get_job_status(job_id: str) -> JobStatusResponse:
    """Get the status and parsed result for a specific job."""
    job = _job_store.get(job_id)  # type: ignore[union-attr]
    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"İş bulunamadı: {job_id}",
        )

    parsed_result = None
    if job.status == JobStatus.COMPLETED:
        parsed_result = _storage.get_parsed_result(job_id)  # type: ignore[union-attr]

    return JobStatusResponse(
        job_id=job.job_id,
        filename=job.filename,
        status=job.status.value,
        created_at=job.created_at,
        started_at=job.started_at,
        completed_at=job.completed_at,
        duration_ms=job.duration_ms,
        confidence_score=job.confidence_score,
        error=job.error,
        parsed_result=parsed_result,
    )
