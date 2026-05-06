# Optimized by Skills Agent for RecruitAI
# File storage service – handles upload persistence and parsed output storage
"""
Storage Service
===============
Provides local-filesystem storage for uploaded PDFs and parsed JSON outputs.
Designed to be swappable with S3-compatible storage in production.
"""

from __future__ import annotations

import json
import logging
import os
import shutil
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional

from .config import get_settings

logger = logging.getLogger("recruitai.storage")


class StorageService:
    """
    Local filesystem storage for CV uploads and parse results.

    Directory layout::

        storage/
        ├── uploads/          ← raw PDF files
        │   └── <job_id>.pdf
        └── parsed/           ← structured JSON outputs
            └── <job_id>.json
    """

    def __init__(
        self,
        upload_dir: Optional[str] = None,
        parsed_dir: Optional[str] = None,
    ) -> None:
        settings = get_settings()
        self.upload_dir = Path(upload_dir or settings.UPLOAD_DIR)
        self.parsed_dir = Path(parsed_dir or settings.PARSED_OUTPUT_DIR)

        # Ensure directories exist
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        self.parsed_dir.mkdir(parents=True, exist_ok=True)
        logger.info(
            "StorageService ready – uploads=%s  parsed=%s",
            self.upload_dir,
            self.parsed_dir,
        )

    # ── Upload Storage ─────────────────────────────────────────────────
    def save_upload(self, file_bytes: bytes, original_filename: str) -> str:
        """
        Persist a raw PDF upload and return a unique job_id.

        Parameters
        ----------
        file_bytes : bytes
            Raw PDF content.
        original_filename : str
            Original filename from the client.

        Returns
        -------
        str
            A unique job_id that can be used to reference this upload.
        """
        job_id = str(uuid.uuid4())
        safe_ext = Path(original_filename).suffix or ".pdf"
        dest = self.upload_dir / f"{job_id}{safe_ext}"

        try:
            dest.write_bytes(file_bytes)
            logger.info("Saved upload: %s → %s", original_filename, dest)
        except OSError as exc:
            logger.error("Failed to save upload %s: %s", job_id, exc)
            raise StorageError(f"Upload save failed: {exc}") from exc

        return job_id

    def get_upload_path(self, job_id: str) -> Path:
        """Return the filesystem path for an uploaded PDF."""
        # Try with .pdf extension
        path = self.upload_dir / f"{job_id}.pdf"
        if path.exists():
            return path
        # Fallback: scan directory
        for f in self.upload_dir.iterdir():
            if f.stem == job_id:
                return f
        raise StorageError(f"Upload not found: {job_id}")

    def delete_upload(self, job_id: str) -> bool:
        """Delete a stored upload. Returns True if deleted."""
        try:
            path = self.get_upload_path(job_id)
            path.unlink()
            logger.info("Deleted upload: %s", job_id)
            return True
        except (StorageError, OSError):
            return False

    # ── Parsed Output Storage ──────────────────────────────────────────
    def save_parsed_result(self, job_id: str, result_dict: Dict[str, Any]) -> Path:
        """
        Persist a parsed CV result as JSON.

        Parameters
        ----------
        job_id : str
            The job identifier (from save_upload).
        result_dict : dict
            The ParseResult.to_dict() output.

        Returns
        -------
        Path
            Path to the saved JSON file.
        """
        dest = self.parsed_dir / f"{job_id}.json"
        try:
            dest.write_text(
                json.dumps(result_dict, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
            logger.info("Saved parsed result: %s", dest)
        except OSError as exc:
            logger.error("Failed to save parsed result %s: %s", job_id, exc)
            raise StorageError(f"Parsed result save failed: {exc}") from exc
        return dest

    def get_parsed_result(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Load a previously parsed result by job_id. Returns None if not found."""
        path = self.parsed_dir / f"{job_id}.json"
        if not path.exists():
            return None
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError) as exc:
            logger.warning("Failed to read parsed result %s: %s", job_id, exc)
            return None

    def list_parsed_results(self, limit: int = 100) -> list[Dict[str, Any]]:
        """List recent parsed results (metadata only)."""
        results = []
        files = sorted(self.parsed_dir.glob("*.json"), key=os.path.getmtime, reverse=True)
        for f in files[:limit]:
            try:
                data = json.loads(f.read_text(encoding="utf-8"))
                results.append({
                    "job_id": f.stem,
                    "source_file": data.get("source_file", ""),
                    "confidence_score": data.get("confidence_score", 0.0),
                    "parsed_at": data.get("parsed_at", ""),
                    "error": data.get("error"),
                })
            except (json.JSONDecodeError, OSError):
                continue
        return results


class StorageError(Exception):
    """Raised when a storage operation fails."""
