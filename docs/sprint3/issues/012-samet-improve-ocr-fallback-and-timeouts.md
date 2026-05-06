Title: Improve OCR fallback reliability and timeout telemetry — Samet
Labels: reliability,backend,ocr,sprint-3
Assignees: @samet

Description:
Harden OCR fallback logic: ensure per-page timeout behavior is logged and fallback choices are measurable. Add telemetry for timeout occurrences and fallback success rates.

Acceptance criteria:
- Per-page timeout metrics emitted with context (page index, reason).
- Fallback success rate metric added and dashboarded.
- Default per-page timeout remains 30s, global 120s; add feature flag for adjustments.

Steps:
1. Instrument parser to emit timeout and fallback metrics.
2. Add feature flag for per-page/global timeout tunables.
3. Create dashboard and review recent runs to validate.

Notes:
Metrics will help tune timeouts without guessing.