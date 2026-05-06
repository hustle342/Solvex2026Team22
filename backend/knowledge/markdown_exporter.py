from __future__ import annotations

import re
import unicodedata
from pathlib import Path
from typing import Any, Mapping


DEFAULT_CANDIDATE_MARKDOWN_DIR = Path("storage/markdown/candidates")
FALLBACK = "Not provided"


def slugify(value: Any) -> str:
    """Return a filesystem-safe ASCII slug."""
    normalized = unicodedata.normalize("NFKD", str(value or "candidate")).encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", normalized.lower()).strip("-")
    return slug or "candidate"


def candidate_markdown_filename(candidate: Mapping[str, Any]) -> str:
    candidate_id = _first_present(candidate, "id", "candidate_id", "candidateId") or "candidate"
    name = _candidate_name(candidate)
    return f"{slugify(candidate_id)}-{slugify(name)}.md"


def candidate_to_markdown(candidate: Mapping[str, Any]) -> str:
    """Convert a parsed/dashboard candidate-like dict into safe Markdown."""
    name = _candidate_name(candidate)
    role = _first_present(candidate, "role", "title", "position") or FALLBACK
    score = _first_present(candidate, "score", "final_score", "confidence_score") or FALLBACK
    recommendation = _first_present(candidate, "recommendation", "status") or FALLBACK
    skills = _as_list(_first_present(candidate, "skills", "skill_set"))
    experience = _experience_text(candidate)
    factors = _as_list(candidate.get("factors"))
    strengths = _factor_details(factors, "positive") or _as_list(candidate.get("strengths"))
    concerns = _factor_details(factors, "negative") or _as_list(candidate.get("concerns"))
    notes = _first_present(candidate, "recruiter_notes", "recruiterNotes", "notes") or FALLBACK

    sections = [
        f"# {_safe_text(name)}",
        "## Role",
        _safe_text(role),
        "## Score",
        _safe_text(score),
        "## Recommendation",
        _safe_text(recommendation),
        "## Skills",
        _markdown_list(skills),
        "## Experience",
        _safe_text(experience),
        "## Strengths",
        _markdown_list(strengths),
        "## Concerns",
        _markdown_list(concerns),
        "## Recruiter Notes",
        _safe_text(notes),
    ]
    return "\n\n".join(sections).rstrip() + "\n"


def write_candidate_markdown(
    candidate: Mapping[str, Any], base_dir: Path | str = DEFAULT_CANDIDATE_MARKDOWN_DIR
) -> tuple[Path, str]:
    """Write candidate Markdown and return the path plus rendered content."""
    directory = Path(base_dir)
    directory.mkdir(parents=True, exist_ok=True)
    markdown = candidate_to_markdown(candidate)
    path = directory / candidate_markdown_filename(candidate)
    path.write_text(markdown, encoding="utf-8")
    return path, markdown


def _first_present(candidate: Mapping[str, Any], *keys: str) -> Any:
    for key in keys:
        value = candidate.get(key)
        if value not in (None, "", [], {}):
            return value
    return None


def _candidate_name(candidate: Mapping[str, Any]) -> str:
    contact = candidate.get("contact") if isinstance(candidate.get("contact"), Mapping) else {}
    return (
        _first_present(candidate, "name", "full_name", "fullName", "candidate_name", "candidateName")
        or contact.get("name")
        or FALLBACK
    )


def _experience_text(candidate: Mapping[str, Any]) -> str:
    years = _first_present(candidate, "experienceYears", "experience_years", "total_experience_years")
    if years not in (None, ""):
        return f"{years} years"
    experience = candidate.get("experience")
    if isinstance(experience, list) and experience:
        return "; ".join(_safe_text(item) for item in experience)
    if experience:
        return str(experience)
    return FALLBACK


def _factor_details(factors: list[Any], impact: str) -> list[str]:
    details = []
    for factor in factors:
        if not isinstance(factor, Mapping) or factor.get("impact") != impact:
            continue
        label = factor.get("label") or "Signal"
        detail = factor.get("detail") or factor.get("value") or FALLBACK
        details.append(f"{label}: {detail}")
    return details


def _as_list(value: Any) -> list[Any]:
    if value is None:
        return []
    if isinstance(value, list):
        return value
    if isinstance(value, tuple):
        return list(value)
    return [value]


def _markdown_list(values: list[Any]) -> str:
    cleaned = [_safe_text(value) for value in values if value not in (None, "", [], {})]
    if not cleaned:
        return FALLBACK
    return "\n".join(f"- {item}" for item in cleaned)


def _safe_text(value: Any) -> str:
    if value in (None, "", [], {}):
        return FALLBACK
    if isinstance(value, Mapping):
        return ", ".join(f"{key}: {val}" for key, val in value.items() if val not in (None, "", [], {})) or FALLBACK
    return str(value).replace("\r\n", "\n").replace("\r", "\n").strip() or FALLBACK
