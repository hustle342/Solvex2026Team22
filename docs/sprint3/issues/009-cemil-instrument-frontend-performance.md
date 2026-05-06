Title: Instrument frontend performance hotspots (critical)
Labels: performance,frontend,infra,sprint-3
Assignees: @cemil

Description:
Add telemetry and monitoring for key frontend flows (upload, parse-start, result-render) to diagnose UI slowness under load.

Acceptance criteria:
- Add metrics points for upload latency, parse-start latency, and render time.
- Dashboards/alerts configured for 95th percentile spikes.
- Baseline established and documented.

Steps:
1. Add client-side metrics instrumentation (e.g., via existing telemetry lib).
2. Hook metrics to dashboard (Grafana/Datadog) and create alert rules.
3. Run load tests and validate metrics.

Notes:
This helps prioritize backend optimizations and improve user experience.