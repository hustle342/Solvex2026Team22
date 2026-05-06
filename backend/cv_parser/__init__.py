# Optimized by Skills Agent for RecruitAI
# CV Parser Module - PDF Data Extraction Pipeline
"""
RecruitAI CV Parser Package
============================
Provides PDF-based CV ingestion, text extraction, OCR fallback,
section detection, and structured JSON output for the RecruitAI platform.
"""

from .pdf_parser import PDFCVParser, ParseResult, ParserConfig

__all__ = ["PDFCVParser", "ParseResult", "ParserConfig"]
__version__ = "1.0.0"
