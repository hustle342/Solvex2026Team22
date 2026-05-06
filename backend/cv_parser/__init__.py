# Optimized by Skills Agent for RecruitAI
# CV Parser Module v2.0 - PDF Data Extraction Pipeline
"""
RecruitAI CV Parser Package
============================
Provides PDF-based CV ingestion, text extraction, OCR fallback,
section detection, and structured JSON output for the RecruitAI platform.
"""

from .pdf_parser import PDFCVParser, ParseResult, ParseTimeoutError
from .config import ParserConfig, ErrorMessages

__all__ = ["PDFCVParser", "ParseResult", "ParserConfig", "ErrorMessages", "ParseTimeoutError"]
__version__ = "2.0.0"
