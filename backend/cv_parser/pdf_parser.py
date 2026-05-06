# Optimized by Skills Agent for RecruitAI
# Core PDF CV Parser v2.0 – Text extraction, section detection, structured JSON output
"""
PDFCVParser
===========
High-accuracy PDF CV parser that:
  1. Extracts raw text via pdfplumber (layout-aware).
  2. Falls back to OCR (pytesseract + pdf2image) for image-based pages.
  3. Detects and segments CV sections (contact, education, experience, skills, …).
  4. Extracts structured contact information (email, phone, LinkedIn, GitHub).
  5. Produces a validated JSON output with per-field confidence scores.

Design goals aligned with RecruitAI KPIs:
  - Critical-field parse accuracy ≥ 90 %
  - Manual data-entry reduction ≥ 50 %
"""

from __future__ import annotations

import concurrent.futures
import hashlib
import io
import logging
import os
import re
import time
import uuid
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

import pdfplumber

from .config import (
    SECTION_PATTERNS,
    EMAIL_PATTERN,
    PHONE_PATTERN,
    LINKEDIN_PATTERN,
    GITHUB_PATTERN,
    DATE_RANGE_PATTERN,
    ParserConfig,
    ErrorMessages,
)

# ── Logging ────────────────────────────────────────────────────────────────
logger = logging.getLogger("recruitai.cv_parser")


# ── Data classes ───────────────────────────────────────────────────────────
@dataclass
class ContactInfo:
    """Extracted contact details."""
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    linkedin: Optional[str] = None
    github: Optional[str] = None
    location: Optional[str] = None


@dataclass
class EducationEntry:
    """Single education record."""
    institution: Optional[str] = None
    degree: Optional[str] = None
    field_of_study: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    gpa: Optional[str] = None
    raw_text: str = ""


@dataclass
class ExperienceEntry:
    """Single work-experience record."""
    company: Optional[str] = None
    title: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    description: Optional[str] = None
    raw_text: str = ""


@dataclass
class ParseResult:
    """Final structured CV parse output."""
    parse_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    source_file: str = ""
    file_hash: str = ""
    parsed_at: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    parse_duration_ms: float = 0.0
    total_pages: int = 0
    ocr_pages: int = 0
    raw_text: str = ""
    contact: ContactInfo = field(default_factory=ContactInfo)
    summary: str = ""
    education: List[EducationEntry] = field(default_factory=list)
    experience: List[ExperienceEntry] = field(default_factory=list)
    skills: List[str] = field(default_factory=list)
    languages: List[str] = field(default_factory=list)
    certifications: List[str] = field(default_factory=list)
    projects: List[str] = field(default_factory=list)
    sections_detected: List[str] = field(default_factory=list)
    confidence_score: float = 0.0
    field_confidences: Dict[str, float] = field(default_factory=dict)
    warnings: List[str] = field(default_factory=list)
    error: Optional[str] = None

    # ── Serialisation helpers ──────────────────────────────────────────
    def to_dict(self) -> Dict[str, Any]:
        """Convert to a plain dict (JSON-serialisable)."""
        return asdict(self)

    def to_json(self, **kwargs) -> str:
        """Serialize to a JSON string."""
        import json

        return json.dumps(self.to_dict(), ensure_ascii=False, indent=2, **kwargs)


