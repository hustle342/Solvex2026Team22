# RecruitAI

RecruitAI is an AI-assisted recruiter workflow dashboard for CV intake, parsing quality monitoring, candidate ranking, and explainable shortlist decisions.

## Dashboard

Open the Sprint recruiter dashboard:

```text
apps/dashboard/index.html
```

Open the candidate ranking demo:

```text
apps/dashboard/index.html?demo=ranking
```

## Current Frontend Scope

- Login and Recruiter role skeleton
- PDF CV upload and processing status flow
- Parse quality monitoring panel
- AI score based candidate ranking table
- Skill filtering and score / experience / applied date sorting
- Explainability card for selected candidates
- Shortlist and reject action API integration

## Tests

```bash
npm test
```

Validation notes:

- [Sprint 2 Frontend Tests](docs/sprint2-frontend-tests.md)
- [Recruiter Dashboard Validation](docs/recruiter-dashboard-validation.md)
