Title: Finalize `docs/api/cv-parser-v2.md` — examples & validation
Labels: docs,api,sprint-3
Assignees: @tech-writer,@samet

Description:
Complete `docs/api/cv-parser-v2.md` with usage examples, curl requests, and validation notes so integrators can test parser v2 quickly.

Acceptance criteria:
- Add 3 short curl examples (upload, status, retrieve parsed output).
- Document confidence score fields and interpretation.
- Add troubleshooting section for common errors (timeouts, corrupted PDF).

Steps:
1. Review existing `docs/api/cv-parser-v2.md` and add missing examples.
2. Add sample responses and expected status codes.
3. Commit and link from `README.md`.

Notes:
This reduces integration friction and speeds adoption.