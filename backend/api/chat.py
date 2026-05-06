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
from backend.knowledge.markdown_exporter import DEFAULT_CANDIDATE_MARKDOWN_DIR, write_candidate_markdown
from backend.knowledge.retriever import (
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
        documents = retriever.get_by_ids(request.mentions)
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
    deterministic_answer = build_search_answer(message, candidates)
    documents = retriever.get_by_ids([str(candidate["id"]) for candidate in candidates])
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
