from __future__ import annotations

import json
import sqlite3
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from backend.core.config import get_settings


def database_path() -> Path:
    settings = get_settings()
    return Path(getattr(settings, "CANDIDATE_DB_PATH", "") or getattr(settings, "EXTENSION_DB_PATH", "storage/candidates.sqlite3"))


def get_connection() -> sqlite3.Connection:
    path = database_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(path)
    connection.row_factory = sqlite3.Row
    initialize_database(connection)
    return connection


def initialize_database(connection: sqlite3.Connection | None = None) -> None:
    owns_connection = connection is None
    if connection is None:
        path = database_path()
        path.parent.mkdir(parents=True, exist_ok=True)
        connection = sqlite3.connect(path)
    try:
        connection.execute("PRAGMA foreign_keys = ON")
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS candidates (
                candidate_id TEXT PRIMARY KEY,
                filename TEXT NOT NULL DEFAULT '',
                name TEXT NOT NULL,
                email TEXT,
                phone TEXT,
                title TEXT,
                score INTEGER NOT NULL DEFAULT 0,
                recommendation TEXT NOT NULL DEFAULT 'Review',
                status TEXT NOT NULL DEFAULT 'new',
                experience_years REAL NOT NULL DEFAULT 0,
                skills_json TEXT NOT NULL DEFAULT '[]',
                analysis_source TEXT NOT NULL DEFAULT 'dashboard',
                source_url TEXT,
                gmail_message_url TEXT,
                metadata_json TEXT NOT NULL DEFAULT '{}',
                analysis_json TEXT NOT NULL DEFAULT '{}',
                extracted_text TEXT NOT NULL DEFAULT '',
                saved_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS candidate_decisions (
                decision_id INTEGER PRIMARY KEY AUTOINCREMENT,
                candidate_id TEXT NOT NULL,
                action TEXT NOT NULL,
                status TEXT NOT NULL,
                source TEXT NOT NULL,
                note TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY(candidate_id) REFERENCES candidates(candidate_id)
            )
            """
        )
        _add_column_if_missing(connection, "candidates", "title", "TEXT")
        _add_column_if_missing(connection, "candidates", "status", "TEXT NOT NULL DEFAULT 'new'")
        _add_column_if_missing(connection, "candidates", "experience_years", "REAL NOT NULL DEFAULT 0")
        _add_column_if_missing(connection, "candidates", "skills_json", "TEXT NOT NULL DEFAULT '[]'")
        _add_column_if_missing(connection, "candidates", "updated_at", "TEXT")
        connection.execute("UPDATE candidates SET updated_at = saved_at WHERE updated_at IS NULL OR updated_at = ''")
        connection.commit()
    finally:
        if owns_connection:
            connection.close()


def save_candidate_record(record: dict[str, Any]) -> None:
    now = record.get("saved_at") or _now()
    analysis = dict(record.get("analysis") or {})
    candidate_id = str(record["candidate_id"])
    name = str(analysis.get("name") or record.get("name") or candidate_id)
    skills = _as_list(analysis.get("skills") or record.get("skills"))

    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO candidates (
                candidate_id, filename, name, email, phone, title, score, recommendation,
                status, experience_years, skills_json, analysis_source, source_url,
                gmail_message_url, metadata_json, analysis_json, extracted_text, saved_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(candidate_id) DO UPDATE SET
                filename = excluded.filename,
                name = excluded.name,
                email = excluded.email,
                phone = excluded.phone,
                title = excluded.title,
                score = excluded.score,
                recommendation = excluded.recommendation,
                experience_years = excluded.experience_years,
                skills_json = excluded.skills_json,
                analysis_source = excluded.analysis_source,
                source_url = excluded.source_url,
                gmail_message_url = excluded.gmail_message_url,
                metadata_json = excluded.metadata_json,
                analysis_json = excluded.analysis_json,
                extracted_text = excluded.extracted_text,
                updated_at = excluded.updated_at
            """,
            (
                candidate_id,
                str(record.get("filename") or ""),
                name,
                analysis.get("email"),
                analysis.get("phone"),
                analysis.get("title"),
                int(_safe_float(analysis.get("score"))),
                str(analysis.get("recommendation") or "Review"),
                str(record.get("status") or "new"),
                _safe_float(analysis.get("experience_years") or analysis.get("experienceYears")),
                json.dumps(skills, ensure_ascii=False),
                str(record.get("analysis_source") or "dashboard"),
                record.get("source_url"),
                record.get("gmail_message_url"),
                json.dumps(record.get("metadata", {}), ensure_ascii=False),
                json.dumps(analysis, ensure_ascii=False),
                str(record.get("text") or ""),
                now,
                _now(),
            ),
        )
        connection.commit()


