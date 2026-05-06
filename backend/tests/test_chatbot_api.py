# Optimized by Skills Agent for RecruitAI
# Tests for Chatbot Explain API Endpoint

import pytest
from fastapi.testclient import TestClient
from backend.main import app

@pytest.fixture
def test_client():
    return TestClient(app)

def test_explain_endpoint_success(test_client):
    payload = {
        "candidate_id": "c-123",
        "candidate_name": "Test User",
        "final_score": 78.5,
        "score_factors": {
            "matched_required_skills": ["python", "fastapi"],
            "missing_required_skills": ["postgresql"],
            "score_breakdown": {
                "required_skills_points": 40.0,
                "experience_points": 38.5,
                "total": 78.5
            },
            "summary_reasoning": "Adayın deneyimi yeterli ancak veritabanı becerilerinde eksiklik var."
        }
    }

    response = test_client.post("/api/v1/chatbot/explain", json=payload)
    assert response.status_code == 200
    
    data = response.json()
    assert data["candidate_id"] == "c-123"
    assert "explanation" in data
    assert len(data["explanation"]) > 20 # Explanation should contain some substantial text
