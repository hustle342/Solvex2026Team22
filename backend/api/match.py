# Optimized by Skills Agent for RecruitAI
# FastAPI Endpoint for Matching Engine
from fastapi import APIRouter, HTTPException, status
from typing import List
from pydantic import BaseModel
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
