# Sprint 2 Lead Requirement Cards

This document defines the Sprint 2 execution cards in the mandatory format from the roadmap.

## Card A - Samet (AI/Backend)

### Objective
Deliver Matching Engine v1 backend capabilities: hard filters, weighted scoring, embedding similarity integration, and explainability payload.

### Inputs/Dependencies
- Input CV profile schema from Sprint 1 parser output
- Job description canonical schema
- ADR references: `docs/adr/002-data-layer-postgresql-pgvector.md`, `docs/adr/005-model-prompt-versioning.md`
- Infra assumptions: PostgreSQL + pgvector available in dev/stage

### Implementation Steps
1. Implement hard-filter rules (must-have skills, minimum experience, disqualifiers).
2. Implement weighted scoring pipeline: skill match, experience fit, education fit, optional bonuses.
3. Integrate embedding similarity lookup using pgvector.
4. Emit explainability factors per score in API response.
5. Add deterministic seed/config for repeatable evaluation runs.

### Acceptance Criteria
- Matching endpoint returns ranked candidate list with score and explainability fields.
- Precision@10 evaluation pipeline can run with current internal dataset.
- No unresolved blocker comments in PR.
- Relevant unit/integration tests are green.

### Test Plan
- Unit tests for each scoring component (rule score, embedding score, weighted combiner).
- Integration test for end-to-end rank generation on a fixed sample set.
- Regression snapshot test for deterministic ordering under fixed seed.

### Risk and Rollback Plan
- Risk: embedding search latency spike.
  - Mitigation: fallback to rules-only ranking mode.
- Risk: unstable score behavior due to schema drift.
  - Mitigation: strict input validation and schema contract checks.
- Rollback: disable embedding component via config and keep rule-only scoring path active.

### Owner + Reviewer
- Owner: Samet
- Reviewer: Serdar

## Card B - Cemilcan (Platform/Frontend)

### Objective
Deliver Sprint 2 recruiter UI flow for candidate ranking, explainability display, and shortlist/reject integration.

### Inputs/Dependencies
- Matching API contract from Card A
- Existing Sprint 1 upload/auth UI skeleton
- Role and permission assumptions from `docs/adr/004-authn-authz-rbac.md`

### Implementation Steps
1. Build candidate ranking table with filtering and sorting controls.
2. Add explainability card UI bound to backend factor payload.
3. Implement shortlist/reject API integration with loading/error states.
4. Add optimistic update rules and conflict-safe refresh behavior.
5. Add telemetry hooks for shortlist action events.

### Acceptance Criteria
- Recruiter can view ranked candidates, inspect reasons, and execute shortlist/reject actions.
- UI handles empty, loading, and error states without blocking workflow.
- Frontend smoke tests and component tests pass.
- Staging flow demonstrates end-to-end shortlist path.

### Test Plan
- Component tests for ranking table and explainability panel.
- API integration smoke test with mocked success/failure responses.
- Manual staging test checklist for shortlist/reject actions.

### Risk and Rollback Plan
- Risk: API contract mismatch during parallel development.
  - Mitigation: shared response schema examples and contract lock before merge.
- Risk: UI latency under large candidate lists.
  - Mitigation: pagination and debounce on filters.
- Rollback: feature flag to hide shortlist actions if API instability is detected.

### Owner + Reviewer
- Owner: Cemilcan
- Reviewer: Serdar

## Card C - Lead (Cross-Cutting)

### Objective
Standardize PR gate execution, blocker tracking, and KPI publication for Sprint 2.

### Inputs/Dependencies
- `RELEASE_QUALITY_GATE.md`
- `KPI_WEEKLY_TRACKER.csv`
- Sprint 2 PR outputs from Card A and Card B

### Implementation Steps
1. Review all Sprint 2 technical PRs with gate checklist.
2. Record blocker owner and target date in blocker register.
3. Publish weekly KPI checkpoint with Precision@10 baseline status.

### Acceptance Criteria
- At least one Sprint 2 PR has a completed gate evaluation record.
- Blockers are tracked with explicit owner and due date.
- Weekly KPI checkpoint is prepared from tracker data.

### Test Plan
- Validate gate records contain all mandatory checks.
- Validate KPI lines parse correctly from CSV.

### Risk and Rollback Plan
- Risk: missing evidence links in PR reviews.
  - Mitigation: enforce evidence section in review comments.
- Rollback: move PR status to conditional pass and open follow-up action item.

### Owner + Reviewer
- Owner: Serdar
- Reviewer: Team