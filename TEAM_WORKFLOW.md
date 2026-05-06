# Team Workflow Policy

## Goal
Keep main branch stable and ensure every change is reviewed, test-checked, and traceable.

## Golden Rule
No direct push to main. All changes must go through branch + Pull Request.

## Required Flow
1. Create an issue first.
2. Create a branch from latest main.
3. Make small, focused commits.
4. Push branch and open a Pull Request.
5. Get at least one review approval.
6. Ensure checks pass (lint/test/build where applicable).
7. Merge PR to main.

## Branch Naming
- feat/<short-topic>
- fix/<short-topic>
- docs/<short-topic>
- chore/<short-topic>

Examples:
- feat/cv-parser-v1
- docs/kpi-governance
- chore/release-gate-checklist

## Commit Message Convention
Use clear, imperative style.

Format:
<type>: <short summary>

Types:
- feat
- fix
- docs
- refactor
- test
- chore

Examples:
- docs: add KPI governance baseline template
- feat: add parser confidence scoring endpoint

## Pull Request Template (Minimum)
- What changed
- Why it changed
- How it was tested
- Risks and rollback note
- Related issue link

## Review and Merge Rules
- Minimum 1 reviewer approval (2 for critical architecture/security changes).
- Do not merge if there is an unresolved blocker comment.
- Prefer squash merge for small task branches.
- Keep PRs small enough to review in less than 20 minutes.

## Main Branch Protection (Repository Settings)
Enable these options in GitHub branch protection for main:
1. Require a pull request before merging.
2. Require approvals: at least 1.
3. Dismiss stale approvals when new commits are pushed.
4. Require status checks to pass before merging.
5. Restrict who can push to matching branches.

## Emergency Exception
Direct push to main is allowed only for P0 production emergency and must include:
1. Incident reference in commit or PR notes.
2. Post-incident PR that documents root cause and prevention action.

## Responsibility Matrix
- Serdar (Lead): process owner, final go/no-go on critical merges.
- Samet: AI/backend code quality and tests.
- Cemilcan: platform/frontend quality and release readiness.

## Start Using Today
1. For every new task, open issue -> create branch -> PR.
2. Stop pushing directly to main.
3. Add this workflow link in team communication channel and issue comments.
