"""API endpoints for the email CV ingestion plugin."""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.auth import get_current_user
from backend.core.config import get_settings
from backend.core.database import get_db
from backend.core.models import User
from backend.core.storage import StorageService
from backend.cv_parser import PDFCVParser, ParserConfig
from backend.plugins.email_cv import (
    EmailCVConfigError,
    EmailCVError,
    EmailCVPlugin,
    IMAPEmailCVReader,
    PendingEmailCVAlreadySaved,
    PendingEmailCVNotFound,
    PendingEmailCVParseFailed,
    PendingEmailCVStore,
    previews_to_dict,
)

logger = logging.getLogger("recruitai.api.email_cv")

router = APIRouter(prefix="/email-cv", tags=["email-cv"])

_plugin: Optional[EmailCVPlugin] = None


class EmailCVScanRequest(BaseModel):
    limit: int = Field(default=10, ge=1, le=50)
    mailbox: Optional[str] = None
    search: Optional[str] = None


class EmailCVPreviewResponse(BaseModel):
    pending_id: str
    candidate_name: str
    score: float
    status: str
    error: Optional[str] = None
    file_name: str
    email_subject: str
    email_sender: str
    email_received_at: Optional[str] = None
    created_at: str
    saved_job_id: Optional[str] = None


class EmailCVScanResponse(BaseModel):
    total: int
    items: list[EmailCVPreviewResponse]


class EmailCVSaveResponse(BaseModel):
    cv_id: str
    pending_id: str
    file_name: str
    candidate_name: str
    score: float
    status: str
    message: str


def init_email_cv_deps() -> None:
    """Initialise the email CV plugin singleton."""

    global _plugin
    settings = get_settings()
    storage = StorageService()
    parser_config = ParserConfig(
        enable_ocr_fallback=settings.PARSER_OCR_ENABLED,
        max_pages=settings.PARSER_MAX_PAGES,
        max_file_size=settings.max_upload_bytes,
    )
    parser = PDFCVParser(config=parser_config)
    reader = IMAPEmailCVReader(settings)
    _plugin = EmailCVPlugin(
        reader=reader,
        parser=parser,
        storage=storage,
        pending_store=PendingEmailCVStore(),
    )


def get_email_cv_plugin() -> EmailCVPlugin:
    if _plugin is None:
        init_email_cv_deps()
    return _plugin  # type: ignore[return-value]


def require_hr(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "hr":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sadece Insan Kaynaklari email CV eklentisini kullanabilir.",
        )
    return current_user


@router.post(
    "/scan",
    response_model=EmailCVScanResponse,
    summary="Mail kutusundaki PDF CV eklerini tara ve puanla",
)
async def scan_email_cvs(
    payload: EmailCVScanRequest,
    _: User = Depends(require_hr),
    plugin: EmailCVPlugin = Depends(get_email_cv_plugin),
) -> EmailCVScanResponse:
    try:
        pending = await plugin.scan(
            limit=payload.limit,
            mailbox=payload.mailbox,
            search=payload.search,
        )
    except EmailCVConfigError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except EmailCVError as exc:
        logger.warning("Email CV scan failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc

    items = previews_to_dict(pending)
    return EmailCVScanResponse(total=len(items), items=items)


@router.get(
    "/pending",
    response_model=EmailCVScanResponse,
    summary="Kaydedilmeyi bekleyen email CV onizlemelerini listele",
)
async def list_pending_email_cvs(
    _: User = Depends(require_hr),
    plugin: EmailCVPlugin = Depends(get_email_cv_plugin),
) -> EmailCVScanResponse:
    items = previews_to_dict(plugin.pending_items())
    return EmailCVScanResponse(total=len(items), items=items)


@router.post(
    "/pending/{pending_id}/save",
    response_model=EmailCVSaveResponse,
    summary="Onizlenen email CV kaydini veritabanina kaydet",
)
async def save_email_cv(
    pending_id: str,
    current_user: User = Depends(require_hr),
    db: AsyncSession = Depends(get_db),
    plugin: EmailCVPlugin = Depends(get_email_cv_plugin),
) -> EmailCVSaveResponse:
    try:
        cv = await plugin.save_to_database(
            pending_id=pending_id,
            db=db,
            owner_user_id=current_user.id,
        )
    except PendingEmailCVNotFound as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except PendingEmailCVAlreadySaved as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    except PendingEmailCVParseFailed as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    return EmailCVSaveResponse(
        cv_id=cv.id,
        pending_id=pending_id,
        file_name=cv.file_name,
        candidate_name=cv.candidate_name or "Bilinmiyor",
        score=cv.overall_score or 0.0,
        status=cv.status,
        message="Email CV kaydi veritabanina kaydedildi.",
    )
