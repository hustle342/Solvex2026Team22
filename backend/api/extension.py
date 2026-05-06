from __future__ import annotations

import asyncio
import base64
import binascii
import io
import json
import logging
import re
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import pdfplumber
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field, field_validator

from backend.core.config import get_settings

logger = logging.getLogger("recruitai.api.extension")
router = APIRouter(prefix="/extension", tags=["chrome-extension"])


class ExtensionAnalyzeRequest(BaseModel):
    filename: str = Field(..., min_length=1, max_length=255)
    pdf_base64: str = Field(..., min_length=1)
    source_url: str | None = None
    gmail_message_url: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)

    @field_validator("filename")
    @classmethod
    def validate_filename(cls, value: str) -> str:
        filename = value.strip()
        if not filename.lower().endswith(".pdf"):
            raise ValueError("Dosya adi .pdf ile bitmelidir.")
        return filename


class ExtensionAnalyzeResponse(BaseModel):
    candidate_id: str
    filename: str
    text_chars: int
    analysis_source: str
    saved_at: str
    analysis: dict[str, Any]


@router.post(
    "/analyze",
    response_model=ExtensionAnalyzeResponse,
    summary="Gmail eklentisinden gelen PDF CV'yi analiz et",
)
async def analyze_extension_pdf(payload: ExtensionAnalyzeRequest) -> ExtensionAnalyzeResponse:
    pdf_bytes = decode_pdf_base64(payload.pdf_base64)
    validate_pdf_bytes(pdf_bytes)

    text = await asyncio.to_thread(extract_pdf_text, pdf_bytes)
    settings = get_settings()
    analysis, source = await analyze_cv_text(text=text, filename=payload.filename, settings=settings)

    candidate_id = str(uuid.uuid4())
    saved_at = datetime.now(timezone.utc).isoformat()
    record = {
        "candidate_id": candidate_id,
        "filename": payload.filename,
        "text": text,
        "analysis": analysis,
        "analysis_source": source,
        "source_url": payload.source_url,
        "gmail_message_url": payload.gmail_message_url,
        "metadata": payload.metadata,
        "saved_at": saved_at,
    }
    await asyncio.to_thread(save_candidate_record, record, settings)

    logger.info(
        "extension_cv_analyzed candidate_id=%s filename=%s text_chars=%s analysis_source=%s",
        candidate_id,
        payload.filename,
        len(text),
        source,
    )

    return ExtensionAnalyzeResponse(
        candidate_id=candidate_id,
        filename=payload.filename,
        text_chars=len(text),
        analysis_source=source,
        saved_at=saved_at,
        analysis=analysis,
    )


def decode_pdf_base64(value: str) -> bytes:
    normalized = value.split(",", 1)[-1].strip()
    try:
        return base64.b64decode(normalized, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="PDF base64 formati gecersiz.",
        ) from exc


def validate_pdf_bytes(pdf_bytes: bytes) -> None:
    settings = get_settings()
    max_upload_bytes = getattr(settings, "max_upload_bytes", 20 * 1024 * 1024)
    if not pdf_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="PDF dosyasi bos.")
    if len(pdf_bytes) > max_upload_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="PDF dosyasi izin verilen boyutu asiyor.",
        )
    if not pdf_bytes.startswith(b"%PDF"):
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="Yalnizca PDF kabul edilir.")


def extract_pdf_text(pdf_bytes: bytes) -> str:
    try:
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            max_pages = getattr(get_settings(), "PARSER_MAX_PAGES", 30)
            pages = pdf.pages[:max_pages]
            text_parts = [(page.extract_text() or "").strip() for page in pages]
    except Exception as exc:
        logger.exception("pdf_text_extraction_failed")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"PDF metni cikarilamadi: {exc}",
        ) from exc

    return "\n\n".join(part for part in text_parts if part)[:50000]


async def analyze_cv_text(text: str, filename: str, settings: Any) -> tuple[dict[str, Any], str]:
    api_key = getattr(settings, "ANTHROPIC_API_KEY", "") or ""
    if api_key:
        try:
            analysis = await asyncio.to_thread(call_anthropic, text, filename, settings)
            return normalize_analysis(analysis, text, filename), "anthropic"
        except Exception as exc:
            logger.exception("anthropic_analysis_failed filename=%s", filename)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Anthropic analizi basarisiz: {exc}",
            ) from exc

    return build_local_analysis(text, filename), "local_fallback"


