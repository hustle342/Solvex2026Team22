# Optimized by Skills Agent for RecruitAI
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
            "min_experience_years": 2.0
        },
        "candidates": [
            {
                "id": "c-1",
                "name": "Eligible Candidate",
                "skills": ["python", "docker"],
                "total_experience_years": 3.0
            },
            {
                "id": "c-2",
                "name": "Ineligible Candidate",
                "skills": ["java"],
                "total_experience_years": 1.0
            }
        ]
    }

    response = test_client.post("/api/v1/match", json=payload)
    assert response.status_code == 200
    
    data = response.json()
    assert data["total_candidates"] == 2
    assert len(data["results"]) == 2
    
    # Results should be ranked: Eligible Candidate should be first
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
            "required_skills": ["python"]
        },
        "candidates": []
    }
    
    response = test_client.post("/api/v1/match", json=payload)
    assert response.status_code == 400
    assert "Aday listesi boş olamaz" in response.json()["detail"]
