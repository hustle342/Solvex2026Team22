# ADR-003: Asynchronous Processing Model (Queue-based pipeline)

- Status: accepted
- Date: 2026-05-06
- Owner: Serdar
- Related Issue: KPI/ADR governance issue

## Context
PDF parsing and normalization tasks are variable-duration workloads. Running them inline in request-response path risks timeouts and poor user experience.

## Options Considered
1. Synchronous request-response processing
2. Queue-based async processing with workers
3. Event streaming platform from day one

## Decision
Use queue-based asynchronous processing (Redis + worker model) for ingestion, parsing, and normalization jobs.

## Consequences
### Positive
- Better reliability for batch uploads and heavy documents.
- Improved user experience with job status polling.
- Horizontal scalability through worker count.

### Negative / Trade-offs
- Increased operational complexity (queue, worker monitoring).
- Requires idempotent job design and retry strategy.

## Validation Plan
- Process 100-PDF batch test with error/retry metrics.
- Verify end-to-end status visibility in dashboard.

## Rollback / Exit Strategy
- Keep API contract independent of queue internals.
- For small loads, fallback to sync processing can be feature-flagged for emergency use.
