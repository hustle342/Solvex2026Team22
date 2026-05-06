# Branching Strategy

RecruitAI uses a lightweight Git flow suitable for Sprint 0 and rapid feature delivery.

## Branches

- `main`: production-ready code only.
- `develop`: integration branch for completed sprint work.
- `feature/<scope>`: task branches for active development.
- `hotfix/<scope>`: urgent fixes branched from `main`.

## Pull request rules

- Open PRs into `develop` for normal feature work.
- Keep PRs small enough to review in one sitting.
- Include implementation summary, local run steps, tests, and known limitations.
- Require at least one reviewer approval before merge.
- Resolve all requested changes before merge.

## Branch protection proposal

Protect `main` and `develop` with:

- Required PR review.
- Required CI status check: `ci`.
- No direct pushes.
- Linear history preferred.
- Delete feature branches after merge.

## Blocker policy

If a blocker appears, add a blocker comment to the issue within 24 hours with:

- What is blocked
- Why it is blocked
- Owner
- Next action
- Expected resolution time
