# Candidate action endpoints used by recruiter dashboard

from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal, Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

router = APIRouter(tags=["candidates"])


class CandidateActionRequest(BaseModel):
    candidateId: Optional[str] = None
    action: Optional[str] = None
    source: Optional[str] = None


class CandidateActionResponse(BaseModel):
    candidate_id: str
    status: Literal["shortlisted", "rejected"]
    action: Literal["shortlist", "reject"]
    source: str
    updated_at: str


def _action_to_status(action: str) -> str:
    if action == "shortlist":
        return "shortlisted"
    if action == "reject":
        return "rejected"
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Invalid candidate action.",
    )


def _apply_candidate_action(candidate_id: str, action: str, body: CandidateActionRequest) -> CandidateActionResponse:
    if not candidate_id.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="candidate_id is required.",
        )

    status_value = _action_to_status(action)
    return CandidateActionResponse(
        candidate_id=candidate_id,
        status=status_value,
        action=action,  # type: ignore[arg-type]
        source=body.source or "recruiter-dashboard",
        updated_at=datetime.now(timezone.utc).isoformat(),
    )


@router.post(
    "/candidates/{candidate_id}/shortlist",
    response_model=CandidateActionResponse,
    summary="Shortlist candidate",
)
async def shortlist_candidate(candidate_id: str, body: CandidateActionRequest) -> CandidateActionResponse:
    return _apply_candidate_action(candidate_id, "shortlist", body)


@router.post(
    "/candidates/{candidate_id}/reject",
    response_model=CandidateActionResponse,
    summary="Reject candidate",
)
async def reject_candidate(candidate_id: str, body: CandidateActionRequest) -> CandidateActionResponse:
    return _apply_candidate_action(candidate_id, "reject", body)
