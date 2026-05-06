# RecruitAI CV Parser v2.0
**API and Technical Documentation**

## 1. Overview
The CV Parser v2.0 is the core of the RecruitAI data ingestion pipeline. It asynchronously processes uploaded PDF resumes, extracts structured data (contact, education, experience, skills, etc.) using NLP heuristics and OCR, and provides a multi-factor confidence score for automated HR screening.

## 2. Key Features (v2.0 Updates)
- **Advanced OCR Fallback**: Integrated `pytesseract` with a strict per-page timeout (default 30s) to prevent frozen threads.
- **Robust Error Handling**: Standardized bilingual (TR/EN) error messages for UI display. Graceful handling of corrupted PDFs, empty files, and excessively large documents.
- **Enhanced Confidence Scoring**: Added Text Quality and OCR Penalty parameters to the scoring algorithm.
- **Batch Processing Limits**: API rejects batch uploads that exceed the `BATCH_CONCURRENT_LIMIT` (default: 10 files) to prevent server overload.

---

## 3. Upload API Endpoints

### 3.1. Single Upload
`POST /api/v1/upload`
Uploads a single PDF file and enqueues it for background parsing.

**Request:**
- `Content-Type: multipart/form-data`
- `file`: (Binary PDF file)

**Response (202 Accepted):**
```json
{
  "job_id": "uuid-string",
  "filename": "candidate_cv.pdf",
  "status": "pending",
  "message": "CV yüklendi. Ayrıştırma işlemi arka planda başlatıldı."
}
```
**Errors (400/413/415/500):** Bilingual error detail matching the `ErrorMessages` catalog.

### 3.2. Batch Upload
`POST /api/v1/upload/batch`
Uploads up to `BATCH_CONCURRENT_LIMIT` PDF files at once.

**Request:**
- `Content-Type: multipart/form-data`
- `files`: (Multiple binary PDF files)

**Response (202 Accepted):**
```json
{
  "total": 2,
  "jobs": [
    {
      "job_id": "uuid-1",
      "filename": "cv1.pdf",
      "status": "pending",
      "message": "Kuyruğa eklendi."
    },
    ...
  ]
}
```

### 3.3. Job Status & Results
`GET /api/v1/jobs/{job_id}`
Retrieves the status and the resulting JSON data of a specific parse job.

**Response (200 OK):**
```json
{
  "job_id": "uuid",
  "status": "completed",
  "confidence_score": 0.89,
  "duration_ms": 1450.5,
  "parsed_result": {
    "contact": { "name": "Ahmet Yılmaz", "email": "..." },
    "education": [...],
    "experience": [...],
    "skills": ["Python", "FastAPI"]
  }
}
```

---

## 4. Dashboard Ask AI Explainability API

### 4.1. Explain Candidate Score
`POST /api/v1/match/explain`
Generates a structured Markdown explanation for the Dashboard Chat Panel and `Explain this score` action.

**Request:**
- `Content-Type: application/json`
- `question`: Recruiter question such as `Explain this score` or `Neden?`
- `candidate`: Current candidate score context from the dashboard

```json
{
  "question": "Explain this score",
  "candidate": {
    "id": "cand-001",
    "name": "Ayse Yilmaz",
    "title": "Senior AI Engineer",
    "score": 94,
    "experienceYears": 6.5,
    "skills": ["Python", "FastAPI", "NLP"],
    "recommendation": "Shortlist",
    "factors": [
      {
        "label": "Python competency",
        "value": "90% match",
        "impact": "positive",
        "detail": "Strong backend and AI evidence."
      }
    ]
  },
  "source": "recruiter-dashboard"
}
```

**Response (200 OK):**
```json
{
  "candidate_id": "cand-001",
  "answer": "### Ayse Yilmaz score explanation\nScore: 94/100...",
  "highlights": [
    "Score 94.0/100",
    "Recommendation: Shortlist",
    "Skills reviewed: 3"
  ]
}
```

**curl Example:**
```bash
curl -X POST "http://localhost:8000/api/v1/match/explain" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Neden bu puan?",
    "candidate": {
      "id": "cand-001",
      "name": "Ayse Yilmaz",
      "score": 94,
      "experienceYears": 6.5,
      "skills": ["Python", "FastAPI", "NLP"],
      "recommendation": "Shortlist",
      "factors": [
        {
          "label": "Python competency",
          "impact": "positive",
          "detail": "Strong backend and AI evidence."
        }
      ]
    }
  }'
```

**Frontend behavior:** The dashboard sends the selected candidate's score context, shows `AI is thinking...` while the request is in flight, and renders the returned Markdown inside the chat panel.

---

## 5. Confidence Scoring Algorithm
The parser evaluates the reliability of its output on a `0.0` to `1.0` scale.

**Weights:**
- Experience: 20%
- Education: 15%
- Name & Email: 12% each
- Skills: 12%
- **Text Quality**: 8% (Evaluates character count per page)
- **OCR Penalty**: 8% (Deducts score if OCR fallback was required)
- **Section Richness**: 7% (Evaluates how many distinct sections were found)
- Phone & Summary: 3% each

---

## 6. Technical Validation Note
**Coverage:** 91% (60+ unit tests passing)
**Resilience:** Timeouts applied globally to `_extract_text` and per-page for `_ocr_page`.
**Performance:** Average clean-PDF parse time < 0.5s.
**Compliance:** Python strictly uses duck typing for streams and ensures all file payloads are aggressively garbage-collected post-processing.
