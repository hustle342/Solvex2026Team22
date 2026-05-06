# ADR-001: Backend Framework Selection (FastAPI)

- Status: accepted
- Date: 2026-05-06
- Owner: Serdar
- Related Issue: KPI/ADR governance issue

## Context
RecruitAI needs a backend that can serve REST APIs, integrate well with Python-based NLP/AI tooling, and support fast MVP delivery.

## Options Considered
1. FastAPI
2. Flask
3. Django REST Framework

## Decision
Select FastAPI as the backend framework for API and service orchestration.

## Consequences
### Positive
- Native async support for high I/O workloads.
- Strong typing with Pydantic improves API contract quality.
- Good developer velocity for MVP.
- OpenAPI docs generated automatically.

### Negative / Trade-offs
- Team must follow async patterns carefully to avoid mixed sync/async issues.
- Large monolithic app patterns from Django are less available by default.

## Validation Plan
- API latency and throughput benchmarks in staging.
- Integration tests for upload, parse, scoring endpoints.

## Rollback / Exit Strategy
- Keep service boundaries clean so endpoints can be moved to another framework if needed.
- Limit framework-specific logic in business layer.
