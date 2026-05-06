# ADR-002: Data Layer Selection (PostgreSQL + pgvector)

- Status: accepted
- Date: 2026-05-06
- Owner: Serdar
- Related Issue: KPI/ADR governance issue

## Context
RecruitAI requires transactional consistency for core entities and vector similarity search for semantic CV-JD matching.

## Options Considered
1. PostgreSQL + pgvector
2. PostgreSQL + external vector DB
3. MongoDB + external vector DB

## Decision
Use PostgreSQL as primary database and pgvector extension for embedding similarity in MVP.

## Consequences
### Positive
- Single operational datastore for relational and vector use cases.
- Easier backup, security, and compliance operations.
- Lower operational complexity in early stage.

### Negative / Trade-offs
- Vector scale limits may appear at large corpus sizes.
- Advanced ANN features may be less mature than dedicated vector databases.

## Validation Plan
- Benchmark semantic search latency and ranking quality on eval dataset.
- Monitor DB load and query plans for top match endpoints.

## Rollback / Exit Strategy
- Abstract embedding repository layer to allow migration to dedicated vector DB if needed.
- Keep embedding schema portable.
