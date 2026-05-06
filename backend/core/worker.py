# Optimized by Skills Agent for RecruitAI
# Queue Worker Contract – CV parse job processing
"""
Queue Worker
============
Defines the job schema and worker logic for asynchronous CV parsing.
In MVP, runs as an in-process async worker.
Designed to be upgraded to Celery/RQ + Redis in production.

Job lifecycle::

    PENDING → PROCESSING → COMPLETED
                         → FAILED
"""

from __future__ import annotations

import asyncio
import logging
import time
import uuid
import json
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Callable, Dict, List, Optional

from backend.core.database import AsyncSessionLocal
from backend.core.models import CV
from sqlalchemy.future import select

logger = logging.getLogger("recruitai.worker")


# ── Job Status ─────────────────────────────────────────────────────────────
class JobStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


# ── Job Schema ─────────────────────────────────────────────────────────────
@dataclass
class ParseJob:
    """Represents a single CV parse job in the queue."""
    job_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    filename: str = ""
    status: JobStatus = JobStatus.PENDING
    created_at: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    duration_ms: float = 0.0
    confidence_score: float = 0.0
    error: Optional[str] = None
    result_path: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["status"] = self.status.value
        return d


# ── In-Memory Job Store (MVP) ──────────────────────────────────────────────
class JobStore:
    """
    Thread-safe in-memory job store.
    Replace with Redis/PostgreSQL-backed store in production.
    """

    def __init__(self) -> None:
        self._jobs: Dict[str, ParseJob] = {}

    def create(self, job_id: str, filename: str) -> ParseJob:
        job = ParseJob(job_id=job_id, filename=filename)
        self._jobs[job_id] = job
        logger.info("Job created: %s (%s)", job_id, filename)
        return job

    def get(self, job_id: str) -> Optional[ParseJob]:
        return self._jobs.get(job_id)

    def update(self, job: ParseJob) -> None:
        self._jobs[job.job_id] = job

    def list_all(self, limit: int = 100) -> List[ParseJob]:
        jobs = sorted(
            self._jobs.values(),
            key=lambda j: j.created_at,
            reverse=True,
        )
        return jobs[:limit]


# ── Worker ─────────────────────────────────────────────────────────────────
class CVParseWorker:
    """
    Asynchronous CV parse worker.

    Accepts a parse job, runs the PDFCVParser, and persists the result.
    Designed as an async coroutine so it can run in the FastAPI event loop
    (MVP) or be called from a Celery task (production).

    Usage
    -----
    >>> worker = CVParseWorker(parser, storage, job_store)
    >>> result = await worker.process(job_id)
    """

    def __init__(self, parser, storage, job_store: JobStore) -> None:
        self.parser = parser
        self.storage = storage
        self.job_store = job_store

    async def process(self, job_id: str) -> ParseJob:
        """
        Process a single parse job end-to-end.

        Steps:
        1. Look up the job and mark as PROCESSING.
        2. Locate the uploaded PDF file.
        3. Run the parser (CPU-bound → run_in_executor).
        4. Persist parsed output as JSON.
        5. Update job status to COMPLETED or FAILED.
        """
        job = self.job_store.get(job_id)
        if job is None:
            raise WorkerError(f"Job not found: {job_id}")

        job.status = JobStatus.PROCESSING
        job.started_at = datetime.now(timezone.utc).isoformat()
        self.job_store.update(job)
        logger.info("Processing job: %s", job_id)

        start = time.perf_counter()
        try:
            # ── Locate file ────────────────────────────────────────
            upload_path = self.storage.get_upload_path(job_id)

            # ── Parse (offload CPU-bound work) ─────────────────────
            loop = asyncio.get_event_loop()
            parse_result = await loop.run_in_executor(
                None, self.parser.parse, upload_path
            )

            # ── Persist result ─────────────────────────────────────
            result_dict = parse_result.to_dict()
            result_dict["job_id"] = job_id
            result_path = self.storage.save_parsed_result(job_id, result_dict)

            # ── Update job ─────────────────────────────────────────
            job.status = JobStatus.COMPLETED
            job.confidence_score = parse_result.confidence_score
            job.result_path = str(result_path)
            job.error = parse_result.error

        except Exception as exc:
            logger.exception("Job %s failed: %s", job_id, exc)
            job.status = JobStatus.FAILED
            job.error = str(exc)

        finally:
            elapsed = (time.perf_counter() - start) * 1000
            job.duration_ms = round(elapsed, 2)
            job.completed_at = datetime.now(timezone.utc).isoformat()
            self.job_store.update(job)
            logger.info(
                "Job %s → %s (%.0fms)",
                job_id,
                job.status.value,
                job.duration_ms,
            )

            # Update DB record if exists
            try:
                async with AsyncSessionLocal() as db:
                    result = await db.execute(select(CV).where(CV.id == job_id))
                    cv_record = result.scalars().first()
                    if cv_record:
                        cv_record.status = job.status.value
                        cv_record.overall_score = job.confidence_score
                        if job.status == JobStatus.COMPLETED and parse_result:
                            cv_record.parse_quality = json.dumps(parse_result.to_dict(), ensure_ascii=False)
                            # Extract candidate name from parsed CV
                            if parse_result.contact and parse_result.contact.name:
                                cv_record.candidate_name = parse_result.contact.name
                        await db.commit()
            except Exception as db_exc:
                logger.error("Failed to update CV database record for %s: %s", job_id, db_exc)

        return job

    async def process_batch(self, job_ids: List[str]) -> List[ParseJob]:
        """Process multiple jobs sequentially."""
        results = []
        for jid in job_ids:
            results.append(await self.process(jid))
        return results


class WorkerError(Exception):
    """Raised when the worker encounters an unrecoverable error."""
