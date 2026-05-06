Title: Parser performance regression — urgent hotfix
Labels: urgent,performance,backend,sprint-3
Assignees: @samet,@lead

Description:
Recent changes increased CV parsing time, causing backlog and slower user flow. Implement hotfixes to meet SLA.

Acceptance criteria:
- Median parse time under load <= 3s/page.
- Global parsing pipeline throughput restored to target (~10 concurrent files without queuing).
- No regression in extraction accuracy (confidence metrics unchanged within 2%).

Steps:
1. Run performance profiling on `feature/pdf-cv-parser` branch.
2. Add caching, reduce expensive regex passes, and optimize OCR fallbacks.
3. Add benchmarks and telemetry points.
4. Deploy hotfix to staging and run smoke tests.

Notes:
If needed, add feature flag to temporarily disable expensive enrichment.