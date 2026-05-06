# Optimized by Skills Agent for RecruitAI
# Configuration module for CV Parser v2.0
"""
Parser configuration constants and default values.
Centralizes all tunable parameters for the PDF parsing pipeline.

v2.0 additions:
  - OCR timeout per page
  - Overall parse timeout
  - Batch concurrent processing limit
  - Bilingual (TR/EN) error message catalog
"""

from dataclasses import dataclass, field
from typing import Dict, List


# ── Section Header Patterns (TR + EN) ─────────────────────────────────────
# NOTE: Turkish is agglutinative – "beceri" → "beceriler", "sertifika" →
# "sertifikalar", etc.  We therefore match the *stem* without a trailing \b.
SECTION_PATTERNS: dict[str, List[str]] = {
    "contact": [
        r"(?i)(contact|iletişim|iletisim|kişisel\s*bilgi|kisisel\s*bilgi|personal\s*info)",
    ],
    "education": [
        r"(?i)(education|eğitim|egitim|öğrenim|ogrenim|academic)",
    ],
    "experience": [
        r"(?i)(experience|deneyim|iş\s*deneyim|is\s*deneyim|work\s*history|professional\s*experience)",
    ],
    "skills": [
        r"(?i)(skills?|beceri|yetenek|yetkinlik|competenc|technical\s*skills?|teknik\s*beceri)",
    ],
    "languages": [
        r"(?i)(language|yabancı?\s*dil|yabanci?\s*dil|foreign\s*language)",
    ],
    "certifications": [
        r"(?i)(certif|sertifika|license|accreditation)",
    ],
    "summary": [
        r"(?i)(summary|özet|ozet|objective|profil|profile|about\s*me|hakkımda|hakkimda)",
    ],
    "projects": [
        r"(?i)(projects?|proje)",
    ],
    "references": [
        r"(?i)(referans|reference)",
    ],
}

# ── Contact Extraction Patterns ───────────────────────────────────────────
EMAIL_PATTERN = r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}"
PHONE_PATTERN = r"(?:\+?\d{1,3}[\s\-]?)?\(?\d{2,4}\)?[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}"
LINKEDIN_PATTERN = r"(?:https?://)?(?:www\.)?linkedin\.com/in/[\w\-]+"
GITHUB_PATTERN = r"(?:https?://)?(?:www\.)?github\.com/[\w\-]+"

# ── Date Patterns ─────────────────────────────────────────────────────────
DATE_RANGE_PATTERN = (
    r"(\d{1,2}[/.\-]\d{4}|\w+\s+\d{4}|\d{4})"
    r"\s*[\-–—]\s*"
    r"(\d{1,2}[/.\-]\d{4}|\w+\s+\d{4}|\d{4}|present|günümüz|halen|devam)"
)

# ── Performance Defaults ──────────────────────────────────────────────────
MAX_PDF_SIZE_BYTES: int = 20 * 1024 * 1024  # 20 MB
MAX_PAGES: int = 30
OCR_DPI: int = 300
MIN_TEXT_LENGTH_FOR_VALID_PAGE: int = 30
CONFIDENCE_THRESHOLD: float = 0.60
OCR_TIMEOUT_SECONDS: int = 30          # v2.0: per-page OCR timeout
PARSE_TIMEOUT_SECONDS: int = 120       # v2.0: overall parse timeout
BATCH_CONCURRENT_LIMIT: int = 10       # v2.0: max files in a single batch
PARSER_TELEMETRY_ENABLED: bool = True  # v2.0: Telemetry for performance and OCR fallback tracking


@dataclass
class ParserConfig:
    """Runtime configuration for the PDF parser (v2.0)."""

    max_file_size: int = MAX_PDF_SIZE_BYTES
    max_pages: int = MAX_PAGES
    ocr_dpi: int = OCR_DPI
    min_text_length: int = MIN_TEXT_LENGTH_FOR_VALID_PAGE
    confidence_threshold: float = CONFIDENCE_THRESHOLD
    enable_ocr_fallback: bool = True
    supported_languages: List[str] = field(default_factory=lambda: ["tur", "eng"])
    # v2.0 additions
    ocr_timeout_seconds: int = OCR_TIMEOUT_SECONDS
    parse_timeout_seconds: int = PARSE_TIMEOUT_SECONDS
    batch_concurrent_limit: int = BATCH_CONCURRENT_LIMIT
    telemetry_enabled: bool = PARSER_TELEMETRY_ENABLED


