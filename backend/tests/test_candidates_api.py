from fastapi.testclient import TestClient

from backend.main import app


client = TestClient(app)


def test_shortlist_candidate_endpoint():
    response = client.post(
        "/api/v1/candidates/c-123/shortlist",
        json={"candidateId": "c-123", "action": "shortlist", "source": "dashboard"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["candidate_id"] == "c-123"
    assert data["status"] == "shortlisted"
    assert data["action"] == "shortlist"


def test_reject_candidate_endpoint():
    response = client.post(
        "/api/v1/candidates/c-123/reject",
        json={"candidateId": "c-123", "action": "reject", "source": "dashboard"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["candidate_id"] == "c-123"
    assert data["status"] == "rejected"
    assert data["action"] == "reject"
