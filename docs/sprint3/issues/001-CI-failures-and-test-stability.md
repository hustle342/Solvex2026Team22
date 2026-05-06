Title: CI failures and test stability (urgent)
Labels: urgent,ci,backend,sprint-3
Assignees: @team

Description:
CI runs (unit tests + lint) are intermittently failing and slowing down the release pipeline. Fix reliability and restore green builds.

Acceptance criteria:
- Identify flaky tests and either fix or mark xfail.
- Ensure `pytest` runs deterministically locally and in CI.
- Add retry logic or test isolation where needed.
- CI run time should be reduced by at least 20% (if possible) via parallelization or test partitioning.

Steps:
1. Run CI locally; reproduce failing jobs.
2. Pin flaky tests, add fixtures, or mock external dependencies.
3. Add test partition/workflow improvements in `.github/workflows/ci.yml`.
4. Validate in PR with multiple reruns.

Notes:
This is top priority to unblock releases.