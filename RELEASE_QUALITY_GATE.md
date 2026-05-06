# Release Quality Gate

## Purpose
Define mandatory checks before merging to main and before release deployment.

## Gate Levels
- PR Gate: checks required before PR merge
- Release Gate: checks required before deployment tag/release

## PR Gate (Mandatory)
1. Linked issue exists.
2. Scope is clear and limited.
3. Minimum one reviewer approval.
4. No unresolved blocker comments.
5. Relevant tests pass (unit/integration/smoke).
6. Logs and audit fields present where needed.

## Release Gate (Mandatory)
1. Critical flow works end-to-end:
   - CV upload -> parse -> score -> dashboard decision
2. Security:
   - No open P0/P1 findings
   - Access control checks complete
3. Data/AI quality:
   - Parse accuracy and Precision@10 not below gate thresholds
4. Observability:
   - Error, latency, throughput dashboards active
5. Operability:
   - Rollback steps documented and executable

## Go/No-Go Decision Template
- Release candidate:
- Date:
- Owner:
- Gate summary: Pass / Conditional Pass / Fail
- Blocking items:
- Mitigations:
- Final decision: Go / No-Go

## Minimum Evidence Required
- Test output or CI run link
- KPI snapshot from weekly tracker
- Security scan summary
- Rollback note

## Escalation Rule
Any blocker that risks release must be reported within 24 hours in the release issue.

## Change Log
| Date | Change | Reason | Approved By |
|---|---|---|---|
| 2026-05-06 | Initial release gate policy created | Sprint 0 governance setup | Serdar |
