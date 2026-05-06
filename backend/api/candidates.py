from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from backend.core.database import list_candidates, record_candidate_decision


router = APIRouter(tags=["candidates"])

CandidateDecision = Literal["shortlist", "reject"]


class CandidateActionRequest(BaseModel):
    candidateId: str = Field(..., min_length=1)
    action: CandidateDecision
    source: str = "recruiter-dashboard"
    candidate: dict | None = None
    note: str | None = None


class CandidateActionResponse(BaseModel):
    ok: bool = True
    candidateId: str
    action: CandidateDecision
    status: Literal["shortlisted", "rejected"]
    source: str
    updatedAt: str
    decisionId: int | None = None


class CandidateListResponse(BaseModel):
    candidates: list[dict]


@router.get("/candidates", response_model=CandidateListResponse)
async def get_candidates(limit: int = 100) -> CandidateListResponse:
    return CandidateListResponse(candidates=list_candidates(limit=limit))


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

    decision = record_candidate_decision(
        candidate_id=candidate_id,
        action=action,
        source=request.source,
        candidate=request.candidate,
        note=request.note,
    )
    return CandidateActionResponse(**decision)
