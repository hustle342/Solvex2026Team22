import time
import io
import pytest
from backend.cv_parser.pdf_parser import PDFCVParser

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

def test_parse_microbenchmark(benchmark):
    parser = PDFCVParser()
    
    @benchmark
    def run_parser():
        # Using a valid simple PDF to just measure overhead of the parser orchestration,
        # regex compilations, and flow. Since we precompiled regex, the per-page CPU 
        # time should be significantly lower.
        return parser.parse(_MINIMAL_PDF)

    assert True
