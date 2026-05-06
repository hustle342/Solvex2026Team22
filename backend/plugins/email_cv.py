"""Email CV ingestion plugin.

This module keeps the email-specific work out of the API layer:
it reads PDF attachments from IMAP, parses/scores them, keeps previews in
memory, and persists a selected preview to the existing CV table on demand.
"""

from __future__ import annotations

import asyncio
import imaplib
import json
import logging
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from email import message_from_bytes, policy
from email.message import Message
from pathlib import Path
from typing import Any, Iterable, List, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.models import CV
from backend.core.storage import StorageService
from backend.core.worker import JobStatus

logger = logging.getLogger("recruitai.plugins.email_cv")


class EmailCVError(Exception):
    """Base error for the email CV plugin."""


class EmailCVConfigError(EmailCVError):
    """Raised when IMAP settings are missing or invalid."""


class PendingEmailCVNotFound(EmailCVError):
    """Raised when a pending preview cannot be found."""


class PendingEmailCVAlreadySaved(EmailCVError):
    """Raised when a preview has already been saved."""


class PendingEmailCVParseFailed(EmailCVError):
    """Raised when a failed preview is sent to save."""


@dataclass
class EmailCVAttachment:
    """A PDF attachment extracted from an email message."""

    message_id: str
    sender: str
    subject: str
    received_at: Optional[str]
    filename: str
    content_type: str
    content: bytes


@dataclass
class PendingEmailCV:
    """A parsed/scored email CV awaiting explicit save."""

    pending_id: str
    attachment: EmailCVAttachment
    parse_result: Any
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    saved_job_id: Optional[str] = None

    @property
    def candidate_name(self) -> str:
        contact = getattr(self.parse_result, "contact", None)
        return getattr(contact, "name", None) or "Bilinmiyor"

    @property
    def score(self) -> float:
        return float(getattr(self.parse_result, "confidence_score", 0.0) or 0.0)

    @property
    def error(self) -> Optional[str]:
        return getattr(self.parse_result, "error", None)

    def preview_dict(self) -> dict[str, Any]:
        return {
            "pending_id": self.pending_id,
            "candidate_name": self.candidate_name,
            "score": self.score,
            "status": "saved" if self.saved_job_id else ("failed" if self.error else "ready"),
            "error": self.error,
            "file_name": self.attachment.filename,
            "email_subject": self.attachment.subject,
            "email_sender": self.attachment.sender,
            "email_received_at": self.attachment.received_at,
            "created_at": self.created_at,
            "saved_job_id": self.saved_job_id,
        }


def _message_value(message: Message, header: str) -> str:
    value = message.get(header)
    return str(value) if value else ""


def _is_pdf_attachment(filename: str, content_type: str) -> bool:
    return content_type.lower() == "application/pdf" or filename.lower().endswith(".pdf")


def extract_pdf_attachments(raw_message: bytes, fallback_id: str = "") -> list[EmailCVAttachment]:
    """Extract PDF attachments from a raw RFC822 email message."""

    message = message_from_bytes(raw_message, policy=policy.default)
    message_id = _message_value(message, "Message-ID") or fallback_id or str(uuid.uuid4())
    sender = _message_value(message, "From")
    subject = _message_value(message, "Subject")
    received_at = _message_value(message, "Date") or None

    attachments: list[EmailCVAttachment] = []
    for part in message.walk():
        if part.is_multipart():
            continue

        filename = part.get_filename() or ""
        content_type = part.get_content_type() or ""
        disposition = (part.get_content_disposition() or "").lower()

        if not filename and disposition != "attachment":
            continue
        if not _is_pdf_attachment(filename, content_type):
            continue

        payload = part.get_payload(decode=True)
        if not payload:
            continue

        attachments.append(
            EmailCVAttachment(
                message_id=message_id,
                sender=sender,
                subject=subject,
                received_at=received_at,
                filename=Path(filename or "mail-cv.pdf").name,
                content_type=content_type,
                content=payload,
            )
        )

    return attachments


