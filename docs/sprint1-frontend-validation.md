# Sprint 1 Frontend Validation

## Scope Delivered

- Auth skeleton with login and Recruiter role routing
- PDF upload interface
- Upload to processing status UI flow
- Basic parse quality monitoring panel
- Responsive recruiter dashboard shell

## Local Run

Open:

```text
apps/dashboard/index.html
```

For screenshot evidence, open:

```text
apps/dashboard/index.html?demo=ready
```

Demo login:

- Email: `recruiter@recruitai.local`
- Password: `demo1234`
- Role: `Recruiter`

## Validation

- Manual UI smoke path: login -> choose PDF -> start parsing -> watch status move to Ready.
- Static app requires no backend and no package install in Sprint 1.

## PR Note

Add this validation note to the PR:

```text
Validated Sprint 1 recruiter workflow locally by opening apps/dashboard/index.html and testing login, PDF selection, processing status updates, and parse quality panel rendering.
```

## Screenshot Evidence

Screenshot file generated locally:

```text
docs/evidence/sprint1-dashboard.png
```
