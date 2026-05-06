# Tests for Match API Endpoint

import pytest
from fastapi.testclient import TestClient

from backend.main import app


@pytest.fixture
def test_client():
    return TestClient(app)


def test_match_endpoint_success(test_client):
    payload = {
        "job_description": {
            "id": "jd-1",
            "title": "Backend Dev",
            "required_skills": ["python"],
            "nice_to_have_skills": ["docker"],
            "min_experience_years": 2.0,
        },
        "candidates": [
            {
                "id": "c-1",
                "name": "Eligible Candidate",
                "skills": ["python", "docker"],
                "total_experience_years": 3.0,
            },
            {
                "id": "c-2",
                "name": "Ineligible Candidate",
                "skills": ["java"],
                "total_experience_years": 1.0,
            },
        ],
    }

    response = test_client.post("/api/v1/match", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert data["total_candidates"] == 2
    assert len(data["results"]) == 2

    assert data["results"][0]["candidate_id"] == "c-1"
    assert data["results"][0]["final_score"] > 0
    assert data["results"][0]["explanation"]["is_eligible"] is True

    assert data["results"][1]["candidate_id"] == "c-2"
    assert data["results"][1]["final_score"] == 0.0
    assert data["results"][1]["explanation"]["is_eligible"] is False


def test_match_endpoint_empty_candidates(test_client):
    payload = {
        "job_description": {
            "id": "jd-1",
            "title": "Backend Dev",
            "required_skills": ["python"],
        },
        "candidates": [],
    }

    response = test_client.post("/api/v1/match", json=payload)

    assert response.status_code == 400
    assert "Candidate list cannot be empty" in response.json()["detail"]


def test_explain_score_endpoint_returns_markdown_answer(test_client):
    payload = {
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
                    "detail": "Strong backend and AI evidence.",
                },
                {
                    "label": "Availability",
                    "value": "Follow-up",
                    "impact": "negative",
                    "detail": "Needs recruiter confirmation.",
                },
            ],
        },
        "source": "recruiter-dashboard",
    }

    response = test_client.post("/api/v1/match/explain", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["candidate_id"] == "cand-001"
    assert "### Ayse Yilmaz score explanation" in data["answer"]
    assert "Strongest signal" in data["answer"]
    assert data["highlights"][0] == "Score 94.0/100"


def test_explain_score_endpoint_rejects_empty_question(test_client):
    payload = {
        "question": " ",
        "candidate": {
            "id": "cand-001",
            "name": "Ayse Yilmaz",
            "score": 94,
        },
    }

    response = test_client.post("/api/v1/match/explain", json=payload)

    assert response.status_code == 400
    assert response.json()["detail"] == "Question cannot be empty."
