from __future__ import annotations

from dataclasses import dataclass
from email.message import EmailMessage

import pytest

from backend.core.storage import StorageService
from backend.plugins.email_cv import EmailCVAttachment, EmailCVPlugin, extract_pdf_attachments


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


@dataclass
class FakeContact:
    name: str = "Cemil Can OZ"


class FakeParseResult:
    contact = FakeContact()
    confidence_score = 0.95
    error = None

    def to_dict(self):
        return {
            "contact": {"name": self.contact.name},
            "skills": ["Python", "SQL"],
            "confidence_score": self.confidence_score,
            "error": self.error,
        }


class FakeParser:
    def parse(self, content):
        assert content == _MINIMAL_PDF
        return FakeParseResult()


class FakeReader:
    def fetch_pdf_attachments(self, *, limit=10, mailbox=None, search=None):
        return [
            EmailCVAttachment(
                message_id="msg-1",
                sender="aday@example.com",
                subject="CV basvurusu",
                received_at="Thu, 7 May 2026 12:00:00 +0300",
                filename="cemil-cv.pdf",
                content_type="application/pdf",
                content=_MINIMAL_PDF,
            )
        ]


class FakeDB:
    def __init__(self):
        self.record = None
        self.committed = False

    def add(self, record):
        self.record = record

    async def commit(self):
        self.committed = True

    async def refresh(self, record):
        return None


def test_extract_pdf_attachments_from_email_message():
    message = EmailMessage()
    message["From"] = "aday@example.com"
    message["Subject"] = "CV basvurusu"
    message["Message-ID"] = "<msg-1@example.com>"
    message.set_content("Merhaba, CV ekte.")
    message.add_attachment(
        _MINIMAL_PDF,
        maintype="application",
        subtype="pdf",
        filename="aday-cv.pdf",
    )

    attachments = extract_pdf_attachments(message.as_bytes())

    assert len(attachments) == 1
    assert attachments[0].filename == "aday-cv.pdf"
    assert attachments[0].content == _MINIMAL_PDF
    assert attachments[0].sender == "aday@example.com"


@pytest.mark.asyncio
async def test_scan_scores_and_stores_pending_email_cv(tmp_path):
    plugin = EmailCVPlugin(
        reader=FakeReader(),
        parser=FakeParser(),
        storage=StorageService(
            upload_dir=str(tmp_path / "uploads"),
            parsed_dir=str(tmp_path / "parsed"),
        ),
    )

    pending = await plugin.scan(limit=1)

    assert len(pending) == 1
    assert pending[0].candidate_name == "Cemil Can OZ"
    assert pending[0].score == 0.95
    assert plugin.pending_items()[0].pending_id == pending[0].pending_id


@pytest.mark.asyncio
async def test_save_pending_email_cv_persists_completed_cv(tmp_path):
    plugin = EmailCVPlugin(
        reader=FakeReader(),
        parser=FakeParser(),
        storage=StorageService(
            upload_dir=str(tmp_path / "uploads"),
            parsed_dir=str(tmp_path / "parsed"),
        ),
    )
    pending = (await plugin.scan(limit=1))[0]
    db = FakeDB()

    cv = await plugin.save_to_database(
        pending_id=pending.pending_id,
        db=db,
        owner_user_id=7,
    )

    assert db.committed is True
    assert db.record is cv
    assert cv.user_id == 7
    assert cv.status == "completed"
    assert cv.overall_score == 0.95
    assert cv.candidate_name == "Cemil Can OZ"
    assert plugin.pending_items()[0].saved_job_id == cv.id
