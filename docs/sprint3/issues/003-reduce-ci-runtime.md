Title: Reduce CI runtime (speed up release pipeline)
Labels: improvement,ci,infra,sprint-3
Assignees: @devops

Description:
CI duration is blocking frequent merges. Implement parallel test execution, cache improvements, and selective workflow triggers.

Acceptance criteria:
- CI wall-clock time reduced by >= 30% or below a target threshold (e.g., < 10 minutes for unit tests).
- Caching for pip/venv and test artifacts implemented.
- PRs skip heavy integration jobs unless label `run-integration` is present.

Steps:
1. Add test matrix / `pytest-xdist` where safe.
2. Add cache keys for dependencies.
3. Update workflows to split unit vs integration jobs.
4. Measure and report improvements.

Notes:
Work with GitHub Actions billing constraints in mind.