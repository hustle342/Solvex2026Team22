Title: Fix frontend flaky tests and determinism
Labels: urgent,frontend,tests,sprint-3
Assignees: @cemil

Description:
Several frontend unit/e2e tests are flaky, causing CI reruns and slowing merges. Stabilize tests and make local runs deterministic.

Acceptance criteria:
- Identify top 3 flaky tests and implement fixes or mark as flaky with rationale.
- Ensure local test runs are deterministic on developer machines.
- CI runs for frontend tests succeed consistently across 3 consecutive runs.

Steps:
1. Run failing CI job logs and reproduce locally.
2. Add proper mocks, reduce reliance on timers, and seed RNG where needed.
3. Add retries only where acceptable and document rationale.
4. Update test docs and mark any intentionally flaky tests with `@flaky` annotation.

Notes:
This will reduce CI noise and speed PR throughput.