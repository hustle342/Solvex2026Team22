Title: Optimize parsing hotpaths (regex & I/O) — Samet
Labels: urgent,backend,performance,sprint-3
Assignees: @samet

Description:
Reduce per-page parse latency by optimizing regex passes and I/O patterns in the parser pipeline.

Acceptance criteria:
- Reduce median CPU time per page by >=25% in microbenchmarks.
- No drop in extraction accuracy (confidence metrics within ±2%).
- Add benchmarks to `backend/benchmarks` and document results.

Steps:
1. Profile current parsing code to find top-consuming functions.
2. Cache repeated regex compilations and minimize file I/O (streaming where possible).
3. Add unit/benchmark tests and compare before/after.
4. Deploy to staging and run end-to-end latency checks.

Notes:
Prioritize low-risk changes that deliver immediate gains.