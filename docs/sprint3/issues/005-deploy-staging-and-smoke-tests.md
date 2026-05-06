Title: Deploy to staging and run smoke tests
Labels: staging,deploy,sprint-3
Assignees: @ops,@qa

Description:
Deploy current `main`->`staging` build and run a smoke-test suite to validate parser v2 behavior in an environment close to production.

Acceptance criteria:
- Staging deploy completes successfully.
- Smoke tests (upload+parse+retrieve) all pass.
- No critical errors in logs (errors > 5% fail the task).

Steps:
1. Build release image and push to registry.
2. Deploy to staging (helm/k8s or docker-compose depending on infra).
3. Execute smoke tests and collect logs.
4. Roll back if failures exceed threshold.

Notes:
Coordinate with `ops` for maintenance windows.