def upsert_dashboard_candidate(candidate: dict[str, Any]) -> None:
    candidate_id = str(candidate.get("id") or candidate.get("candidateId") or "").strip()
    if not candidate_id:
        return
    analysis = {
        "name": candidate.get("name") or candidate.get("label") or candidate_id,
        "title": candidate.get("title"),
        "score": candidate.get("score") or candidate.get("candidateScore") or 0,
        "recommendation": candidate.get("recommendation") or "Review",
        "experience_years": candidate.get("experienceYears") or candidate.get("experience_years") or 0,
        "skills": candidate.get("skills") or [],
    }
    save_candidate_record(
        {
            "candidate_id": candidate_id,
            "filename": candidate.get("fileName") or "",
            "analysis": analysis,
            "analysis_source": "dashboard",
            "metadata": {"factors": candidate.get("factors") or []},
            "saved_at": _now(),
            "status": candidate.get("status") or "new",
        }
    )


def save_candidate_from_parse(job_id: str, filename: str, parsed_result: dict[str, Any]) -> dict[str, Any]:
    contact = parsed_result.get("contact") or {}
    skills = _as_list(parsed_result.get("skills"))
    confidence = _safe_float(parsed_result.get("confidence_score"))
    score = max(0, min(100, round(confidence * 100)))
    name = str(contact.get("name") or Path(filename).stem or job_id)
    field_confidences = parsed_result.get("field_confidences") or {}
    title = _first_experience_title(parsed_result) or "Uploaded CV"
    recommendation = "Shortlist" if score >= 85 else "Review" if score >= 60 else "Needs Review"
    experience_years = _estimate_experience_years(parsed_result)
    factors = [
        {
            "label": "CV parse quality",
            "value": f"{score}/100",
            "impact": "positive" if score >= 60 else "negative",
            "detail": "Score is based on extracted contact, experience, skills, education, and text quality signals.",
        },
        {
            "label": "Skills extracted",
            "value": str(len(skills)),
            "impact": "positive" if skills else "negative",
            "detail": ", ".join(skills[:8]) if skills else "No skill section was confidently detected.",
        },
    ]
    if field_confidences:
        factors.append(
            {
                "label": "Field confidence",
                "value": f"{round(_safe_float(field_confidences.get('skills')) * 100)}% skills",
                "impact": "positive",
                "detail": "Stored field-level parser confidence is available for review.",
            }
        )

    analysis = {
        "name": name,
        "email": contact.get("email"),
        "phone": contact.get("phone"),
        "title": title,
        "score": score,
        "recommendation": recommendation,
        "experience_years": experience_years,
        "skills": skills,
        "summary": parsed_result.get("summary") or "",
        "factors": factors,
    }
    save_candidate_record(
        {
            "candidate_id": job_id,
            "filename": filename,
            "analysis": analysis,
            "analysis_source": "pdf-upload",
            "metadata": {
                "parse_id": parsed_result.get("parse_id"),
                "source_file": parsed_result.get("source_file"),
                "confidence_score": confidence,
                "field_confidences": field_confidences,
                "warnings": parsed_result.get("warnings") or [],
            },
            "text": parsed_result.get("raw_text") or "",
            "saved_at": parsed_result.get("parsed_at") or _now(),
            "status": "new",
        }
    )
    return _candidate_payload_from_analysis(job_id, filename, analysis)


