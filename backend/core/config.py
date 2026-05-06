# Optimized by Skills Agent for RecruitAI
# Application-wide configuration via environment variables
"""
Application Configuration
=========================
Centralised settings loaded from environment variables with sensible defaults.
Uses pydantic-settings for type-safe configuration management.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Optional

from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """Application settings – loaded from env vars or .env file."""

    # ── Application ────────────────────────────────────────────────────
    APP_NAME: str = "RecruitAI"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False

    # ── API ────────────────────────────────────────────────────────────
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    API_PREFIX: str = "/api/v1"

    # ── File Upload ────────────────────────────────────────────────────
    MAX_UPLOAD_SIZE_MB: int = 20
    UPLOAD_DIR: str = str(Path("storage/uploads").resolve())
    PARSED_OUTPUT_DIR: str = str(Path("storage/parsed").resolve())
    ALLOWED_MIME_TYPES: list[str] = ["application/pdf"]

    # ── Redis / Queue ──────────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"
    QUEUE_NAME: str = "cv_parse_jobs"

    # ── Database (placeholder for Sprint 2+) ───────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://recruit:recruit@localhost:5432/recruitai"

    # ── Parser ─────────────────────────────────────────────────────────
    PARSER_OCR_ENABLED: bool = True
    PARSER_MAX_PAGES: int = 30
    PARSER_OCR_TIMEOUT: int = 30           # v2.0: per-page OCR timeout (seconds)
    PARSER_PARSE_TIMEOUT: int = 120        # v2.0: overall parse timeout (seconds)
    BATCH_CONCURRENT_LIMIT: int = 10       # v2.0: max files in a batch upload

    # Chrome extension CV analysis
    ANTHROPIC_API_KEY: str = ""
    ANTHROPIC_MODEL: str = "claude-sonnet-4-20250514"
    CANDIDATE_DB_PATH: str = str(Path("storage/candidates.sqlite3").resolve())
    EXTENSION_DB_PATH: str = str(Path("storage/candidates.sqlite3").resolve())

    @property
    def max_upload_bytes(self) -> int:
        return self.MAX_UPLOAD_SIZE_MB * 1024 * 1024

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}


# Singleton
_settings: Optional[Settings] = None


def get_settings() -> Settings:
    """Return the cached application settings singleton."""
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings
