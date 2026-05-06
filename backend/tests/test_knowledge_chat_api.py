import shutil
from pathlib import Path
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from backend.api import chat as chat_api
from backend.knowledge import llm_client
from backend.knowledge.markdown_exporter import candidate_to_markdown, write_candidate_markdown
from backend.main import app


@pytest.fixture
def workspace_tmp_path():
    path = Path(".tmp") / f"knowledge-tests-{uuid4().hex}"
    path.mkdir(parents=True, exist_ok=True)
    try:
        yield path
    finally:
        shutil.rmtree(path, ignore_errors=True)


def _candidate(**overrides):
    data = {
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
                "impact": "positive",
                "detail": "Strong backend and AI evidence.",
            },
            {
                "label": "Availability",
                "impact": "negative",
                "detail": "Needs recruiter confirmation.",
            },
        ],
    }
    data.update(overrides)
    return data


def test_markdown_exporter_handles_missing_fields():
    markdown = candidate_to_markdown({"id": "cand-999"})

    assert "# Not provided" in markdown
    assert "## Role" in markdown
    assert "Not provided" in markdown
    assert "## Recruiter Notes" in markdown


def test_mention_endpoint_returns_candidate_for_query(workspace_tmp_path, monkeypatch):
    monkeypatch.setattr(chat_api, "MARKDOWN_DIR", workspace_tmp_path)
    write_candidate_markdown(_candidate(id="cand-002", name="Cemocan Demir"), workspace_tmp_path)
    client = TestClient(app)

    response = client.get("/api/v1/knowledge/mentions?q=cem")

    assert response.status_code == 200
    data = response.json()
    assert data == [
        {
            "id": "cand-002",
            "label": "Cemocan Demir",
            "type": "candidate",
            "path": str(workspace_tmp_path / "cand-002-cemocan-demir.md").replace("\\", "/"),
        }
    ]


def test_candidate_markdown_endpoint_writes_file(workspace_tmp_path, monkeypatch):
    monkeypatch.setattr(chat_api, "MARKDOWN_DIR", workspace_tmp_path)
    client = TestClient(app)

    response = client.post(
        "/api/v1/knowledge/candidates/cand-002/markdown",
        json={"name": "Cemocan Demir", "title": "Frontend Platform Developer", "score": 88},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["path"].endswith("cand-002-cemocan-demir.md")
    assert "# Cemocan Demir" in data["markdown"]
    assert (workspace_tmp_path / "cand-002-cemocan-demir.md").exists()


def test_chat_query_with_mention_returns_sourced_answer(workspace_tmp_path, monkeypatch):
    monkeypatch.setattr(chat_api, "MARKDOWN_DIR", workspace_tmp_path)
    write_candidate_markdown(_candidate(id="cand-002", name="Cemocan Demir", score=88), workspace_tmp_path)
    client = TestClient(app)

    response = client.post(
        "/api/v1/chat/query",
        json={"message": "@cemocan backend tarafi yeterli mi?", "mentions": ["cand-002"]},
    )

    assert response.status_code == 200
    data = response.json()
    assert "### Cemocan Demir" in data["answer"]
    assert "Sources:" in data["answer"]
    assert data["sources"][0].endswith("cand-002-cemocan-demir.md")
    assert data["candidates"][0]["id"] == "cand-002"


def test_chat_query_natural_language_ranks_matching_candidates(workspace_tmp_path, monkeypatch):
    monkeypatch.setattr(chat_api, "MARKDOWN_DIR", workspace_tmp_path)
    write_candidate_markdown(_candidate(id="cand-001", name="Ayse Yilmaz", score=94, experienceYears=6.5), workspace_tmp_path)
    write_candidate_markdown(
        _candidate(
            id="cand-003",
            name="Mehmet Kaya",
            title="Full Stack Engineer",
            score=79,
            experienceYears=5.1,
            skills=["React", "Node.js", "PostgreSQL", "Docker"],
            recommendation="Review",
        ),
        workspace_tmp_path,
    )
    client = TestClient(app)

    response = client.post(
        "/api/v1/chat/query",
        json={"message": "Bana Python, FastAPI ve NLP bilen 5+ yil deneyimli biri lazim", "mentions": []},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["candidates"][0]["id"] == "cand-001"
    assert data["candidates"][0]["matchedSkills"] == ["Python", "FastAPI", "NLP"]
    assert "Candidate recommendations" in data["answer"]


def test_chat_query_uses_groq_when_api_key_is_configured(workspace_tmp_path, monkeypatch):
    monkeypatch.setattr(chat_api, "MARKDOWN_DIR", workspace_tmp_path)
    write_candidate_markdown(_candidate(id="cand-002", name="Cemocan Demir", score=88), workspace_tmp_path)

    class FakeGroqClient:
        def complete(self, *, system_prompt, user_prompt):
            assert "RecruitAI" in system_prompt
            assert "Cemocan Demir" in user_prompt
            return "### Cemocan Demir\n- LLM destekli cevap.\n\nSources: storage/markdown/candidates/cand-002-cemocan-demir.md"

    monkeypatch.setattr(llm_client.GroqChatClient, "from_env", classmethod(lambda cls: FakeGroqClient()))
    client = TestClient(app)

    response = client.post(
        "/api/v1/chat/query",
        json={"message": "@cemocan backend tarafi yeterli mi?", "mentions": ["cand-002"]},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["mode"] == "groq"
    assert "LLM destekli cevap" in data["answer"]
