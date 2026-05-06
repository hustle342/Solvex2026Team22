# Optimized by Skills Agent for RecruitAI
# Chatbot API Endpoint for CV/JD matching explanation

import os
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional
try:
    import google.generativeai as genai
except ImportError:
    genai = None

router = APIRouter(tags=["chatbot"])

class ExplainRequest(BaseModel):
    candidate_id: str = Field(..., description="Unique ID of the candidate")
    candidate_name: str = Field(default="Aday", description="Name of the candidate")
    final_score: float = Field(..., description="The calculated match score (e.g. 78.5)")
    score_factors: Dict[str, Any] = Field(..., description="Details like matched_skills, missing_skills, experience")

class ExplainResponse(BaseModel):
    candidate_id: str
    explanation: str


def build_fallback_explanation(candidate_name: str, score: float, factors: dict, include_service_note: bool = False) -> str:
    summary_reasoning = factors.get("summary_reasoning", "Belirli yetenekler ve deneyim seviyesi")
    service_note = " YZ servisi yogun oldugu icin bu ozet sistem verilerinden uretilmistir." if include_service_note else ""
    return (
        f"{candidate_name} isimli adayin {score} puan almasinin temel sebebi, "
        f"gereksinimlerin onemli bir kismini karsiliyor olmasi ancak bazi alanlarda gelisim payi bulunmasidir. "
        f"Degerlendirme ozellikle su noktalar uzerinden yapildi: {summary_reasoning}. "
        f"Genel olarak aday, mevcut is tanimi icin orta-iyi duzeyde bir eslesme profili sergilemektedir."
        f"{service_note}"
    )

def generate_explanation_with_llm(candidate_name: str, score: float, factors: dict) -> str:
    """Calls real LLM if API key is present, otherwise falls back to mock response."""
    api_key = os.environ.get("GEMINI_API_KEY")
    model_name = os.environ.get("GEMINI_MODEL", "gemini-2.0-flash")
    
    prompt = (
        f"Sen bir İK (İnsan Kaynakları) asistanısın. İK uzmanı sana soruyor: "
        f"'Aday {candidate_name} neden {score} puan aldı?'\n\n"
        f"Adayın puan detayları: {factors}\n\n"
        f"Lütfen 3 veya 4 cümlelik, profesyonel ve açıklayıcı bir Türkçe özet ver."
    )

    if not api_key:
        # Fallback to mock response for CI/CD and local dev without keys
        return build_fallback_explanation(candidate_name, score, factors)

    if genai is None:
        return build_fallback_explanation(candidate_name, score, factors, include_service_note=True)

    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(model_name)
        response = model.generate_content(prompt)
        return response.text
    except Exception:
        return build_fallback_explanation(candidate_name, score, factors, include_service_note=True)


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
