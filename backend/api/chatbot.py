# RecruitAI HR Chatbot – AI-powered candidate analysis assistant
"""
Chatbot Router
==============
Provides a conversational AI assistant for HR users to:
  - Compare candidates side-by-side
  - Ask questions about specific candidates
  - Understand AI scoring rationale

Uses Gemini API with candidate CV data as context.
Supports @mention to select specific candidates for the conversation.
"""

import json
import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from backend.core.models import User, CV
from backend.core.database import get_db
from backend.core.config import get_settings
from backend.api.auth import get_current_user

logger = logging.getLogger("recruitai.chatbot")

router = APIRouter(tags=["chatbot"])

# ── System Prompt ──────────────────────────────────────────────────────────
SYSTEM_PROMPT = """Sen RecruitAI platformunun yapay zeka destekli IK asistanisin.

# TEMEL GOREVLERIN
1. **Aday Karsilastirma**: Kullanici iki veya daha fazla adayi karsilastirmani istediginde; adaylarin deneyim surelerini, teknik becerilerini, egitim gecmislerini ve one cikan projelerini yan yana koyarak objektif bir analiz yap. Guclu ve zayif yonleri net bir sekilde vurgula. Karsilastirmalari Markdown tablolari veya madde isaretleri ile gorsellestir.
2. **Soru-Cevap**: Adaylar hakkinda sorulan spesifik sorulari ("Aday X'in AWS tecrubesi var mi?", "Aday Y neden Aday Z'den daha yuksek puan almis?") dogrudan ve net bir sekilde yanitla.
3. **Puan Gerekcelendirme**: Sistem tarafindan verilen puanin hangi metriklere (beceriler, deneyim, egitim, section tespiti vb.) dayandigini aday verilerinden cikarim yaparak acikla.

# KESIN KURALLAR
- **Sifir Halusinasyon**: SADECE sana saglanan aday verilerine gore cevap ver. Adayin CV'sinde acikca belirtilmeyen hicbir yetenegi, deneyimi veya egitimi varsayma.
- **Bilinmeyeni Kabul Etme**: Kullanicinin sordugu bilgi verilen metinlerde yoksa, uydurmak yerine acikca "Bu bilgi adayin CV verilerinde yer almamaktadir" de.
- **Tarafsizlik**: Adaylar hakkinda yorum yaparken %100 tarafsiz ve profesyonel ol. Sadece elindeki verilere ve somut basarilara odaklan.
- **Format**: Cevaplarini her zaman kolay okunabilir, taranabilir, acik ve yapilandirilmis bir dille (kisa paragraflar, kalin yazilar, listeler) sun. Turkce yaz.
- **Kisa ve oz**: Gereksiz uzun cevaplar verme, net ve oz tut.

# SOHBETE DAHIL EDILEN ADAY VERILERI
Asagida kullanicinin sohbete dahil ettigi adaylarin CV verileri yer almaktadir:

{candidate_data}
"""


# ── Request/Response Models ────────────────────────────────────────────────
class ChatMessage(BaseModel):
    role: str = Field(..., description="'user' or 'assistant'")
    content: str


class ChatRequest(BaseModel):
    message: str = Field(..., description="User's question or instruction")
    history: List[ChatMessage] = Field(default_factory=list, description="Previous messages for context")
    candidate_ids: List[str] = Field(default_factory=list, description="IDs of candidates included via @mention")


class ChatResponse(BaseModel):
    reply: str
    candidates_count: int = 0


class CandidateListItem(BaseModel):
    id: str
    name: str
    score: Optional[float] = None


# ── Helpers ────────────────────────────────────────────────────────────────
def _build_candidate_context(cvs_data: list) -> str:
    """Build a structured text representation of selected candidates for the LLM."""
    if not cvs_data:
        return "Henuz sohbete hicbir aday eklenmemistir. Kullanici @ isareti ile aday ekleyebilir."

    sections = []
    for i, cv in enumerate(cvs_data, 1):
        parts = [f"## ADAY {i}: {cv.get('name', 'Bilinmiyor')}"]
        parts.append(f"- **Dosya**: {cv.get('file_name', '?')}")
        parts.append(f"- **AI Guven Puani**: {cv.get('score', 'Hesaplanmadi')}")

        contact = cv.get("contact", {})
        if contact:
            if contact.get("email"):
                parts.append(f"- **E-posta**: {contact['email']}")
            if contact.get("phone"):
                parts.append(f"- **Telefon**: {contact['phone']}")
            if contact.get("linkedin"):
                parts.append(f"- **LinkedIn**: {contact['linkedin']}")

        skills = cv.get("skills", [])
        if skills:
            parts.append(f"- **Yetenekler**: {', '.join(skills)}")

        education = cv.get("education", [])
        if education:
            parts.append("- **Egitim**:")
            for edu in education:
                edu_line = f"  - {edu.get('institution', '?')}"
                if edu.get("degree"):
                    edu_line += f" / {edu['degree']}"
                if edu.get("start_date") or edu.get("end_date"):
                    edu_line += f" ({edu.get('start_date', '?')} - {edu.get('end_date', '?')})"
                if edu.get("gpa"):
                    edu_line += f" GPA: {edu['gpa']}"
                parts.append(edu_line)

        experience = cv.get("experience", [])
        if experience:
            parts.append("- **Deneyim**:")
            for exp in experience:
                exp_line = f"  - {exp.get('company', '?')}"
                if exp.get("title"):
                    exp_line += f" / {exp['title']}"
                if exp.get("start_date") or exp.get("end_date"):
                    exp_line += f" ({exp.get('start_date', '?')} - {exp.get('end_date', '?')})"
                if exp.get("description"):
                    exp_line += f"\n    {exp['description'][:200]}"
                parts.append(exp_line)

        languages = cv.get("languages", [])
        if languages:
            parts.append(f"- **Diller**: {', '.join(languages)}")

        certifications = cv.get("certifications", [])
        if certifications:
            parts.append(f"- **Sertifikalar**: {', '.join(certifications)}")

        summary = cv.get("summary", "")
        if summary:
            parts.append(f"- **Ozet**: {summary[:300]}")

        raw_text = cv.get("raw_text", "")
        if raw_text:
            parts.append(f"- **CV Ham Metni (ilk 1500 karakter)**:\n```\n{raw_text[:1500]}\n```")

        field_confidences = cv.get("field_confidences", {})
        if field_confidences:
            conf_parts = [f"{k}: {round(v * 100)}%" for k, v in field_confidences.items() if v > 0]
            if conf_parts:
                parts.append(f"- **Alan Guven Skorlari**: {', '.join(conf_parts)}")

        sections.append("\n".join(parts))

    return "\n\n---\n\n".join(sections)


