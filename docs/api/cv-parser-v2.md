# RecruitAI CV Parser v2.0 API

## Overview

CV Parser v2.0 is the RecruitAI ingestion API for asynchronous PDF resume parsing. Clients upload one or more PDF files, receive a `job_id`, poll the job until it reaches `completed`, and then read the structured parsing result from the same job endpoint.

Base URL for local development:

```text
http://localhost:8000/api/v1
```

Authentication is expected to be sent as a bearer token when enabled by the target environment:

```http
Authorization: Bearer <RECRUITAI_API_TOKEN>
```

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/upload` | Upload one PDF and enqueue a parse job. |
| `POST` | `/upload/batch` | Upload up to `BATCH_CONCURRENT_LIMIT` PDFs. |
| `GET` | `/jobs` | List parse jobs and their current state. |
| `GET` | `/jobs/{job_id}` | Get job status; includes `parsed_result` when complete. |

## curl Examples

### 1. Upload a PDF file

```bash
curl -X POST "http://localhost:8000/api/v1/upload" \
  -H "Authorization: Bearer $RECRUITAI_API_TOKEN" \
  -F "file=@./samples/candidate_cv.pdf;type=application/pdf"
```

Successful response:

```json
{
  "job_id": "9d8b0f88-9c9f-4b31-83f5-14d13f82d5e6",
  "filename": "candidate_cv.pdf",
  "status": "pending",
  "message": "CV uploaded. Parsing started in the background."
}
```

### 2. Query job status

```bash
curl -X GET "http://localhost:8000/api/v1/jobs/9d8b0f88-9c9f-4b31-83f5-14d13f82d5e6" \
  -H "Authorization: Bearer $RECRUITAI_API_TOKEN"
```

Typical in-progress response:

```json
{
  "job_id": "9d8b0f88-9c9f-4b31-83f5-14d13f82d5e6",
  "filename": "candidate_cv.pdf",
  "status": "processing",
  "created_at": "2026-05-06T10:15:22Z",
  "started_at": "2026-05-06T10:15:23Z",
  "completed_at": null,
  "duration_ms": 0,
  "confidence_score": 0,
  "error": null,
  "parsed_result": null
}
```

### 3. Retrieve completed parse result

```bash
curl -X GET "http://localhost:8000/api/v1/jobs/9d8b0f88-9c9f-4b31-83f5-14d13f82d5e6" \
  -H "Authorization: Bearer $RECRUITAI_API_TOKEN" \
  -H "Accept: application/json"
```

Completed response:

```json
{
  "job_id": "9d8b0f88-9c9f-4b31-83f5-14d13f82d5e6",
  "filename": "candidate_cv.pdf",
  "status": "completed",
  "duration_ms": 1450.5,
  "confidence_score": 0.89,
  "error": null,
  "parsed_result": {
    "contact": {
      "name": "Ahmet Yilmaz",
      "email": "ahmet@example.com"
    },
    "education": [],
    "experience": [],
    "skills": ["Python", "FastAPI"]
  }
}
```

## Python Integration

The example below uploads a file, polls with a bounded timeout, and returns the parsed result once the job completes.

```python
import os
import time
import requests

BASE_URL = os.getenv("RECRUITAI_API_URL", "http://localhost:8000/api/v1")
TOKEN = os.getenv("RECRUITAI_API_TOKEN", "")

headers = {"Authorization": f"Bearer {TOKEN}"} if TOKEN else {}


def upload_cv(path: str) -> str:
    with open(path, "rb") as pdf:
        response = requests.post(
            f"{BASE_URL}/upload",
            headers=headers,
            files={"file": (path, pdf, "application/pdf")},
            timeout=30,
        )
    response.raise_for_status()
    return response.json()["job_id"]