def call_anthropic(text: str, filename: str, settings: Any) -> dict[str, Any]:
    from anthropic import Anthropic

    model = getattr(settings, "ANTHROPIC_MODEL", "claude-sonnet-4-20250514")
    client = Anthropic(api_key=getattr(settings, "ANTHROPIC_API_KEY"))
    prompt = build_analysis_prompt(text=text, filename=filename)
    response = client.messages.create(
        model=model,
        max_tokens=1600,
        temperature=0.1,
        system=(
            "You are a senior technical recruiter. Return only valid JSON. "
            "Do not wrap the JSON in markdown."
        ),
        messages=[{"role": "user", "content": prompt}],
    )
    raw_text = "".join(block.text for block in response.content if getattr(block, "type", "") == "text")
    return parse_json_object(raw_text)


def build_analysis_prompt(text: str, filename: str) -> str:
    return (
        "Analyze this CV for recruiting triage. Return a JSON object with exactly these keys: "
        "name, email, phone, title, skills, experience_years, education, summary, score, "
        "recommendation, risks, next_steps, language. "
        "score must be an integer from 0 to 100. skills, risks, next_steps must be arrays of strings. "
        "recommendation must be one of Shortlist, Review, Reject.\n\n"
        f"Filename: {filename}\n\nCV text:\n{text or '[No extractable text]'}"
    )


def parse_json_object(raw_text: str) -> dict[str, Any]:
    try:
        return json.loads(raw_text)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", raw_text, flags=re.DOTALL)
        if not match:
            raise ValueError("Model JSON dondurmedi.")
        return json.loads(match.group(0))


def build_local_analysis(text: str, filename: str) -> dict[str, Any]:
    compact = re.sub(r"\s+", " ", text).strip()
    email = first_match(r"[\w.+-]+@[\w-]+\.[\w.-]+", text)
    phone = first_match(r"(\+?\d[\d\s().-]{8,}\d)", text)
    skills = extract_skills(text)
    name = infer_name(text, filename)
    score = min(95, 45 + min(len(skills) * 6, 36) + (10 if email else 0) + (4 if phone else 0))
    recommendation = "Shortlist" if score >= 75 else "Review" if score >= 55 else "Reject"
    summary = (
        f"{name} icin CV metninden {len(skills)} beceri sinyali yakalandi."
        if compact
        else "PDF icinde secilebilir metin bulunamadi; OCR veya manuel inceleme gerekebilir."
    )
    risks = []
    if not email:
        risks.append("E-posta adresi bulunamadi.")
    if not compact:
        risks.append("PDF metni cikarilamadi veya taranmis belge olabilir.")
    if len(skills) < 3:
        risks.append("Beceri sinyali sinirli.")

    return normalize_analysis(
        {
            "name": name,
            "email": email,
            "phone": phone,
            "title": infer_title(text),
            "skills": skills,
            "experience_years": infer_experience_years(text),
            "education": infer_education(text),
            "summary": summary,
            "score": score,
            "recommendation": recommendation,
            "risks": risks,
            "next_steps": [
                "Aday profilini rol gereksinimleriyle eslestir.",
                "Eksik iletisim veya deneyim bilgilerini kisa gorusmede dogrula.",
            ],
            "language": "tr/en",
        },
        text,
        filename,
    )


def normalize_analysis(analysis: dict[str, Any], text: str, filename: str) -> dict[str, Any]:
    normalized = dict(analysis)
    normalized["name"] = str(normalized.get("name") or infer_name(text, filename))
    normalized["email"] = normalized.get("email") or first_match(r"[\w.+-]+@[\w-]+\.[\w.-]+", text)
    normalized["phone"] = normalized.get("phone") or first_match(r"(\+?\d[\d\s().-]{8,}\d)", text)
    normalized["title"] = str(normalized.get("title") or infer_title(text))
    normalized["skills"] = as_string_list(normalized.get("skills")) or extract_skills(text)
    normalized["experience_years"] = coerce_number(normalized.get("experience_years"))
    normalized["education"] = str(normalized.get("education") or infer_education(text))
    normalized["summary"] = str(normalized.get("summary") or "CV analizi tamamlandi.")
    normalized["score"] = max(0, min(100, int(coerce_number(normalized.get("score")) or 0)))
    normalized["recommendation"] = normalize_recommendation(normalized.get("recommendation"))
    normalized["risks"] = as_string_list(normalized.get("risks"))
    normalized["next_steps"] = as_string_list(normalized.get("next_steps")) or ["Recruiter incelemesi yap."]
    normalized["language"] = str(normalized.get("language") or "unknown")
    return normalized


