# RecruitAI Monorepo

Solvex 2026 Team 22 RecruitAI repository.

RecruitAI parses CV content, compares candidates with job descriptions, and helps HR teams reduce manual screening workload by at least 50% with explainable shortlist recommendations.

## Monorepo Structure

```text
apps/
  api/          FastAPI service placeholder
  dashboard/    Recruiter dashboard placeholder
packages/
  ai_engine/    Skills Agent scoring logic
docs/
  branching-strategy.md
scripts/
  ci_check.py
```

## Sprint 0 Checks

Run the same lint, test, and build checks used by CI:

```bash
python scripts/ci_check.py
```

## Current Feature

`packages/ai_engine` contains the first AI Agentic Workflow logic engine. It scores a parsed CV against a job description and returns a dashboard-ready structure with:

- 1-100 score
- shortlist/review/manual review/reject recommendation
- matched and missing skills
- weighted score breakdown
- explainability factors
- audit metadata

## Docs

- [Architecture](ARCHITECTURE.md)
- [Roadmap](ROADMAP.md)
- [Branching Strategy](docs/branching-strategy.md)
