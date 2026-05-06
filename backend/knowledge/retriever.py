from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path


STOPWORDS = {
    "aday",
    "bana",
    "bilen",
    "bir",
    "candidate",
    "deneyim",
    "deneyimli",
    "gerekiyor",
    "ihtiyac",
    "ihtiyacım",
    "ihtiyacim",
    "lazım",
    "lazim",
    "olan",
    "ve",
    "with",
    "year",
    "years",
    "yıl",
    "yil",
    "yıllık",
    "yillik",
}


@dataclass(frozen=True)
class CandidateDocument:
    id: str
    label: str
    type: str
    path: str
    markdown: str
    score: float
    skills: list[str]
    experience_years: float
    recommendation: str


class MarkdownCandidateRetriever:
    def __init__(self, base_dir: Path | str = Path("storage/markdown/candidates")):
        self.base_dir = Path(base_dir)

    def list_candidates(self) -> list[CandidateDocument]:
        if not self.base_dir.exists():
            return []
        documents = []
        for path in sorted(self.base_dir.glob("*.md")):
            markdown = path.read_text(encoding="utf-8")
            documents.append(self._parse_document(path, markdown))
        return documents

    def find_mentions(self, query: str, limit: int = 8) -> list[dict[str, str]]:
        normalized_query = _normalize(query)
        matches = []
        for document in self.list_candidates():
            haystack = _normalize(f"{document.id} {document.label} {Path(document.path).stem}")
            if not normalized_query or normalized_query in haystack:
                matches.append(
                    {
                        "id": document.id,
                        "label": document.label,
                        "type": document.type,
                        "path": document.path,
                    }
                )
        return matches[:limit]

    def get_by_ids(self, candidate_ids: list[str]) -> list[CandidateDocument]:
        wanted = {_normalize(candidate_id) for candidate_id in candidate_ids}
        return [document for document in self.list_candidates() if _normalize(document.id) in wanted]

    def search_natural_language(self, message: str, limit: int = 5) -> list[dict[str, object]]:
        tokens = _query_tokens(message)
        min_years = _extract_min_years(message)
        results = []
        for document in self.list_candidates():
            haystack = _normalize(f"{document.markdown} {' '.join(document.skills)}")
            matched_skills = [skill for skill in document.skills if _normalize(skill) in haystack and _normalize(skill) in tokens]
            token_hits = sum(1 for token in tokens if token in haystack)
            score = token_hits * 12 + len(matched_skills) * 18 + document.score / 10
            if min_years is not None:
                score += 20 if document.experience_years >= min_years else -25
            if score <= 0:
                continue
            results.append(
                {
                    "id": document.id,
                    "label": document.label,
                    "type": document.type,
                    "path": document.path,
                    "score": round(score, 2),
                    "candidateScore": document.score,
                    "experienceYears": document.experience_years,
                    "skills": document.skills,
                    "matchedSkills": matched_skills,
                    "recommendation": document.recommendation,
                }
            )
        return sorted(results, key=lambda item: (-float(item["score"]), -float(item["candidateScore"]), str(item["label"])))[:limit]

    def _parse_document(self, path: Path, markdown: str) -> CandidateDocument:
        label = _extract_heading(markdown) or path.stem
        return CandidateDocument(
            id=_candidate_id_from_path(path),
            label=label,
            type="candidate",
            path=_display_path(path),
            markdown=markdown,
            score=_extract_number(_section(markdown, "Score")),
            skills=_extract_list(_section(markdown, "Skills")),
            experience_years=_extract_number(_section(markdown, "Experience")),
            recommendation=(_section(markdown, "Recommendation").strip() or "Not provided").splitlines()[0],
        )