def save_candidate_record(record: dict[str, Any], settings: Any) -> None:
    db_path = Path(getattr(settings, "EXTENSION_DB_PATH", "storage/candidates.sqlite3"))
    db_path.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(db_path) as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS candidates (
                candidate_id TEXT PRIMARY KEY,
                filename TEXT NOT NULL,
                name TEXT NOT NULL,
                email TEXT,
                phone TEXT,
                score INTEGER NOT NULL,
                recommendation TEXT NOT NULL,
                analysis_source TEXT NOT NULL,
                source_url TEXT,
                gmail_message_url TEXT,
                metadata_json TEXT NOT NULL,
                analysis_json TEXT NOT NULL,
                extracted_text TEXT NOT NULL,
                saved_at TEXT NOT NULL
            )
            """
        )
        analysis = record["analysis"]
        connection.execute(
            """
            INSERT INTO candidates (
                candidate_id, filename, name, email, phone, score, recommendation,
                analysis_source, source_url, gmail_message_url, metadata_json,
                analysis_json, extracted_text, saved_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                record["candidate_id"],
                record["filename"],
                analysis["name"],
                analysis.get("email"),
                analysis.get("phone"),
                analysis["score"],
                analysis["recommendation"],
                record["analysis_source"],
                record.get("source_url"),
                record.get("gmail_message_url"),
                json.dumps(record.get("metadata", {}), ensure_ascii=False),
                json.dumps(analysis, ensure_ascii=False),
                record["text"],
                record["saved_at"],
            ),
        )
        connection.commit()


def extract_skills(text: str) -> list[str]:
    known_skills = [
        "Python",
        "FastAPI",
        "Django",
        "Flask",
        "JavaScript",
        "TypeScript",
        "React",
        "Node.js",
        "SQL",
        "PostgreSQL",
        "SQLite",
        "Docker",
        "Kubernetes",
        "AWS",
        "Azure",
        "GCP",
        "Machine Learning",
        "NLP",
        "LLM",
        "Data Analysis",
        "Java",
        "C#",
        "Go",
        "Git",
    ]
    lower_text = text.lower()
    return [skill for skill in known_skills if skill.lower() in lower_text]


def infer_name(text: str, filename: str) -> str:
    for line in text.splitlines()[:8]:
        clean = re.sub(r"\s+", " ", line).strip()
        if 2 <= len(clean.split()) <= 4 and not any(char.isdigit() for char in clean):
            if "@" not in clean and not clean.lower().endswith(".pdf"):
                return clean[:80]
    return Path(filename).stem.replace("_", " ").replace("-", " ").title()


def infer_title(text: str) -> str:
    title_keywords = [
        "Software Engineer",
        "Backend Developer",
        "Frontend Developer",
        "Full Stack Developer",
        "Data Scientist",
        "Machine Learning Engineer",
        "Product Manager",
        "Project Manager",
    ]
    lower_text = text.lower()
    for title in title_keywords:
        if title.lower() in lower_text:
            return title
    return "Belirtilmemis"


def infer_experience_years(text: str) -> float:
    matches = re.findall(r"(\d{1,2})\+?\s*(?:years|year|yil|sene)", text, flags=re.IGNORECASE)
    if not matches:
        return 0.0
    return float(max(int(match) for match in matches))


def infer_education(text: str) -> str:
    for keyword in ["PhD", "Master", "MSc", "Bachelor", "BSc", "Lisans", "Yuksek Lisans"]:
        if keyword.lower() in text.lower():
            return keyword
    return "Belirtilmemis"


def first_match(pattern: str, text: str) -> str | None:
    match = re.search(pattern, text)
    return match.group(0).strip() if match else None


def as_string_list(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if isinstance(value, str) and value.strip():
        return [value.strip()]
    return []


def coerce_number(value: Any) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def normalize_recommendation(value: Any) -> str:
    recommendation = str(value or "Review").strip().title()
    if recommendation not in {"Shortlist", "Review", "Reject"}:
        return "Review"
    return recommendation