class IMAPEmailCVReader:
    """Fetch PDF CV attachments from an IMAP mailbox."""

    def __init__(self, settings: Any) -> None:
        self.settings = settings

    def _require_config(self) -> tuple[str, int, str, str, bool]:
        host = getattr(self.settings, "EMAIL_CV_IMAP_HOST", "")
        username = getattr(self.settings, "EMAIL_CV_IMAP_USERNAME", "")
        password = getattr(self.settings, "EMAIL_CV_IMAP_PASSWORD", "")
        port = int(getattr(self.settings, "EMAIL_CV_IMAP_PORT", 993))
        use_ssl = bool(getattr(self.settings, "EMAIL_CV_IMAP_USE_SSL", True))

        if not host or not username or not password:
            raise EmailCVConfigError(
                "Email CV eklentisi ayarlanmamis. EMAIL_CV_IMAP_HOST, "
                "EMAIL_CV_IMAP_USERNAME ve EMAIL_CV_IMAP_PASSWORD degerlerini tanimlayin."
            )
        return host, port, username, password, use_ssl

    def fetch_pdf_attachments(
        self,
        *,
        limit: int = 10,
        mailbox: Optional[str] = None,
        search: Optional[str] = None,
    ) -> list[EmailCVAttachment]:
        host, port, username, password, use_ssl = self._require_config()
        mailbox_name = mailbox or getattr(self.settings, "EMAIL_CV_IMAP_MAILBOX", "INBOX")
        search_query = search or getattr(self.settings, "EMAIL_CV_IMAP_SEARCH", "UNSEEN")

        client_cls = imaplib.IMAP4_SSL if use_ssl else imaplib.IMAP4
        client = client_cls(host, port)
        try:
            client.login(username, password)
            status, _ = client.select(mailbox_name)
            if status != "OK":
                raise EmailCVError(f"Cannot select mailbox: {mailbox_name}")

            search_parts = tuple(search_query.split()) or ("UNSEEN",)
            status, data = client.search(None, *search_parts)
            if status != "OK" or not data:
                return []

            message_ids = data[0].split()
            if limit > 0:
                message_ids = message_ids[-limit:]

            attachments: list[EmailCVAttachment] = []
            for message_id in message_ids:
                status, fetched = client.fetch(message_id, "(RFC822)")
                if status != "OK" or not fetched:
                    continue
                for item in fetched:
                    if not isinstance(item, tuple):
                        continue
                    raw = item[1]
                    attachments.extend(extract_pdf_attachments(raw, fallback_id=message_id.decode()))
            return attachments
        finally:
            try:
                client.logout()
            except Exception:
                logger.debug("IMAP logout failed", exc_info=True)


class PendingEmailCVStore:
    """In-memory preview store for email CVs awaiting confirmation."""

    def __init__(self) -> None:
        self._items: dict[str, PendingEmailCV] = {}

    def add(self, attachment: EmailCVAttachment, parse_result: Any) -> PendingEmailCV:
        pending = PendingEmailCV(
            pending_id=str(uuid.uuid4()),
            attachment=attachment,
            parse_result=parse_result,
        )
        self._items[pending.pending_id] = pending
        return pending

    def get(self, pending_id: str) -> PendingEmailCV:
        item = self._items.get(pending_id)
        if item is None:
            raise PendingEmailCVNotFound(f"Pending email CV not found: {pending_id}")
        return item

    def list_all(self) -> list[PendingEmailCV]:
        return sorted(self._items.values(), key=lambda item: item.created_at, reverse=True)

    def mark_saved(self, pending_id: str, job_id: str) -> None:
        item = self.get(pending_id)
        item.saved_job_id = job_id


class EmailCVPlugin:
    """Email CV scanning, scoring, and explicit persistence workflow."""

    def __init__(
        self,
        *,
        reader: IMAPEmailCVReader,
        parser: Any,
        storage: StorageService,
        pending_store: Optional[PendingEmailCVStore] = None,
    ) -> None:
        self.reader = reader
        self.parser = parser
        self.storage = storage
        self.pending_store = pending_store or PendingEmailCVStore()

    async def scan(
        self,
        *,
        limit: int = 10,
        mailbox: Optional[str] = None,
        search: Optional[str] = None,
    ) -> list[PendingEmailCV]:
        loop = asyncio.get_running_loop()
        attachments = await loop.run_in_executor(
            None,
            lambda: self.reader.fetch_pdf_attachments(limit=limit, mailbox=mailbox, search=search),
        )

        pending_items: list[PendingEmailCV] = []
        for attachment in attachments:
            parse_result = await loop.run_in_executor(None, self.parser.parse, attachment.content)
            pending_items.append(self.pending_store.add(attachment, parse_result))

        return pending_items

    def pending_items(self) -> list[PendingEmailCV]:
        return self.pending_store.list_all()

    async def save_to_database(
        self,
        *,
        pending_id: str,
        db: AsyncSession,
        owner_user_id: int,
    ) -> CV:
        pending = self.pending_store.get(pending_id)
        if pending.saved_job_id:
            raise PendingEmailCVAlreadySaved(f"Pending email CV already saved: {pending_id}")
        if pending.error:
            raise PendingEmailCVParseFailed(f"Pending email CV cannot be saved: {pending.error}")

        job_id = self.storage.save_upload(pending.attachment.content, pending.attachment.filename)
        result_dict = pending.parse_result.to_dict()
        result_dict["job_id"] = job_id
        result_dict["email_source"] = {
            "message_id": pending.attachment.message_id,
            "sender": pending.attachment.sender,
            "subject": pending.attachment.subject,
            "received_at": pending.attachment.received_at,
            "attachment_filename": pending.attachment.filename,
        }
        result_dict["ingestion"] = {
            "source": "email_cv_plugin",
            "pending_id": pending.pending_id,
            "saved_at": datetime.now(timezone.utc).isoformat(),
        }

        self.storage.save_parsed_result(job_id, result_dict)

        cv_record = CV(
            id=job_id,
            user_id=owner_user_id,
            file_name=pending.attachment.filename,
            candidate_name=pending.candidate_name,
            status=JobStatus.COMPLETED.value,
            overall_score=pending.score,
            parse_quality=json.dumps(result_dict, ensure_ascii=False),
        )
        db.add(cv_record)
        await db.commit()
        await db.refresh(cv_record)

        self.pending_store.mark_saved(pending_id, job_id)
        return cv_record


def previews_to_dict(items: Iterable[PendingEmailCV]) -> list[dict[str, Any]]:
    return [item.preview_dict() for item in items]
