# KPI Governance

## Purpose
This document defines how RecruitAI KPI metrics are measured, reported, and governed.

## Scope
- Weekly KPI tracking for competition readiness
- Baseline vs current performance comparison
- Go/No-Go decision support for sprint reviews

## KPI Definition Sheet

| KPI | Formula | Target | Data Source | Frequency | Owner |
|---|---|---|---|---|---|
| Manual Screening Effort Reduction (%) | ((Baseline manual minutes - Current manual minutes) / Baseline manual minutes) * 100 | >= 50 | Time study logs, recruiter workflow logs | Weekly | Serdar |
| CV Parse Critical Field Accuracy (%) | (Correct critical fields / Total critical fields) * 100 | >= 90 | Parse evaluation dataset, annotation sheet | Weekly | Samet |
| Precision@10 | Relevant candidates in top 10 / 10 | >= 0.75 | Ranked shortlist eval set | Weekly | Samet |
| Median Time-to-Shortlist (minutes) | Median(time from JD publish to shortlist ready) | <= 5 | System event logs | Weekly | Cemilcan |
| Recruiter Acceptance Rate (%) | (Accepted AI suggestions / Total AI suggestions reviewed) * 100 | >= 60 | Dashboard decision actions | Weekly | Cemilcan |

## Measurement Rules
1. Baseline must come from manual process without AI assistance.
2. Use the same role families for baseline and current comparisons.
3. Evaluation sets must be anonymized.
4. Any metric method change must be recorded in Change Log.
5. Missing data points must be marked as `NA` and explained in notes.

## Baseline Collection Plan (Sprint 0)
1. Select at least 3 representative role types.
2. Collect at least 20 CV samples per role type.
3. Measure manual screening duration per sample.
4. Record parser and ranking quality on the same sample set.
5. Lock baseline values before Sprint 1 starts.

## Weekly Reporting Workflow
1. Monday: Confirm data extraction window.
2. Wednesday: Mid-week risk check on metric trends.
3. Friday: Publish KPI report and sprint decision note.

## Weekly Report Template
- Sprint/Week:
- Baseline date:
- Current data window:
- KPI snapshot:
- Key movement (+/-):
- Root causes:
- Risks and blockers:
- Decision (Go / Conditional Go / No-Go):
- Action items for next week:

## RAG Thresholds
- Green: metric on or above target (or on/below for time metric)
- Amber: within 10% of target
- Red: more than 10% away from target

## Governance and Accountability
- Final KPI approval authority: Serdar
- KPI data quality owner: metric owner listed in table
- Escalation SLA: blockers must be reported within 24 hours

## Change Log
| Date | Change | Reason | Approved By |
|---|---|---|---|
| 2026-05-06 | Initial KPI governance document created | Sprint 0 setup | Serdar |
