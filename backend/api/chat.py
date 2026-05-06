from __future__ import annotations

from pathlib import Path
from typing import Any
import asyncio

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field

from backend.knowledge.llm_client import (
    LLMUnavailableError,
    GroqChatClient,
    build_llm_prompt,
    recruitai_system_prompt,
)
from backend.knowledge.markdown_exporter import (
    DEFAULT_CANDIDATE_MARKDOWN_DIR,
    candidate_markdown_filename,
    candidate_to_markdown,
    write_candidate_markdown,
)
from backend.knowledge.retriever import (
    CandidateDocument,
    MarkdownCandidateRetriever,
    build_mentioned_answer,
    build_search_answer,
)


router = APIRouter(tags=["knowledge-chat"])
MARKDOWN_DIR = DEFAULT_CANDIDATE_MARKDOWN_DIR


class CandidateMarkdownRequest(BaseModel):
    model_config = ConfigDict(extra="allow")
    candidate: dict[str, Any] | None = None


class CandidateMarkdownResponse(BaseModel):
    path: str
    markdown: str


class ChatQueryRequest(BaseModel):
    message: str
    mentions: list[str] = Field(default_factory=list)
    candidates: list[dict[str, Any]] = Field(default_factory=list)


class ChatQueryResponse(BaseModel):
    answer: str
    sources: list[str] = Field(default_factory=list)
    candidates: list[dict[str, Any]] = Field(default_factory=list)
    mode: str = "deterministic"
    warning: str | None = None


def get_retriever() -> MarkdownCandidateRetriever:
    return MarkdownCandidateRetriever(MARKDOWN_DIR)


@router.get("/knowledge/mentions", response_model=list[dict[str, str]])
async def mention_candidates(q: str = Query("", description="Candidate mention search query")) -> list[dict[str, str]]:
    return get_retriever().find_mentions(q)


