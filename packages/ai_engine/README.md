# RecruitAI AI Engine

This package contains the MVP matching and scoring engine for RecruitAI.

## Purpose

The engine receives normalized CV text from Samet's parsing pipeline, compares it with a job description, and returns a dashboard-ready match result.

Core dimensions:

- Technical skills coverage
- Experience fit
- Project relevance
- Lexical/semantic overlap baseline
- Parse confidence guardrail

## Output contract

`score_candidate(...)` returns a `DashboardMatchResult` with:

- `score`: 1-100 suitability score
- `recommendation`: `shortlist`, `review`, `manual_review`, or `reject`
- `matched_skills` and `missing_must_have_skills`
- weighted `breakdown`
- recruiter-facing explainability `factors`
- `audit` metadata for traceability

## Local check

From the repository root:

```bash
python scripts/ci_check.py
```
