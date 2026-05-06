# Optimized by Skills Agent for RecruitAI
# FastAPI Endpoint for Matching Engine
from fastapi import APIRouter, HTTPException, status
from typing import List, Optional
from pydantic import BaseModel, Field
from backend.matching.schemas import JobDescription, Candidate, MatchResult
from backend.matching.engine import Matcher

router = APIRouter(tags=["matching"])
# Instantiate a global matcher with default weights.
# In a more complex app, this could be injected via Depends() with custom weights.
matcher = Matcher()

class MatchRequest(BaseModel):
    job_description: JobDescription
    candidates: List[Candidate]

class MatchResponse(BaseModel):
    total_candidates: int
    results: List[MatchResult]

class ScoreFactor(BaseModel):
    label: str
    value: str = ""
    impact: str = "neutral"
    detail: str = ""

class CandidateScoreContext(BaseModel):
    id: str
    name: str
    title: Optional[str] = None
    score: float
    experienceYears: float = 0.0
    skills: List[str] = Field(default_factory=list)
    recommendation: Optional[str] = None
    factors: List[ScoreFactor] = Field(default_factory=list)

class ExplainScoreRequest(BaseModel):
    question: str
    candidate: CandidateScoreContext
    source: str = "recruiter-dashboard"

class ExplainScoreResponse(BaseModel):
    candidate_id: str
    answer: str
    highlights: List[str] = Field(default_factory=list)

@router.post(
    "/match",
    response_model=MatchResponse,
    status_code=status.HTTP_200_OK,
    summary="Adayları İş İlanı (JD) ile eşleştir ve sırala",
    description="Verilen bir iş ilanı gereksinimleri ile aday listesini karşılaştırır, ağırlıklı puanlarını hesaplar ve precision açısından sıralı bir liste döner."
)
async def match_candidates(request: MatchRequest) -> MatchResponse:
    """Evaluate and rank candidates against the provided job description."""
    if not request.candidates:
        raise HTTPException(status_code=400, detail="Aday listesi boş olamaz. / Candidate list cannot be empty.")

    try:
        ranked_results = matcher.rank_candidates(request.job_description, request.candidates)
        return MatchResponse(
            total_candidates=len(request.candidates),
            results=ranked_results
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Eşleştirme sırasında hata oluştu: {str(e)}")

@router.post(
    "/match/explain",
    response_model=ExplainScoreResponse,
    status_code=status.HTTP_200_OK,
    summary="Aday puanını açıklayan Ask AI yanıtı üret",
    description="Dashboard chat paneli için aday puanı, faktörleri ve recruiter sorusundan yapılandırılmış açıklama üretir."
)
async def explain_candidate_score(request: ExplainScoreRequest) -> ExplainScoreResponse:
    """Interactive Logic: Explainability Chat Engine."""
    candidate = request.candidate
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    positive = [factor for factor in candidate.factors if factor.impact == "positive"]
    negative = [factor for factor in candidate.factors if factor.impact == "negative"]
    top_positive = positive[0] if positive else None
    top_negative = negative[0] if negative else None

    recommendation = candidate.recommendation or ("Shortlist" if candidate.score >= 85 else "Review")
    strengths = top_positive.detail if top_positive else "No explicit positive factor was provided."
    concern = top_negative.detail if top_negative else "No blocking concern is currently flagged."
    highlights = [
        f"Score {candidate.score}/100",
        f"Recommendation: {recommendation}",
        f"Skills reviewed: {len(candidate.skills)}",
    ]

    answer = "\n".join([
        f"### {candidate.name} score explanation",
        f"Score: {candidate.score}/100. Recommendation: {recommendation}.",
        "",
        f"- Strongest signal: {top_positive.label if top_positive else 'N/A'} - {strengths}",
        f"- Main concern: {top_negative.label if top_negative else 'None'} - {concern}",
        f"- Experience: {candidate.experienceYears} years with {', '.join(candidate.skills[:5]) or 'no skills listed'}.",
        f"- Recruiter action: {'Move to interview quickly.' if candidate.score >= 85 else 'Review the concern before final decision.'}",
        "",
        f"Question interpreted: {request.question.strip()}",
    ])

    return ExplainScoreResponse(
        candidate_id=candidate.id,
        answer=answer,
        highlights=highlights,
    )
