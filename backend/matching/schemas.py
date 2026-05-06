# Optimized by Skills Agent for RecruitAI
# Matching Engine Data Schemas
from typing import List, Optional
from pydantic import BaseModel, Field

class JobDescription(BaseModel):
    """Represents a job description's requirements."""
    id: str
    title: str
    required_skills: List[str] = Field(default_factory=list, description="Must-have skills (hard filter)")
    nice_to_have_skills: List[str] = Field(default_factory=list)
    min_experience_years: float = Field(default=0.0, description="Minimum years of experience (hard filter)")
    location: Optional[str] = None
    is_remote: bool = False

class Candidate(BaseModel):
    """Represents a simplified candidate profile derived from ParseResult."""
    id: str
    name: str
    skills: List[str] = Field(default_factory=list)
    total_experience_years: float = 0.0
    location: Optional[str] = None

class ExplainabilityFactor(BaseModel):
    """Explains why a candidate received a certain score."""
    is_eligible: bool
    rejection_reason: Optional[str] = None
    matched_required_skills: List[str] = Field(default_factory=list)
    missing_required_skills: List[str] = Field(default_factory=list)
    matched_nice_to_have_skills: List[str] = Field(default_factory=list)
    score_breakdown: dict = Field(default_factory=dict)
    summary_reasoning: str

class MatchResult(BaseModel):
    """The result of matching a candidate to a JD."""
    candidate_id: str
    job_id: str
    final_score: float = Field(ge=0.0, le=100.0)
    explanation: ExplainabilityFactor
