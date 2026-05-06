from __future__ import annotations

from datetime import UTC, datetime
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field


router = APIRouter(tags=["candidates"])

CandidateDecision = Literal["shortlist", "reject"]


class CandidateActionRequest(BaseModel):
    candidateId: str = Field(..., min_length=1)
    action: CandidateDecision
    source: str = "recruiter-dashboard"


class CandidateActionResponse(BaseModel):
    ok: bool = True
    candidateId: str
    action: CandidateDecision
    status: Literal["shortlisted", "rejected"]
    source: str
    updatedAt: str


@router.post("/candidates/{candidate_id}/{action}", response_model=CandidateActionResponse)
async def update_candidate_decision(
    candidate_id: str,
    action: CandidateDecision,
    request: CandidateActionRequest,
) -> CandidateActionResponse:
    if request.candidateId != candidate_id:
        raise HTTPException(status_code=400, detail="Candidate id in path and body must match.")
    if request.action != action:
        raise HTTPException(status_code=400, detail="Candidate action in path and body must match.")

    return CandidateActionResponse(
        candidateId=candidate_id,
        action=action,
        status="shortlisted" if action == "shortlist" else "rejected",
        source=request.source,
        updatedAt=datetime.now(UTC).isoformat(),
    )