def wait_for_result(job_id: str, timeout_seconds: int = 120) -> dict:
    deadline = time.monotonic() + timeout_seconds
    while time.monotonic() < deadline:
        response = requests.get(f"{BASE_URL}/jobs/{job_id}", headers=headers, timeout=10)
        response.raise_for_status()
        payload = response.json()

        if payload["status"] == "completed":
            return payload["parsed_result"]
        if payload["status"] == "failed":
            raise RuntimeError(payload.get("error") or "CV parse failed")

        time.sleep(2)

    raise TimeoutError(f"Parse job did not complete in {timeout_seconds}s: {job_id}")


job_id = upload_cv("./samples/candidate_cv.pdf")
parsed_cv = wait_for_result(job_id)
print(parsed_cv["contact"])
```

## JavaScript Integration

### Browser or Node 18+ with fetch

```javascript
const baseUrl = process.env.RECRUITAI_API_URL || "http://localhost:8000/api/v1";
const token = process.env.RECRUITAI_API_TOKEN;

async function uploadCv(file) {
  const body = new FormData();
  body.append("file", file, file.name || "candidate_cv.pdf");

  const response = await fetch(`${baseUrl}/upload`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body,
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

async function getJob(jobId) {
  const response = await fetch(`${baseUrl}/jobs/${jobId}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    throw new Error(`Status request failed: ${response.status} ${await response.text()}`);
  }

  return response.json();
}
```

### Node.js with axios

```javascript
const fs = require("fs");
const axios = require("axios");
const FormData = require("form-data");

const baseUrl = process.env.RECRUITAI_API_URL || "http://localhost:8000/api/v1";
const token = process.env.RECRUITAI_API_TOKEN;

async function parseCv(path) {
  const form = new FormData();
  form.append("file", fs.createReadStream(path), {
    filename: "candidate_cv.pdf",
    contentType: "application/pdf",
  });

  const upload = await axios.post(`${baseUrl}/upload`, form, {
    headers: {
      ...form.getHeaders(),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    timeout: 30000,
  });

  const jobId = upload.data.job_id;

  for (let attempt = 0; attempt < 60; attempt += 1) {
    const status = await axios.get(`${baseUrl}/jobs/${jobId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      timeout: 10000,
    });

    if (status.data.status === "completed") return status.data.parsed_result;
    if (status.data.status === "failed") throw new Error(status.data.error || "CV parse failed");

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  throw new Error(`Timed out waiting for parse job: ${jobId}`);
}
```

## Troubleshooting

| HTTP code | Common cause | Recommended fix |
| --- | --- | --- |
| `400 Bad Request` | Empty upload, missing `file` field, or batch size above `BATCH_CONCURRENT_LIMIT`. | Confirm the multipart field is named `file` for single upload or `files` for batch upload. Check file size and batch count before sending. |
| `401 Unauthorized` | Missing, expired, or environment-specific bearer token. | Send `Authorization: Bearer <token>`, rotate expired tokens, and verify that the token belongs to the same staging/production environment. |
| `500 Internal Server Error` | Storage write failure, parser runtime error, or worker dependency not initialized. | Retry once with the same file, then inspect backend logs for the `job_id`. Confirm upload and parsed-output directories are writable. |

Additional operational notes:

- `413 Request Entity Too Large` means the file exceeds `MAX_UPLOAD_SIZE_MB`.
- `415 Unsupported Media Type` means the request is not a PDF or the MIME type/extension is not accepted.
- Poll every 2 seconds in normal clients; avoid sub-second polling because parsing is asynchronous and can create unnecessary load.
- Treat `confidence_score < 0.70` as a review-needed parse result, not as a transport failure.

## Confidence Scoring

The parser returns `confidence_score` on a `0.0` to `1.0` scale. The current v2.0 scoring model weights extracted profile sections, text quality, OCR fallback penalty, and section richness. A high score indicates that the extracted fields are likely usable without manual correction.

## Validation Notes

- OCR fallback uses a per-page timeout to prevent stalled parses.
- Batch uploads are bounded by `BATCH_CONCURRENT_LIMIT`, defaulting to 10 files.
- Clean digital PDFs are expected to parse well under the global parser timeout; scanned or OCR-heavy PDFs may take longer.
