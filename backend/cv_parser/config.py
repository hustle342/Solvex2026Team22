# Optimized by Skills Agent for RecruitAI
# Configuration module for CV Parser
"""
Parser configuration constants and default values.
Centralizes all tunable parameters for the PDF parsing pipeline.
"""

from dataclasses import dataclass, field
from typing import List


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


@dataclass
class ParserConfig:
    """Runtime configuration for the PDF parser."""

    max_file_size: int = MAX_PDF_SIZE_BYTES
    max_pages: int = MAX_PAGES
    ocr_dpi: int = OCR_DPI
    min_text_length: int = MIN_TEXT_LENGTH_FOR_VALID_PAGE
    confidence_threshold: float = CONFIDENCE_THRESHOLD
    enable_ocr_fallback: bool = True
    supported_languages: List[str] = field(default_factory=lambda: ["tur", "eng"])
