"""Typed schemas for dashboard-ready AI scoring results."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any


@dataclass(frozen=True)
class CandidateProfile:
    """Normalized candidate data produced from parsed CV text."""

    raw_text: str
    candidate_id: str = "unknown-candidate"
    name: str | None = None
    skills: tuple[str, ...] = ()
    years_experience: float | None = None
    projects: tuple[str, ...] = ()
    parse_confidence: float = 1.0


@dataclass(frozen=True)
class JobDescription:
    """Role requirements extracted from a job description."""

    raw_text: str
    job_id: str = "unknown-job"
    title: str | None = None
    must_have_skills: tuple[str, ...] = ()
    nice_to_have_skills: tuple[str, ...] = ()
    min_years_experience: float = 0.0
    responsibilities: tuple[str, ...] = ()
    project_keywords: tuple[str, ...] = ()


@dataclass(frozen=True)
class ScoreFactor:
    label: str
    impact: str
    weight: int
    detail: str


@dataclass(frozen=True)
class ScoreBreakdown:
    skills: int
    experience: int
    projects: int
    semantic_match: int
    confidence_adjustment: int


@dataclass(frozen=True)
class DashboardMatchResult:
    """Clean result shape consumed by Ranking API and IK dashboard."""

    candidate_id: str
    job_id: str
    score: int
    recommendation: str
    review_priority: str
    matched_skills: tuple[str, ...]
    missing_must_have_skills: tuple[str, ...]
    years_experience: float
    parse_confidence: float
    breakdown: ScoreBreakdown
    factors: tuple[ScoreFactor, ...] = field(default_factory=tuple)
    audit: dict[str, Any] = field(default_factory=dict)

    def to_dashboard_dict(self) -> dict[str, Any]:
        """Return a JSON-serializable structure for API responses."""

        return asdict(self)
