Title: Enhance API docs integration and examples
Labels: docs,api,frontend,sprint-3
Assignees: @cemil

Description:
Improve API docs UX by adding live examples, hosted try-it snippets, and quick start integration for major client SDKs.

Acceptance criteria:
- `docs/api` pages include 3 runnable curl examples and 2 SDK snippets (Python, JS).
- Add `Try it` swagger/curl snippet or link to Postman collection.
- README links updated to surface examples.

Steps:
1. Review `docs/api/cv-parser-v2.md` and add missing examples.
2. Create minimal Python/JS snippets and test them against staging.
3. Commit changes and open PR linking examples.

Notes:
Goal: reduce onboarding time for integrators.