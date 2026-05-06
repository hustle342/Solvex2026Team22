Title: Add confidence score v2 unit tests and validation — Samet
Labels: tests,backend,confidence,sprint-3
Assignees: @samet

Description:
Create deterministic unit tests to validate Confidence Score v2 calculations (Text Quality, Section Richness, OCR Penalty).

Acceptance criteria:
- Add 10 unit tests covering edge cases and threshold boundaries.
- Coverage for scoring module >= 95%.
- Test data fixtures included and documented.

Steps:
1. Create fixtures with controlled examples (low/high text density, many/few sections, OCR degraded inputs).
2. Write tests asserting expected score ranges and component contributions.
3. Run coverage and commit tests.

Notes:
This prevents regressions in downstream ranking and matching.