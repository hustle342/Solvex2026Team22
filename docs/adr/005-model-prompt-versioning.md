# ADR-005: Model and Prompt Versioning Policy

- Status: accepted
- Date: 2026-05-06
- Owner: Serdar
- Related Issue: #5

## Context
RecruitAI decisions (parse quality, ranking factors) depend on model configuration and prompt behavior. Without versioning, regressions are hard to detect and explain.

## Options Considered
1. No explicit versioning, rely on deployment timestamps
2. Semantic versioning for model and prompt contracts
3. Full experiment platform first (deferred)

## Decision
Adopt explicit model_version and prompt_version fields across scoring outputs and audit events, with semantic versioning and change log.

## Consequences
### Positive
- Enables reproducibility of scoring outcomes.
- Simplifies regression triage when ranking quality changes.
- Improves compliance and explainability posture.

### Negative / Trade-offs
- Additional metadata propagation across services.
- Requires release discipline for prompt changes.

## Validation Plan
- Ensure every score payload and audit event includes model_version and prompt_version.
- Add regression report grouped by version pair.
- Block release if version fields are missing from critical endpoints.

## Rollback / Exit Strategy
- Maintain backward compatibility by accepting unknown fields in consumers.
- If version policy changes, migrate with explicit compatibility map.