async def _load_cv_data_by_ids(db: AsyncSession, candidate_ids: List[str]) -> list:
    """Load specific CV records by their IDs."""
    if not candidate_ids:
        return []

    result = await db.execute(select(CV).where(CV.id.in_(candidate_ids)))
    cvs = result.scalars().all()
    return _cvs_to_data(cvs)


async def _load_all_cv_data(db: AsyncSession) -> list:
    """Load all CV records."""
    result = await db.execute(select(CV).order_by(CV.uploaded_at.desc()))
    cvs = result.scalars().all()
    return _cvs_to_data(cvs)


def _cvs_to_data(cvs) -> list:
    """Convert CV ORM objects to dicts for context building."""
    cv_data = []
    for cv in cvs:
        entry = {
            "name": cv.candidate_name or "Bilinmiyor",
            "file_name": cv.file_name,
            "score": f"{round(cv.overall_score * 100)}%" if cv.overall_score else "Hesaplanmadi",
        }

        if cv.parse_quality:
            try:
                pq = json.loads(cv.parse_quality) if isinstance(cv.parse_quality, str) else cv.parse_quality
                entry["contact"] = pq.get("contact", {})
                entry["skills"] = pq.get("skills", [])
                entry["education"] = pq.get("education", [])
                entry["experience"] = pq.get("experience", [])
                entry["languages"] = pq.get("languages", [])
                entry["certifications"] = pq.get("certifications", [])
                entry["summary"] = pq.get("summary", "")
                entry["raw_text"] = pq.get("raw_text", "")
                entry["field_confidences"] = pq.get("field_confidences", {})
            except Exception:
                pass

        cv_data.append(entry)

    return cv_data


def _call_llm(system_prompt: str, user_message: str, history: list) -> str:
    """Call Groq API with system prompt and conversation history."""
    settings = get_settings()
    api_key = settings.GROQ_API_KEY

    if not api_key:
        return (
            "Groq API anahtari yapilandirmada bulunamadi. "
            "Lutfen `.env` dosyasina `GROQ_API_KEY` ekleyin ve uygulamayi yeniden baslatin."
        )

    try:
        from groq import Groq

        client = Groq(api_key=api_key)

        # Build messages array
        messages = [{"role": "system", "content": system_prompt}]

        # Add conversation history (last 10 messages)
        for msg in history[-10:]:
            messages.append({
                "role": msg.get("role", "user"),
                "content": msg.get("content", "")
            })

        # Add current user message
        messages.append({"role": "user", "content": user_message})

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            temperature=0.3,
            max_tokens=2048,
        )

        return response.choices[0].message.content or "Yanit olusturulamadi."

    except Exception as e:
        logger.error("Groq API error: %s", e)
        return f"AI yanit olusturulurken bir hata meydana geldi. Lutfen tekrar deneyin.\n\nHata detayi: {str(e)}"


# ── Endpoints ──────────────────────────────────────────────────────────────
@router.get(
    "/candidates",
    response_model=List[CandidateListItem],
    summary="Chatbot icin aday listesi"
)
async def list_candidates_for_chat(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> List[CandidateListItem]:
    """Return a lightweight list of candidates for @mention autocomplete."""
    if current_user.role != "hr":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sadece IK erisebilir.")

    result = await db.execute(select(CV).order_by(CV.uploaded_at.desc()))
    cvs = result.scalars().all()

    return [
        CandidateListItem(
            id=cv.id,
            name=cv.candidate_name or cv.file_name,
            score=cv.overall_score
        )
        for cv in cvs
    ]


@router.post(
    "/chat",
    response_model=ChatResponse,
    summary="IK asistani ile sohbet"
)
async def chat(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> ChatResponse:
    """HR chatbot endpoint — answers questions using @mentioned candidate CV data as context."""
    if current_user.role != "hr":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sadece IK kullanicilari chatbot'u kullanabilir."
        )

    if not request.message.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mesaj bos olamaz."
        )

    # Load candidate data — if specific IDs provided via @mention, use those; otherwise load all
    if request.candidate_ids:
        cv_data = await _load_cv_data_by_ids(db, request.candidate_ids)
    else:
        cv_data = await _load_all_cv_data(db)

    candidate_context = _build_candidate_context(cv_data)

    # Build system prompt with candidate data
    system_prompt = SYSTEM_PROMPT.format(candidate_data=candidate_context)

    # Build history as dicts
    history = [{"role": m.role, "content": m.content} for m in request.history]

    # Call LLM
    reply = _call_llm(system_prompt, request.message, history)

    logger.info("Chatbot query from user %s: %s", current_user.id, request.message[:80])

    return ChatResponse(reply=reply, candidates_count=len(cv_data))
