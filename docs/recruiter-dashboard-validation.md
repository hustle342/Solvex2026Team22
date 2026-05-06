# Recruiter Dashboard Validation

## Scope Delivered

- Candidate ranking table sorted by AI score from 1-100
- Skill filtering and score, experience, applied date sorting UX
- Candidate explainability card with score factors and positive/negative signals
- Shortlist and reject actions connected through candidate action API calls
- Loading, success, and error states for recruiter actions

## Local Run

Open:

```text
apps/dashboard/index.html?demo=ranking
```

Demo login remains available at:

```text
apps/dashboard/index.html
```

## API Action Contract

The dashboard action layer sends:

```text
POST /api/candidates/{candidateId}/shortlist
POST /api/candidates/{candidateId}/reject
```

Payload:

```json
{
  "candidateId": "cand-001",
  "action": "shortlist",
  "source": "recruiter-dashboard"
}
```

For static `file://` demos, the action client returns a local success response so reviewers can validate UX without a backend server.

## Validation

Command run locally:

```bash
npm test
```

Latest result:

| Metric | Result |
|---|---:|
| Test suites | 1 passed |
| Test cases | 55 passed |
| Statements | 96.8% |
| Branches | 89.88% |
| Functions | 94.44% |
| Lines | 98.67% |

## Screenshot Evidence

```text
docs/evidence/recruiter-dashboard-ranking.png
docs/evidence/recruiter-dashboard-mobile.png
```

## PR Validation Note

```text
Aday sıralama motoruyla entegre edildi, API bağlantıları yapıldı ve mobil uyumluluk kontrol edildi. Local validation: npm test, 55 passing tests, coverage above 80%, screenshot evidence added under docs/evidence/recruiter-dashboard-ranking.png and docs/evidence/recruiter-dashboard-mobile.png.
```

## Blockers

No blocker at implementation time.
