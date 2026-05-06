from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from dataclasses import dataclass


DEFAULT_GROQ_BASE_URL = "https://api.groq.com/openai/v1"
DEFAULT_GROQ_MODEL = "llama-3.1-8b-instant"


class LLMUnavailableError(Exception):
    """Raised when the configured LLM provider cannot return an answer."""


@dataclass(frozen=True)
class GroqChatClient:
    api_key: str
    base_url: str = DEFAULT_GROQ_BASE_URL
    model: str = DEFAULT_GROQ_MODEL
    timeout_seconds: float = 20.0

    @classmethod
    def from_env(cls) -> "GroqChatClient | None":
        api_key = os.getenv("GROQ_API_KEY", "").strip()
        if not api_key:
            return None
        return cls(
            api_key=api_key,
            base_url=os.getenv("GROQ_BASE_URL", DEFAULT_GROQ_BASE_URL).rstrip("/"),
            model=os.getenv("GROQ_MODEL", DEFAULT_GROQ_MODEL),
            timeout_seconds=float(os.getenv("GROQ_TIMEOUT_SECONDS", "20")),
        )

    def complete(self, *, system_prompt: str, user_prompt: str) -> str:
        url = f"{self.base_url}/chat/completions"
        body = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": 0.2,
            "max_completion_tokens": 700,
        }
        request = urllib.request.Request(
            url,
            data=json.dumps(body).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
                "User-Agent": "RecruitAI/0.1 (+https://localhost)",
            },
            method="POST",
        )

        try:
            with urllib.request.urlopen(request, timeout=self.timeout_seconds) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            raise LLMUnavailableError(f"Groq API rejected the request: HTTP {exc.code} {detail}") from exc
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
            raise LLMUnavailableError(f"Groq API request failed: {exc}") from exc

        try:
            return payload["choices"][0]["message"]["content"].strip()
        except (KeyError, IndexError, TypeError) as exc:
            raise LLMUnavailableError("Groq API returned an unexpected response shape.") from exc


def recruitai_system_prompt() -> str:
    return (
        "You are RecruitAI's recruiter assistant. Answer in concise Turkish Markdown. "
        "Use only the provided candidate context and sources. Do not invent skills, years, "
        "scores, or recommendations. If evidence is missing, say what is missing. "
        "End with a short Sources line."
    )


def build_llm_prompt(*, message: str, context_markdown: str, deterministic_answer: str) -> str:
    return "\n\n".join(
        [
            f"Recruiter question:\n{message}",
            f"Candidate context:\n{context_markdown or 'No candidate context found.'}",
            f"Deterministic baseline answer:\n{deterministic_answer}",
            (
                "Write the final recruiter-facing answer. Keep factual claims grounded in the context. "
                "Use bullets where useful, and preserve source paths."
            ),
        ]
    )