# ── Main Parser ────────────────────────────────────────────────────────────
class PDFCVParser:
    """
    High-performance, fault-tolerant PDF CV parser.

    Usage
    -----
    >>> parser = PDFCVParser()
    >>> result = parser.parse("path/to/cv.pdf")
    >>> print(result.to_json())
    """

    def __init__(self, config: Optional[ParserConfig] = None) -> None:
        self.config = config or ParserConfig()
        logger.info("PDFCVParser initialised – OCR fallback=%s", self.config.enable_ocr_fallback)

    # ── Public API ─────────────────────────────────────────────────────
    def parse(self, source: Union[str, Path, bytes, io.IOBase]) -> ParseResult:
        """
        Parse a PDF CV and return a structured ``ParseResult``.

        Parameters
        ----------
        source : str | Path | bytes | io.IOBase
            File path, raw bytes, or file-like object of the PDF.

        Returns
        -------
        ParseResult
            Structured parse output with confidence scores.
        """
        start = time.perf_counter()
        result = ParseResult()

        try:
            pdf_bytes, source_label = self._resolve_source(source)
            result.source_file = source_label
            result.file_hash = hashlib.sha256(pdf_bytes).hexdigest()

            # ── Validate ────────────────────────────────────────────
            self._validate_pdf(pdf_bytes)

            # ── Extract text ────────────────────────────────────────
            raw_text, total_pages, ocr_pages, page_warnings = self._extract_text(
                pdf_bytes
            )
            result.raw_text = raw_text
            result.total_pages = total_pages
            result.ocr_pages = ocr_pages
            result.warnings.extend(page_warnings)

            if not raw_text.strip():
                result.error = "No text could be extracted from the PDF."
                result.confidence_score = 0.0
                return result

            # ── Detect sections ─────────────────────────────────────
            sections = self._detect_sections(raw_text)
            result.sections_detected = list(sections.keys())

            # ── Extract structured fields ───────────────────────────
            result.contact = self._extract_contact(raw_text, sections)
            result.summary = self._extract_summary(sections)
            result.education = self._extract_education(sections)
            result.experience = self._extract_experience(sections)
            result.skills = self._extract_skills(sections)
            result.languages = self._extract_languages(sections)
            result.certifications = self._extract_certifications(sections)
            result.projects = self._extract_projects(sections)

            # ── Confidence scoring ──────────────────────────────────
            result.field_confidences = self._compute_field_confidences(result)
            result.confidence_score = self._compute_overall_confidence(result)

        except FileValidationError as exc:
            logger.error("Validation failed: %s", exc)
            result.error = f"Validation error: {exc}"
            result.confidence_score = 0.0
        except ParseTimeoutError as exc:
            logger.error("Parse timeout: %s", exc)
            result.error = ErrorMessages.PARSE_TIMEOUT["en"]
            result.confidence_score = 0.0
        except TextExtractionError as exc:
            logger.error("Text extraction failed: %s", exc)
            result.error = f"Extraction error: {exc}"
            result.confidence_score = 0.0
        except Exception as exc:  # noqa: BLE001
            logger.exception("Unexpected error during CV parsing")
            result.error = f"Unexpected error: {exc}"
            result.confidence_score = 0.0
        finally:
            elapsed = (time.perf_counter() - start) * 1000
            result.parse_duration_ms = round(elapsed, 2)
            logger.info(
                "Parse complete – file=%s  confidence=%.2f  duration=%.0fms",
                result.source_file,
                result.confidence_score,
                result.parse_duration_ms,
            )

        return result

    def parse_batch(
        self, sources: List[Union[str, Path, bytes]]
    ) -> List[ParseResult]:
        """Parse multiple CVs sequentially and return a list of results."""
        results: List[ParseResult] = []
        for idx, src in enumerate(sources, 1):
            logger.info("Batch item %d/%d", idx, len(sources))
            results.append(self.parse(src))
        return results

    # ── Source Resolution ──────────────────────────────────────────────
    def _resolve_source(
        self, source: Union[str, Path, bytes, io.IOBase]
    ) -> Tuple[bytes, str]:
        """Resolve various input types to (bytes, label)."""
        if isinstance(source, (str, Path)):
            path = Path(source)
            if not path.exists():
                raise FileValidationError(f"File not found: {path}")
            return path.read_bytes(), path.name
        elif isinstance(source, bytes):
            return source, "bytes_input"
        elif hasattr(source, "read"):
            data = source.read()
            name = getattr(source, "name", "stream_input")
            return data, name
        else:
            raise FileValidationError(
                f"Unsupported source type: {type(source).__name__}"
            )

    # ── Validation ─────────────────────────────────────────────────────
    def _validate_pdf(self, pdf_bytes: bytes) -> None:
        """Validate the PDF binary payload."""
        if len(pdf_bytes) == 0:
            raise FileValidationError("Empty file")
        if len(pdf_bytes) > self.config.max_file_size:
            raise FileValidationError(
                f"File size {len(pdf_bytes)} exceeds limit "
                f"{self.config.max_file_size}"
            )
        if not pdf_bytes[:5] == b"%PDF-":
            raise FileValidationError("File does not appear to be a valid PDF")

    # ── Text Extraction ────────────────────────────────────────────────
    def _extract_text(
        self, pdf_bytes: bytes
    ) -> Tuple[str, int, int, List[str]]:
        """
        Extract text page-by-page. Falls back to OCR if a page yields
        insufficient text.

        Returns (full_text, total_pages, ocr_page_count, warnings).
        """
        pages_text: List[str] = []
        ocr_pages = 0
        warnings: List[str] = []
        total_pages = 0

        try:
            with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
                total_pages = len(pdf.pages)

                if total_pages > self.config.max_pages:
                    raise FileValidationError(
                        f"PDF has {total_pages} pages (limit: {self.config.max_pages})"
                    )

                for page_num, page in enumerate(pdf.pages, 1):
                    try:
                        text = page.extract_text() or ""
                    except Exception as exc:  # noqa: BLE001
                        logger.warning(
                            "pdfplumber failed on page %d: %s", page_num, exc
                        )
                        text = ""

                    # ── OCR Fallback ────────────────────────────────
                    if (
                        len(text.strip()) < self.config.min_text_length
                        and self.config.enable_ocr_fallback
                    ):
                        ocr_text = self._ocr_page(pdf_bytes, page_num)
                        if ocr_text:
                            text = ocr_text
                            ocr_pages += 1
                            warnings.append(
                                f"Page {page_num}: OCR fallback used"
                            )

                    pages_text.append(text)

        except FileValidationError:
            raise
        except Exception as exc:
            raise TextExtractionError(
                f"Failed to open/read PDF: {exc}"
            ) from exc

        full_text = "\n\n".join(pages_text)
        return full_text, total_pages, ocr_pages, warnings

    def _ocr_page(self, pdf_bytes: bytes, page_number: int) -> Optional[str]:
        """
        Run OCR on a single page using pdf2image + pytesseract.
        Returns extracted text or None on failure.
        Enforces per-page timeout (v2.0).
        """
        def _do_ocr() -> Optional[str]:
            from pdf2image import convert_from_bytes
            import pytesseract

            images = convert_from_bytes(
                pdf_bytes,
                first_page=page_number,
                last_page=page_number,
                dpi=self.config.ocr_dpi,
            )
            if not images:
                return None

            lang_str = "+".join(self.config.supported_languages)
            text = pytesseract.image_to_string(images[0], lang=lang_str)
            return text.strip() if text else None

        try:
            with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
                future = pool.submit(_do_ocr)
                return future.result(timeout=self.config.ocr_timeout_seconds)

        except concurrent.futures.TimeoutError:
            logger.warning(
                "OCR timeout on page %d (limit: %ds)",
                page_number, self.config.ocr_timeout_seconds,
            )
            return None
        except ImportError:
            logger.warning(
                "OCR dependencies (pdf2image / pytesseract) not installed. "
                "Skipping OCR fallback."
            )
            return None
        except Exception as exc:  # noqa: BLE001
            logger.warning("OCR failed on page %d: %s", page_number, exc)
            return None

    # ── Section Detection ──────────────────────────────────────────────
    _MAX_HEADER_LINE_LENGTH = 60

    def _is_section_header(self, line: str) -> Optional[str]:
        """
        Return the section name if *line* looks like a section header,
        otherwise ``None``.

        Heuristic rules:
        1. The line must be short (≤ 60 chars) – real headers are brief.
        2. The keyword must start near the beginning of the line (first 30 chars).
        3. We only accept the *first* matching section to avoid double-matching.
        """
        stripped = line.strip()
        if not stripped or len(stripped) > self._MAX_HEADER_LINE_LENGTH:
            return None

        for section_name, patterns in SECTION_PATTERNS.items():
            for pattern in patterns:
                m = re.search(pattern, stripped)
                if m and m.start() < 30:
                    return section_name
        return None

    def _detect_sections(self, text: str) -> Dict[str, str]:
        """
        Split the CV text into named sections using regex header matching.
        Returns a mapping of section_name → section_body.
        """
        lines = text.split("\n")
        section_boundaries: List[Tuple[int, str]] = []

        for idx, line in enumerate(lines):
            section_name = self._is_section_header(line)
            if section_name is not None:
                section_boundaries.append((idx, section_name))

        # Build section bodies
        sections: Dict[str, str] = {}
        for i, (start_idx, name) in enumerate(section_boundaries):
            end_idx = (
                section_boundaries[i + 1][0]
                if i + 1 < len(section_boundaries)
                else len(lines)
            )
            body = "\n".join(lines[start_idx + 1 : end_idx]).strip()
            if name in sections:
                sections[name] += "\n" + body
            else:
                sections[name] = body

        # If no sections detected, treat entire text as a single block
        if not sections:
            sections["_full"] = text

        return sections

    # ── Field Extractors ───────────────────────────────────────────────
    def _extract_contact(
        self, full_text: str, sections: Dict[str, str]
    ) -> ContactInfo:
        """Extract contact information from the full text."""
        contact = ContactInfo()

        # Email
        email_match = re.search(EMAIL_PATTERN, full_text)
        if email_match:
            contact.email = email_match.group(0).lower()

        # Phone
        phone_match = re.search(PHONE_PATTERN, full_text)
        if phone_match:
            contact.phone = phone_match.group(0).strip()

        # LinkedIn
        li_match = re.search(LINKEDIN_PATTERN, full_text)
        if li_match:
            contact.linkedin = li_match.group(0)

        # GitHub
        gh_match = re.search(GITHUB_PATTERN, full_text)
        if gh_match:
            contact.github = gh_match.group(0)

        # Name heuristic: first non-empty line of the document
        for line in full_text.split("\n"):
            candidate = line.strip()
            if (
                candidate
                and len(candidate) < 60
                and not re.search(EMAIL_PATTERN, candidate)
                and not re.search(PHONE_PATTERN, candidate)
                and not re.search(r"https?://", candidate)
                and not any(
                    re.search(p, candidate)
                    for patterns in SECTION_PATTERNS.values()
                    for p in patterns
                )
            ):
                contact.name = candidate
                break

        return contact

    def _extract_summary(self, sections: Dict[str, str]) -> str:
        """Extract profile summary / objective section."""
        return sections.get("summary", "").strip()

    def _extract_education(
        self, sections: Dict[str, str]
    ) -> List[EducationEntry]:
        """Parse education section into structured entries."""
        raw = sections.get("education", "")
        if not raw:
            return []

        # Treat the entire section as one block (lines may be single-spaced)
        entry = EducationEntry(raw_text=raw)

        # Try date range
        date_match = re.search(DATE_RANGE_PATTERN, raw, re.IGNORECASE)
        if date_match:
            entry.start_date = date_match.group(1)
            entry.end_date = date_match.group(2)

        # GPA
        gpa_match = re.search(
            r"(?:GPA|not|CGPA|ortalama)[:\s]*(\d[.,]\d{1,2})", raw, re.IGNORECASE
        )
        if gpa_match:
            entry.gpa = gpa_match.group(1)

        # First meaningful line → institution or degree
        lines = [l.strip() for l in raw.split("\n") if l.strip()]
        if lines:
            entry.institution = lines[0]
        if len(lines) > 1:
            entry.degree = lines[1]

        return [entry]

    def _extract_experience(
        self, sections: Dict[str, str]
    ) -> List[ExperienceEntry]:
        """Parse experience section into structured entries."""
        raw = sections.get("experience", "")
        if not raw:
            return []

        # Split into blocks by blank lines OR by lines containing a date range
        # (each date-range line typically starts a new experience entry).
        entries: List[ExperienceEntry] = []
        blocks = self._split_experience_blocks(raw)
        for block in blocks:
            block = block.strip()
            if not block:
                continue
            entry = ExperienceEntry(raw_text=block)

            date_match = re.search(DATE_RANGE_PATTERN, block, re.IGNORECASE)
            if date_match:
                entry.start_date = date_match.group(1)
                entry.end_date = date_match.group(2)

            lines = [l.strip() for l in block.split("\n") if l.strip()]
            if lines:
                entry.company = lines[0]
            if len(lines) > 1:
                entry.title = lines[1]
            if len(lines) > 2:
                entry.description = " ".join(lines[2:])

            entries.append(entry)

        return entries

    @staticmethod
    def _split_experience_blocks(raw: str) -> List[str]:
        """
        Split experience text into per-entry blocks.
        First try blank-line split; if that yields only one block,
        fall back to splitting before lines that contain a date range.
        """
        blocks = re.split(r"\n{2,}", raw)
        if len(blocks) > 1:
            return blocks

        # Fallback: split before lines that look like a date range header
        lines = raw.split("\n")
        current_block: List[str] = []
        result_blocks: List[str] = []
        for line in lines:
            if re.search(DATE_RANGE_PATTERN, line, re.IGNORECASE) and current_block:
                # The date is usually on the line *after* the company name,
                # so we keep it in the current block.
                # But if the previous block already has a date, start new.
                prev_text = "\n".join(current_block)
                if re.search(DATE_RANGE_PATTERN, prev_text, re.IGNORECASE):
                    result_blocks.append(prev_text)
                    current_block = []
            current_block.append(line)
        if current_block:
            result_blocks.append("\n".join(current_block))
        return result_blocks if len(result_blocks) > 1 else [raw]

    def _extract_skills(self, sections: Dict[str, str]) -> List[str]:
        """Extract skill tokens from the skills section."""
        raw = sections.get("skills", "")
        if not raw:
            return []

        # Split by comma, pipe, bullet, newline
        tokens = re.split(r"[,|•·\n\r\t]+", raw)
        skills = []
        for token in tokens:
            cleaned = token.strip(" -–—•·")
            if cleaned and len(cleaned) > 1:
                skills.append(cleaned)
        return skills

    def _extract_languages(self, sections: Dict[str, str]) -> List[str]:
        """Extract spoken languages."""
        raw = sections.get("languages", "")
        if not raw:
            return []
        tokens = re.split(r"[,|•·\n\r\t]+", raw)
        return [t.strip(" -–—•·") for t in tokens if t.strip(" -–—•·")]

    def _extract_certifications(self, sections: Dict[str, str]) -> List[str]:
        """Extract certifications."""
        raw = sections.get("certifications", "")
        if not raw:
            return []
        lines = [l.strip(" -–—•·") for l in raw.split("\n") if l.strip()]
        return lines

    def _extract_projects(self, sections: Dict[str, str]) -> List[str]:
        """Extract project entries."""
        raw = sections.get("projects", "")
        if not raw:
            return []
        blocks = re.split(r"\n{2,}", raw)
        return [b.strip() for b in blocks if b.strip()]

    # ── Confidence Scoring ─────────────────────────────────────────────
    _CRITICAL_FIELDS = ["name", "email", "education", "experience", "skills"]

    def _compute_field_confidences(self, result: ParseResult) -> Dict[str, float]:
        """
        v2.0 confidence scoring – goes beyond binary presence to evaluate:
        - Field presence (binary)
        - List-field richness (count-based partial credit)
        - Text quality heuristics
        """
        conf: Dict[str, float] = {}

        # Contact fields
        conf["name"] = 1.0 if result.contact.name else 0.0
        conf["email"] = 1.0 if result.contact.email else 0.0
        conf["phone"] = 1.0 if result.contact.phone else 0.0
        conf["linkedin"] = 1.0 if result.contact.linkedin else 0.0

        # Section fields
        conf["summary"] = min(len(result.summary) / 50, 1.0) if result.summary else 0.0

        # List fields – partial credit with higher thresholds
        conf["education"] = min(len(result.education) / 1.0, 1.0) if result.education else 0.0
        conf["experience"] = min(len(result.experience) / 1.0, 1.0) if result.experience else 0.0
        conf["skills"] = min(len(result.skills) / 3.0, 1.0) if result.skills else 0.0
        conf["languages"] = min(len(result.languages) / 1.0, 1.0) if result.languages else 0.0
        conf["certifications"] = 1.0 if result.certifications else 0.0
        conf["projects"] = 1.0 if result.projects else 0.0

        # v2.0: text quality score (chars per page, penalize very short text)
        if result.total_pages > 0:
            avg_chars = len(result.raw_text) / result.total_pages
            conf["text_quality"] = min(avg_chars / 500.0, 1.0)
        else:
            conf["text_quality"] = 0.0

        # v2.0: OCR penalty – pages needing OCR are lower confidence
        if result.total_pages > 0:
            ocr_ratio = result.ocr_pages / result.total_pages
            conf["ocr_penalty"] = 1.0 - (ocr_ratio * 0.3)  # max 30% penalty
        else:
            conf["ocr_penalty"] = 1.0

        # v2.0: section detection richness
        detected = len([s for s in result.sections_detected if s != "_full"])
        conf["section_richness"] = min(detected / 4.0, 1.0)

        return conf

    def _compute_overall_confidence(self, result: ParseResult) -> float:
        """
        v2.0 weighted overall confidence score (0.0 – 1.0).
        Includes text quality, OCR penalty, and section richness factors.
        """
        weights = {
            "name": 0.12,
            "email": 0.12,
            "phone": 0.03,
            "education": 0.15,
            "experience": 0.20,
            "skills": 0.12,
            "summary": 0.03,
            "text_quality": 0.08,
            "ocr_penalty": 0.08,
            "section_richness": 0.07,
        }
        total_weight = sum(weights.values())
        score = sum(
            result.field_confidences.get(f, 0.0) * w
            for f, w in weights.items()
        )
        return round(score / total_weight, 4) if total_weight else 0.0


# ── Custom Exceptions ──────────────────────────────────────────────────────
class FileValidationError(Exception):
    """Raised when the input file fails validation checks."""


class TextExtractionError(Exception):
    """Raised when text extraction from PDF fails entirely."""


class ParseTimeoutError(Exception):
    """Raised when the parse operation exceeds the configured timeout."""
