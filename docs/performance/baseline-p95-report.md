# Frontend Performance Baseline Report Draft

Date: 2026-05-06

Scope: RecruitAI dashboard hotspots for Upload, Parse, and Render flows.

## Instrumented Hotspots

| Hotspot | Metric key | Measurement boundary | p95 threshold |
| --- | --- | --- | --- |
| Upload | `upload` | PDF selection through validation and UI refresh | 250ms |
| Parse | `parse` | Parse job start through final `Ready` status update | 4000ms |
| Render | `render` | DOM template update and event binding | 120ms |

## Alert Logic

The dashboard uses `createPerformanceMonitor()` to keep the latest 100 samples per metric. Each new sample recalculates p95. If p95 is greater than the configured threshold, an alert object is appended to `state.performance.alerts` and the configured `alertHandler` is called.

Alert payload shape:

```json
{
  "metric": "parse",
  "p95": 4125,
  "thresholdMs": 4000,
  "sampleCount": 24,
  "context": {
    "fileName": "candidate_cv.pdf",
    "jobId": "cv-123",
    "status": "Ready"
  },
  "triggeredAt": "2026-05-06T11:00:00.000Z"
}
```

## Initial Baseline Targets

| Metric | Baseline expectation | Alert threshold | Owner action when breached |
| --- | --- | --- | --- |
| Upload p95 | Under 100ms locally for validation-only uploads | 250ms | Check file validation path, large object handling, and unnecessary rerenders. |
| Parse p95 | Around 3600ms in the default demo timer flow | 4000ms | Inspect parse queue delay, timer scheduling, and final status callback timing. |
| Render p95 | Under 50ms for current jsdom-sized dashboard | 120ms | Profile DOM template size, event rebinding, and repeated full-dashboard renders. |

## Current Verification Plan

1. Run `npm test -- --runInBand` three consecutive times.
2. Confirm no open fake timers leak between tests.
3. Capture coverage output in `docs/coverage`.
4. Run staging smoke path after deployment: login, select PDF, start parsing, observe `Ready`, and confirm p95 panel renders.

## Stabilized Flaky Test Areas

| Area | Previous risk | Stabilization |
| --- | --- | --- |
| Processing timers | Tests could leave pending parse callbacks that execute during teardown. | Teardown now clears pending timers instead of running application callbacks after assertions. |
| Async measurement | Promise-returning hotspot work could be recorded before completion. | `measure()` now records duration in a `finally` attached to the resolved or rejected promise. |
| Timing assertions | Tests depended on hard-coded wall-clock style delays. | Processing tests use injected deterministic delays and derive total duration from `PROCESSING_UPDATES`. |

## PR Note

3 adet flaky test (zaman asimi ve async await hatalari) giderildi, API dokumantasyonu Python/JS ornekleriyle guncellendi ve p95 performans metrikleri sisteme entegre edildi.