def record_candidate_decision(
    *, candidate_id: str, action: str, source: str, candidate: dict[str, Any] | None = None, note: str | None = None
) -> dict[str, Any]:
    if candidate:
        upsert_dashboard_candidate({**candidate, "id": candidate_id})

    status = "shortlisted" if action == "shortlist" else "rejected"
    now = _now()
    with get_connection() as connection:
        existing = connection.execute("SELECT candidate_id FROM candidates WHERE candidate_id = ?", (candidate_id,)).fetchone()
        if existing is None:
            save_candidate_record(
                {
                    "candidate_id": candidate_id,
                    "filename": "",
                    "analysis": {"name": candidate_id, "score": 0, "recommendation": "Review", "skills": []},
                    "analysis_source": "decision",
                    "saved_at": now,
                    "status": "new",
                }
            )
        connection.execute(
            "UPDATE candidates SET status = ?, updated_at = ? WHERE candidate_id = ?",
            (status, now, candidate_id),
        )
        cursor = connection.execute(
            """
            INSERT INTO candidate_decisions (candidate_id, action, status, source, note, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (candidate_id, action, status, source, note, now),
        )
        connection.commit()
        return {
            "decisionId": cursor.lastrowid,
            "candidateId": candidate_id,
            "action": action,
            "status": status,
            "source": source,
            "updatedAt": now,
        }


def list_candidates(limit: int = 100) -> list[dict[str, Any]]:
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT candidate_id, filename, name, email, phone, title, score, recommendation,
                   status, experience_years, skills_json, analysis_json, saved_at, updated_at
            FROM candidates
            ORDER BY updated_at DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()
    return [_candidate_from_row(row) for row in rows]


def _candidate_from_row(row: sqlite3.Row) -> dict[str, Any]:
    analysis = _json_loads(row["analysis_json"], {})
    skills = _json_loads(row["skills_json"], [])
    return {
        "id": row["candidate_id"],
        "name": row["name"],
        "title": row["title"] or analysis.get("title") or "Candidate",
        "score": row["score"],
        "experienceYears": row["experience_years"],
        "skills": skills,
        "recommendation": row["recommendation"],
        "status": row["status"],
        "fileName": row["filename"],
        "email": row["email"],
        "phone": row["phone"],
        "appliedAt": (row["saved_at"] or _now())[:10],
        "summary": analysis.get("summary"),
        "factors": analysis.get("factors") or [],
    }


def _candidate_payload_from_analysis(candidate_id: str, filename: str, analysis: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": candidate_id,
        "name": analysis.get("name") or candidate_id,
        "title": analysis.get("title") or "Candidate",
        "score": int(_safe_float(analysis.get("score"))),
        "experienceYears": _safe_float(analysis.get("experience_years") or analysis.get("experienceYears")),
        "skills": _as_list(analysis.get("skills")),
        "recommendation": analysis.get("recommendation") or "Review",
        "status": "new",
        "fileName": filename,
        "appliedAt": _now()[:10],
        "summary": analysis.get("summary"),
        "factors": analysis.get("factors") or [],
    }


def _first_experience_title(parsed_result: dict[str, Any]) -> str:
    experience = parsed_result.get("experience") or []
    if isinstance(experience, list):
        for item in experience:
            if isinstance(item, dict) and item.get("title"):
                return str(item["title"])
    return ""


def _estimate_experience_years(parsed_result: dict[str, Any]) -> float:
    experience = parsed_result.get("experience") or []
    if not isinstance(experience, list) or not experience:
        return 0.0
    return round(min(len(experience) * 1.5, 12.0), 1)


def _add_column_if_missing(connection: sqlite3.Connection, table: str, column: str, declaration: str) -> None:
    columns = {row["name"] for row in connection.execute(f"PRAGMA table_info({table})")}
    if column not in columns:
        connection.execute(f"ALTER TABLE {table} ADD COLUMN {column} {declaration}")


def _json_loads(value: str | None, fallback: Any) -> Any:
    try:
        return json.loads(value or "")
    except json.JSONDecodeError:
        return fallback


def _as_list(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(item) for item in value if str(item)]
    if isinstance(value, str) and value:
        return [value]
    return []


def _safe_float(value: Any) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def _now() -> str:
    return datetime.now(UTC).isoformat()
