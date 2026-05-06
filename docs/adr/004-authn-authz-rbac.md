# ADR-004: Authentication and Authorization Strategy (JWT + Role-Based Access)

- Status: accepted
- Date: 2026-05-06
- Owner: Serdar
- Related Issue: #5

## Context
RecruitAI handles recruiter actions, candidate data, and audit records. Access control must enforce role boundaries and maintain traceability.

## Options Considered
1. Session-based auth with server-side state
2. JWT-based auth + role-based access control
3. External identity provider only (deferred integration)

## Decision
Use JWT-based authentication with role-based authorization (Admin, Recruiter, Reviewer) in application layer.

## Consequences
### Positive
- Stateless API auth suitable for service-oriented backend.
- Clear role checks for sensitive operations and audit events.
- Faster MVP integration with dashboard and API services.

### Negative / Trade-offs
- Token rotation and revocation handling must be designed carefully.
- Role logic can sprawl without centralized permission mapping.

## Validation Plan
- Access matrix tests for each role and endpoint.
- Verify forbidden access returns consistent 403 responses.
- Audit logs include actor role and action metadata.

## Rollback / Exit Strategy
- Keep auth middleware isolated from business logic.
- If enterprise SSO is needed later, map JWT claims from IdP and retain RBAC policy layer.
