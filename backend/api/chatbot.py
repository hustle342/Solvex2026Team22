# Optimized by Skills Agent for RecruitAI
# Chatbot API Endpoint for CV/JD matching explanation

import os
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional
import google.generativeai as genai

router = APIRouter(tags=["chatbot"])

class ExplainRequest(BaseModel):
    candidate_id: str = Field(..., description="Unique ID of the candidate")
    candidate_name: str = Field(default="Aday", description="Name of the candidate")
    final_score: float = Field(..., description="The calculated match score (e.g. 78.5)")
    score_factors: Dict[str, Any] = Field(..., description="Details like matched_skills, missing_skills, experience")

class ExplainResponse(BaseModel):
    candidate_id: str
    explanation: str

def generate_explanation_with_llm(candidate_name: str, score: float, factors: dict) -> str:
    """Calls real LLM if API key is present, otherwise falls back to mock response."""
    api_key = os.environ.get("GEMINI_API_KEY")
    
    prompt = (
        f"Sen bir İK (İnsan Kaynakları) asistanısın. İK uzmanı sana soruyor: "
        f"'Aday {candidate_name} neden {score} puan aldı?'\n\n"
        f"Adayın puan detayları: {factors}\n\n"
        f"Lütfen 3 veya 4 cümlelik, profesyonel ve açıklayıcı bir Türkçe özet ver."
    )

    if not api_key:
        # Fallback to mock response for CI/CD and local dev without keys
        return (
            f"{candidate_name} isimli adayın {score} puan almasının temel sebebi, "
            f"gereksinimlerin bir kısmını karşılarken bazılarında eksik kalmasıdır. "
            f"Özellikle sistemimiz şu faktörleri göz önüne almıştır: {factors.get('summary_reasoning', 'Belirli yetenekler ve deneyim seviyesi')}. "
            f"Genel olarak bu aday, mevcut iş tanımı için orta-iyi düzeyde bir eşleşme profili sergilemektedir."
        )

    try:
        genai.configure(api_key=api_key)
        # Using gemini-1.5-flash as it is very fast (2-5 seconds criteria)
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        return f"LLM yanıt oluştururken bir hata meydana geldi: {str(e)}"


@router.post(
    "/explain",
    response_model=ExplainResponse,
    status_code=status.HTTP_200_OK,
    summary="Adayın aldığı eşleşme puanını açıkla",
    description="Score factor ve ID bilgilerini alarak recruiter'a adayın puanını anlatan bir özet oluşturur."
)
async def explain_score(request: ExplainRequest) -> ExplainResponse:
    try:
        explanation = generate_explanation_with_llm(
            candidate_name=request.candidate_name,
            score=request.final_score,
            factors=request.score_factors
        )
        return ExplainResponse(candidate_id=request.candidate_id, explanation=explanation)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