@router.post(
    "/knowledge/candidates/{candidate_id}/markdown",
    response_model=CandidateMarkdownResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_candidate_markdown(candidate_id: str, request: CandidateMarkdownRequest) -> CandidateMarkdownResponse:
    payload = request.candidate or request.model_dump(exclude={"candidate"}, exclude_none=True)
    payload["id"] = payload.get("id") or candidate_id
    path, markdown = write_candidate_markdown(payload, MARKDOWN_DIR)
    return CandidateMarkdownResponse(path=_display_path(path), markdown=markdown)


@router.post("/chat/query", response_model=ChatQueryResponse)
async def query_chat(request: ChatQueryRequest) -> ChatQueryResponse:
    message = request.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    retriever = get_retriever()
    if request.mentions:
        documents = _merge_documents(
            retriever.get_by_ids(request.mentions),
            _candidate_documents_from_payload(request.candidates, request.mentions),
        )
        deterministic_answer = build_mentioned_answer(message, documents)
        sources = [document.path for document in documents]
        candidates = [
            {
                "id": document.id,
                "label": document.label,
                "type": document.type,
                "path": document.path,
                "candidateScore": document.score,
                "experienceYears": document.experience_years,
                "skills": document.skills,
                "recommendation": document.recommendation,
            }
            for document in documents
        ]
        answer, mode, warning = await _maybe_generate_llm_answer(
            message=message,
            context_markdown="\n\n---\n\n".join(document.markdown for document in documents),
            deterministic_answer=deterministic_answer,
        )
        return ChatQueryResponse(answer=answer, sources=sources, candidates=candidates, mode=mode, warning=warning)

    candidates = retriever.search_natural_language(message)
    if not candidates and request.candidates:
        candidates = _search_payload_candidates(message, request.candidates)
    deterministic_answer = build_search_answer(message, candidates)
    documents = _merge_documents(
        retriever.get_by_ids([str(candidate["id"]) for candidate in candidates]),
        _candidate_documents_from_payload(request.candidates, [str(candidate["id"]) for candidate in candidates]),
    )
    answer, mode, warning = await _maybe_generate_llm_answer(
        message=message,
        context_markdown="\n\n---\n\n".join(document.markdown for document in documents),
        deterministic_answer=deterministic_answer,
    )
    return ChatQueryResponse(
        answer=answer,
        sources=[str(candidate["path"]) for candidate in candidates],
        candidates=candidates,
        mode=mode,
        warning=warning,
    )


def _display_path(path: Path) -> str:
    return path.as_posix()


def _merge_documents(*groups: list[CandidateDocument]) -> list[CandidateDocument]:
    documents: list[CandidateDocument] = []
    seen: set[str] = set()
    for group in groups:
        for document in group:
            key = document.id.lower()
            if key in seen:
                continue
            documents.append(document)
            seen.add(key)
    return documents


def _candidate_documents_from_payload(
    candidates: list[dict[str, Any]], candidate_ids: list[str] | None = None
) -> list[CandidateDocument]:
    wanted = {candidate_id.lower() for candidate_id in candidate_ids or [] if candidate_id}
    documents: list[CandidateDocument] = []
    for candidate in candidates:
        candidate_id = str(candidate.get("id") or candidate.get("candidateId") or "").strip()
        if not candidate_id:
            continue
        if wanted and candidate_id.lower() not in wanted:
            continue
        markdown = candidate_to_markdown(candidate)
        path = MARKDOWN_DIR / candidate_markdown_filename(candidate)
        documents.append(
            CandidateDocument(
                id=candidate_id,
                label=str(candidate.get("name") or candidate.get("label") or "Not provided"),
                type="candidate",
                path=_display_path(path),
                markdown=markdown,
                score=_safe_float(candidate.get("score") or candidate.get("candidateScore")),
                skills=[str(skill) for skill in candidate.get("skills", []) if skill],
                experience_years=_safe_float(candidate.get("experienceYears") or candidate.get("experience_years")),
                recommendation=str(candidate.get("recommendation") or "Not provided"),
            )
        )
    return documents


def _search_payload_candidates(message: str, payload_candidates: list[dict[str, Any]], limit: int = 5) -> list[dict[str, Any]]:
    tokens = _query_tokens(message)
    min_years = _extract_min_years(message)
    results: list[dict[str, Any]] = []
    for candidate in payload_candidates:
        candidate_id = str(candidate.get("id") or candidate.get("candidateId") or "").strip()
        if not candidate_id:
            continue
        skills = [str(skill) for skill in candidate.get("skills", []) if skill]
        candidate_score = _safe_float(candidate.get("score") or candidate.get("candidateScore"))
        experience_years = _safe_float(candidate.get("experienceYears") or candidate.get("experience_years"))
        label = str(candidate.get("name") or candidate.get("label") or candidate_id)
        haystack = _normalize(
            " ".join(
                [
                    label,
                    str(candidate.get("title") or ""),
                    " ".join(skills),
                    str(candidate.get("recommendation") or ""),
                ]
            )
        )
        matched_skills = [skill for skill in skills if _normalize(skill) in tokens]
        token_hits = sum(1 for token in tokens if token in haystack)
        score = token_hits * 12 + len(matched_skills) * 18 + candidate_score / 10
        if min_years is not None:
            score += 20 if experience_years >= min_years else -25
        if score <= 0:
            continue
        path = _display_path(MARKDOWN_DIR / candidate_markdown_filename(candidate))
        results.append(
            {
                "id": candidate_id,
                "label": label,
                "type": "candidate",
                "path": path,
                "score": round(score, 2),
                "candidateScore": candidate_score,
                "experienceYears": experience_years,
                "skills": skills,
                "matchedSkills": matched_skills,
                "recommendation": str(candidate.get("recommendation") or "Not provided"),
            }
        )
    return sorted(results, key=lambda item: (-float(item["score"]), -float(item["candidateScore"]), str(item["label"])))[:limit]


def _safe_float(value: Any) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def _extract_min_years(message: str) -> float | None:
    import re

    match = re.search(r"(\d+(?:[.,]\d+)?)\s*\+?\s*(?:years?|yrs?|yil|yıl)", _normalize(message))
    return float(match.group(1).replace(",", ".")) if match else None


def _query_tokens(message: str) -> set[str]:
    import re

    stopwords = {"bana", "bilen", "bir", "ve", "lazim", "lazım", "deneyimli", "yil", "yıl", "years"}
    tokens = set(re.findall(r"[a-z0-9][a-z0-9.+#-]*", _normalize(message)))
    return {token for token in tokens if len(token) > 1 and token not in stopwords and not token.isdigit()}


def _normalize(value: Any) -> str:
    replacements = str.maketrans({"ı": "i", "ğ": "g", "ü": "u", "ş": "s", "ö": "o", "ç": "c"})
    return str(value or "").lower().translate(replacements)


async def _maybe_generate_llm_answer(
    *, message: str, context_markdown: str, deterministic_answer: str
) -> tuple[str, str, str | None]:
    client = GroqChatClient.from_env()
    if client is None:
        return deterministic_answer, "deterministic", None

    try:
        answer = await asyncio.to_thread(
            client.complete,
            system_prompt=recruitai_system_prompt(),
            user_prompt=build_llm_prompt(
                message=message,
                context_markdown=context_markdown,
                deterministic_answer=deterministic_answer,
            ),
        )
        return answer, "groq", None
    except LLMUnavailableError as exc:
        return deterministic_answer, "deterministic", str(exc)
