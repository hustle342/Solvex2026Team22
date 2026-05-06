# Sprint 0 Step-by-Step Execution

This checklist is the operational guide for Serdar (Lead).

## 1) Today: Baseline Data Entry (30-45 min)
1. Open KPI_BASELINE_TIMESTUDY.csv.
2. For each reviewed CV, fill:
   - manual_screening_minutes
   - decision_label (shortlist/reject/review)
3. Enter at least 9 samples for day-1 (already prefilled IDs).

## 2) Today: Compute Baseline Summary (5 min)
1. Run command:
   ```powershell
   .\scripts\compute_kpi_baseline.ps1
   ```
2. Confirm output file is created:
   - KPI_BASELINE_SUMMARY.md
3. Copy summary block into KPI Governance issue comment.

## 3) Today: Team Delivery Ping (10 min)
1. Send Samet message from templates/SAMET_DAILY_MESSAGE.md.
2. Send Cemilcan message from templates/CEMILCAN_DAILY_MESSAGE.md.
3. Ask for evidence links in issue comments (PR, screenshot, logs).

## 4) Tomorrow: First Gate Pilot (20 min)
1. Pick the first technical PR.
2. Validate against RELEASE_QUALITY_GATE.md PR Gate.
3. Record result in release issue:
   - Pass / Conditional Pass / Fail
   - blockers and action owner

## 5) Friday: One-Page Report (20 min)
1. Open templates/WEEKLY_ONE_PAGER.md.
2. Fill KPI snapshot, top risks, and Go/No-Go decision.
3. Post report in lead issue and team channel.

## Done Criteria for Sprint 0 Lead Track
- Baseline summary published
- ADR and gate docs merged
- First gate pilot executed
- Weekly one-pager posted
