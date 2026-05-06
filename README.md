# RecruitAI

RecruitAI is an AI-assisted recruiter workflow project. It includes a FastAPI backend, a recruiter dashboard, and a Chrome Manifest V3 extension that detects PDF CV attachments in Gmail, sends them to the backend, stores candidates in SQLite, and renders the analysis in a Chrome side panel.

## Project layout

```text
cv-extension/
  manifest.json
  background.js
  content_script.js
  sidebar/
  icons/
backend/
  main.py
  api/
    extension.py
apps/dashboard/
  index.html
```

## Backend setup

Create and activate a Python environment, then install the backend dependencies:

```bash
python -m venv .venv
.venv\Scripts\activate
python -m pip install -r backend\requirements.txt
```

For Claude analysis, set an Anthropic key before starting the API:

```bash
set ANTHROPIC_API_KEY=your_anthropic_key
set ANTHROPIC_MODEL=claude-sonnet-4-20250514
```

If `ANTHROPIC_API_KEY` is not set, the endpoint still works with a deterministic local fallback so the extension can be tested end to end. Candidate records are saved to `storage/candidates.sqlite3` by default.

Start the backend:

```bash
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

Health check:

```bash
curl http://127.0.0.1:8000/health
```

Chrome extension analysis endpoint:

```text
POST http://127.0.0.1:8000/api/v1/extension/analyze
```

The endpoint accepts JSON with `filename`, `pdf_base64`, optional `source_url`, optional `gmail_message_url`, and optional `metadata`.

## Chrome extension setup

1. Open Chrome and go to `chrome://extensions`.
2. Enable Developer mode.
3. Choose Load unpacked.
4. Select the `cv-extension` folder.
5. Open Gmail and view an email with a PDF attachment.
6. Click the RecruitAI extension icon to open the side panel.
7. Confirm the Backend URL is `http://127.0.0.1:8000`.

The content script watches Gmail with `MutationObserver`, detects PDF attachments, and sends only attachment metadata to the service worker. The service worker downloads the PDF with `fetch()` and `ArrayBuffer`, converts it to base64, and posts it to FastAPI. The sidebar receives status, results, and errors through `chrome.runtime.sendMessage`.

## Dashboard

Open the recruiter dashboard:

```text
apps/dashboard/index.html
```

Open the candidate ranking demo:

```text
apps/dashboard/index.html?demo=ranking
```

## Tests

Run frontend tests:

```bash
npm test
```

Run backend tests:

```bash
python -m pytest backend
```

Validation notes:

- [Sprint 2 Frontend Tests](docs/sprint2-frontend-tests.md)
- [Recruiter Dashboard Validation](docs/recruiter-dashboard-validation.md)