def build_mentioned_answer(message: str, documents: list[CandidateDocument]) -> str:
    if not documents:
        return "### No candidate context found\n- The mentioned candidate Markdown file was not found.\n\nSources: Not provided"

    blocks = []
    for document in documents:
        strengths = _extract_list(_section(document.markdown, "Strengths"))
        concerns = _extract_list(_section(document.markdown, "Concerns"))
        skills = ", ".join(document.skills[:8]) or "Not provided"
        blocks.extend(
            [
                f"### {document.label}",
                f"Score: {document.score:g}/100. Recommendation: {document.recommendation}.",
                f"- Skills: {skills}",
                f"- Experience: {document.experience_years:g} years" if document.experience_years else "- Experience: Not provided",
                f"- Strengths: {'; '.join(strengths[:3]) if strengths else 'Not provided'}",
                f"- Concerns: {'; '.join(concerns[:3]) if concerns else 'Not provided'}",
                "",
                f"Question interpreted: {message.strip()}",
            ]
        )
    blocks.append("")
    blocks.append("Sources: " + ", ".join(document.path for document in documents))
    return "\n".join(blocks).strip()


def build_search_answer(message: str, candidates: list[dict[str, object]]) -> str:
    if not candidates:
        return (
            "### Candidate recommendations\n"
            "- No Markdown candidate matched the requested skills or experience yet.\n\n"
            "Sources: Not provided"
        )
    lines = ["### Candidate recommendations"]
    for index, candidate in enumerate(candidates, start=1):
        skills = ", ".join(candidate.get("matchedSkills") or candidate.get("skills") or []) or "Not provided"
        lines.append(
            f"- {index}. {candidate['label']} - match {candidate['score']}, profile score {candidate['candidateScore']}/100, "
            f"{candidate['experienceYears']:g} years. Skills: {skills}. Recommendation: {candidate['recommendation']}."
        )
    lines.append("")
    lines.append(f"Question interpreted: {message.strip()}")
    lines.append("Sources: " + ", ".join(str(candidate["path"]) for candidate in candidates))
    return "\n".join(lines)


def _candidate_id_from_path(path: Path) -> str:
    match = re.search(r"(cand-\d+)", path.stem, flags=re.IGNORECASE)
    return match.group(1).lower() if match else path.stem


def _display_path(path: Path) -> str:
    return path.as_posix()


def _extract_heading(markdown: str) -> str:
    match = re.search(r"^#\s+(.+)$", markdown, flags=re.MULTILINE)
    return match.group(1).strip() if match else ""


def _section(markdown: str, name: str) -> str:
    pattern = rf"^##\s+{re.escape(name)}\s*$([\s\S]*?)(?=^##\s+|\Z)"
    match = re.search(pattern, markdown, flags=re.MULTILINE)
    return match.group(1).strip() if match else ""


def _extract_list(section: str) -> list[str]:
    items = [line[2:].strip() for line in section.splitlines() if line.strip().startswith("- ")]
    if items:
        return items
    stripped = section.strip()
    if not stripped or stripped == "Not provided":
        return []
    return [item.strip() for item in re.split(r",|;", stripped) if item.strip()]


def _extract_number(value: str) -> float:
    match = re.search(r"\d+(?:[.,]\d+)?", value or "")
    return float(match.group(0).replace(",", ".")) if match else 0.0


def _extract_min_years(message: str) -> float | None:
    match = re.search(r"(\d+(?:[.,]\d+)?)\s*\+?\s*(?:years?|yrs?|yil|yil|yıl)", _normalize(message))
    return float(match.group(1).replace(",", ".")) if match else None


def _query_tokens(message: str) -> set[str]:
    tokens = set(re.findall(r"[a-z0-9][a-z0-9.+#-]*", _normalize(message)))
    return {token for token in tokens if len(token) > 1 and token not in STOPWORDS and not token.isdigit()}


def _normalize(value: str) -> str:
    value = str(value or "").lower()
    replacements = str.maketrans({"ı": "i", "ğ": "g", "ü": "u", "ş": "s", "ö": "o", "ç": "c"})
    return value.translate(replacements)