# ── Bilingual Error Messages (v2.0) ───────────────────────────────────────
class ErrorMessages:
    """
    Standardised bilingual (TR/EN) error catalog.
    Every error has a code, Turkish message, and English message.
    """

    EMPTY_FILE = {
        "code": "ERR_EMPTY_FILE",
        "tr": "Boş dosya yüklenemez.",
        "en": "Empty file cannot be uploaded.",
    }
    INVALID_PDF = {
        "code": "ERR_INVALID_PDF",
        "tr": "Dosya geçerli bir PDF değil.",
        "en": "File is not a valid PDF.",
    }
    FILE_TOO_LARGE = {
        "code": "ERR_FILE_TOO_LARGE",
        "tr": "Dosya boyutu izin verilen sınırı aşıyor.",
        "en": "File size exceeds the allowed limit.",
    }
    TOO_MANY_PAGES = {
        "code": "ERR_TOO_MANY_PAGES",
        "tr": "PDF sayfa sayısı izin verilen sınırı aşıyor.",
        "en": "PDF page count exceeds the allowed limit.",
    }
    PARSE_TIMEOUT = {
        "code": "ERR_PARSE_TIMEOUT",
        "tr": "Ayrıştırma işlemi zaman aşımına uğradı.",
        "en": "Parse operation timed out.",
    }
    OCR_TIMEOUT = {
        "code": "ERR_OCR_TIMEOUT",
        "tr": "OCR işlemi zaman aşımına uğradı.",
        "en": "OCR processing timed out.",
    }
    OCR_FAILED = {
        "code": "ERR_OCR_FAILED",
        "tr": "OCR işlemi başarısız oldu.",
        "en": "OCR processing failed.",
    }
    EXTRACTION_FAILED = {
        "code": "ERR_EXTRACTION_FAILED",
        "tr": "PDF'den metin çıkarılamadı.",
        "en": "Failed to extract text from PDF.",
    }
    NO_TEXT_EXTRACTED = {
        "code": "ERR_NO_TEXT",
        "tr": "PDF'den hiçbir metin çıkarılamadı.",
        "en": "No text could be extracted from the PDF.",
    }
    CORRUPTED_PDF = {
        "code": "ERR_CORRUPTED_PDF",
        "tr": "PDF dosyası bozuk veya okunamıyor.",
        "en": "PDF file is corrupted or unreadable.",
    }
    UNSUPPORTED_TYPE = {
        "code": "ERR_UNSUPPORTED_TYPE",
        "tr": "Yalnızca PDF dosyaları kabul edilir.",
        "en": "Only PDF files are accepted.",
    }
    FILE_NOT_FOUND = {
        "code": "ERR_FILE_NOT_FOUND",
        "tr": "Dosya bulunamadı.",
        "en": "File not found.",
    }
    BATCH_LIMIT_EXCEEDED = {
        "code": "ERR_BATCH_LIMIT",
        "tr": "Toplu yükleme sınırı aşıldı.",
        "en": "Batch upload limit exceeded.",
    }
    STORAGE_FAILED = {
        "code": "ERR_STORAGE",
        "tr": "Dosya depolanamadı.",
        "en": "File storage failed.",
    }
    JOB_NOT_FOUND = {
        "code": "ERR_JOB_NOT_FOUND",
        "tr": "İş bulunamadı.",
        "en": "Job not found.",
    }

    @staticmethod
    def format(msg: Dict[str, str], **kwargs) -> Dict[str, str]:
        """Return a copy with optional format kwargs applied to both languages."""
        return {
            "code": msg["code"],
            "tr": msg["tr"].format(**kwargs) if kwargs else msg["tr"],
            "en": msg["en"].format(**kwargs) if kwargs else msg["en"],
        }

