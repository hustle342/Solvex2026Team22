# Sprint 2 Frontend Tests

## Objective

Sprint 2 adds automated frontend test coverage for the Sprint 1 recruiter workflow:

- Login and Recruiter role auth skeleton
- PDF upload validation
- Processing status progress tracking
- Parse quality panel state updates

## Framework Choice

The current dashboard is framework-free HTML, CSS, and JavaScript. There is no Vite setup yet, so Sprint 2 uses **Jest + jsdom** instead of Vitest.

Why:

- Jest fits the existing non-Vite project structure.
- jsdom lets us test DOM behavior without a browser.
- The setup keeps Sprint 1 runnable without a build step.
- Coverage output can be generated directly into `docs/coverage`.

## Scripts

```bash
npm test
npm run test:ci
npm run test:watch
```

`npm test` runs Jest with coverage enabled.

## Test Coverage Areas

Login flow tests include:

- Default login screen rendering
- Valid recruiter credentials
- Wrong email
- Wrong password
- Non-recruiter role rejection
- Missing email
- Missing password
- Email normalization
- Mocked auth success
- Mocked auth failure
- Logout/session clearing
- Demo query session seeding

PDF upload tests include:

- PDF validation by MIME type
- PDF validation by extension
- Missing file rejection
- Non-PDF rejection
- File size rejection over 10MB
- Valid file selection
- Invalid file selection error
- Input change handling
- Drag-over UI state
- Drop event handling
- Processing start state
- Progress transition to Ready
- Invalid processing block

## Coverage

Coverage is configured in [jest.config.js](../jest.config.js) with an 80% global threshold for:

- Branches
- Functions
- Lines
- Statements

Reports are written to:

```text
docs/coverage/
```

Latest local result:

| Metric | Result |
|---|---:|
| Test suites | 1 passed |
| Test cases | 55 passed |
| Statements | 96.8% |
| Branches | 89.88% |
| Functions | 94.44% |
| Lines | 98.67% |

## CI/CD

GitHub Actions workflow:

```text
.github/workflows/frontend-tests.yml
```

The workflow runs on every push and pull request:

1. Checkout
2. Setup Node.js
3. `npm ci`
4. `npm run test:ci`
5. Upload `docs/coverage` as an artifact

## Validation Note

Add this to the PR:

```text
Frontend tests v1 validated with npm test and npm run test:ci. Jest + jsdom runs 55 passing login, PDF upload, candidate ranking, explainability, and action API tests with coverage output in docs/coverage. Current coverage: statements 96.8%, branches 89.88%, functions 94.44%, lines 98.67%.
```

## Blockers

No blocker at implementation time. Any CI dependency or npm registry issue should be reported on the issue within 24 hours.
