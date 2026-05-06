"""RecruitAI matching and scoring logic."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Iterable

from .schemas import (
    CandidateProfile,
    DashboardMatchResult,
    JobDescription,
    ScoreBreakdown,
    ScoreFactor,
)


# AI Agentic Workflow: Logic Engine
# The flow below acts like a Skills Agent: extract normalized evidence,
# compare it against role requirements, explain the weighted score, and emit
# a dashboard-ready recommendation while keeping the recruiter in control.

SKILL_ALIASES: dict[str, tuple[str, ...]] = {
    "python": ("python", "py"),
    "fastapi": ("fastapi", "fast api"),
    "django": ("django",),
    "flask": ("flask",),
    "javascript": ("javascript", "js", "ecmascript"),
    "typescript": ("typescript", "ts"),
    "react": ("react", "react.js", "reactjs"),
    "nextjs": ("next.js", "nextjs", "next"),
    "nodejs": ("node.js", "nodejs", "node"),
    "java": ("java",),
    "spring": ("spring", "spring boot"),
    "csharp": ("c#", "csharp", ".net"),
    "sql": ("sql", "postgresql", "mysql", "mssql", "sqlite"),
    "postgresql": ("postgres", "postgresql", "pgvector"),
    "redis": ("redis",),
    "docker": ("docker", "container"),
    "kubernetes": ("kubernetes", "k8s"),
    "aws": ("aws", "amazon web services"),
    "azure": ("azure",),
    "gcp": ("gcp", "google cloud"),
    "machine learning": ("machine learning", "ml"),
    "nlp": ("nlp", "natural language processing"),
    "llm": ("llm", "large language model", "openai", "gpt"),
    "data science": ("data science", "data scientist"),
    "celery": ("celery",),
    "rabbitmq": ("rabbitmq",),
    "git": ("git", "github", "gitlab"),
    "ci/cd": ("ci/cd", "cicd", "github actions", "pipeline"),
}

STOPWORDS = {
    "and",
    "are",
    "bir",
    "bu",
    "for",
    "ile",
    "job",
    "the",
    "ve",
    "with",
}


@dataclass(frozen=True)
class ScoreCandidateInput:
    candidate: CandidateProfile
    job: JobDescription


def score_candidate(payload: ScoreCandidateInput) -> DashboardMatchResult:
    """Score one parsed CV against one job description on a 1-100 scale."""

    candidate = payload.candidate
    job = payload.job

    candidate_skills = canonicalize_many(candidate.skills) | extract_skills(candidate.raw_text)
    must_have = canonicalize_many(job.must_have_skills) or extract_skills(job.raw_text)
    nice_to_have = canonicalize_many(job.nice_to_have_skills)
    matched_must = tuple(sorted(candidate_skills & must_have))
    matched_nice = tuple(sorted(candidate_skills & nice_to_have))
    missing_must = tuple(sorted(must_have - candidate_skills))

    years = candidate.years_experience
    if years is None:
        years = extract_years_experience(candidate.raw_text)

    project_lines = candidate.projects or extract_project_evidence(candidate.raw_text)
    project_score_ratio = score_project_fit(project_lines, job)
    semantic_ratio = lexical_overlap(candidate.raw_text, build_job_text(job))

    skills_points = round(30 * coverage_ratio(matched_must, must_have))
    skills_points += round(15 * coverage_ratio(matched_nice, nice_to_have))
    experience_points = round(25 * experience_ratio(years, job.min_years_experience))
    projects_points = round(20 * project_score_ratio)
    semantic_points = round(10 * semantic_ratio)

    raw_score = skills_points + experience_points + projects_points + semantic_points
    confidence_adjustment = confidence_penalty(candidate.parse_confidence)
    final_score = clamp_score(raw_score - confidence_adjustment)

    recommendation = recommend(final_score, missing_must, candidate.parse_confidence)
    review_priority = priority_for(recommendation, final_score, missing_must)
    breakdown = ScoreBreakdown(
        skills=skills_points,
        experience=experience_points,
        projects=projects_points,
        semantic_match=semantic_points,
        confidence_adjustment=-confidence_adjustment,
    )

    return DashboardMatchResult(
        candidate_id=candidate.candidate_id,
        job_id=job.job_id,
        score=final_score,
        recommendation=recommendation,
        review_priority=review_priority,
        matched_skills=tuple(sorted(candidate_skills & (must_have | nice_to_have))),
        missing_must_have_skills=missing_must,
        years_experience=round(years, 1),
        parse_confidence=round(candidate.parse_confidence, 2),
        breakdown=breakdown,
        factors=build_factors(
            matched_must=matched_must,
            matched_nice=matched_nice,
            missing_must=missing_must,
            years=years,
            min_years=job.min_years_experience,
            project_score_ratio=project_score_ratio,
            parse_confidence=candidate.parse_confidence,
        ),
        audit={
            "engine_version": "skills-agent-v0.1",
            "scoring_scale": "1-100",
            "weights": {
                "must_have_skills": 30,
                "nice_to_have_skills": 15,
                "experience": 25,
                "projects": 20,
                "semantic_match": 10,
            },
            "human_in_the_loop": True,
        },
    )


def canonicalize_many(values: Iterable[str]) -> set[str]:
    return {canonicalize_skill(value) for value in values if canonicalize_skill(value)}


def canonicalize_skill(value: str) -> str:
    normalized = normalize_phrase(value)
    for canonical, aliases in SKILL_ALIASES.items():
        if normalized == canonical or normalized in {normalize_phrase(alias) for alias in aliases}:
            return canonical
    return normalized


def extract_skills(text: str) -> set[str]:
    normalized_text = f" {normalize_phrase(text)} "
    found: set[str] = set()
    for canonical, aliases in SKILL_ALIASES.items():
        terms = (canonical, *aliases)
        for term in terms:
            if f" {normalize_phrase(term)} " in normalized_text:
                found.add(canonical)
                break
    return found


def extract_years_experience(text: str) -> float:
    patterns = (
        r"(\d+(?:[.,]\d+)?)\+?\s*(?:years?|yrs?)\s+(?:of\s+)?experience",
        r"(\d+(?:[.,]\d+)?)\+?\s*(?:years?|yrs?)",
        r"(\d+(?:[.,]\d+)?)\+?\s*(?:yil|sene)\s+(?:deneyim|tecrube)",
        r"(\d+(?:[.,]\d+)?)\+?\s*(?:yil|sene)",
    )
    matches: list[float] = []
    for pattern in patterns:
        for match in re.findall(pattern, text.lower()):
            value = match if isinstance(match, str) else match[0]
            matches.append(float(value.replace(",", ".")))
    return max(matches, default=0.0)


def extract_project_evidence(text: str) -> tuple[str, ...]:
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    evidence = [
        line
        for line in lines
        if re.search(r"\b(project|proje|built|developed|implemented|gelistirdi)\b", line, re.I)
    ]
    return tuple(evidence[:6])


def score_project_fit(project_lines: Iterable[str], job: JobDescription) -> float:
    project_text = " ".join(project_lines)
    if not project_text:
        return 0.0

    keywords = canonicalize_many(job.project_keywords)
    if not keywords:
        keywords = extract_skills(build_job_text(job))
    if not keywords:
        return 0.5

    project_skills = extract_skills(project_text) | token_set(project_text)
    return min(1.0, len(project_skills & keywords) / max(1, min(len(keywords), 5)))


def lexical_overlap(candidate_text: str, job_text: str) -> float:
    candidate_tokens = token_set(candidate_text)
    job_tokens = token_set(job_text)
    if not candidate_tokens or not job_tokens:
        return 0.0
    return min(1.0, len(candidate_tokens & job_tokens) / max(1, min(len(job_tokens), 20)))


def coverage_ratio(matched: Iterable[str], required: Iterable[str]) -> float:
    required_set = set(required)
    if not required_set:
        return 1.0
    return len(set(matched)) / len(required_set)


def experience_ratio(years: float, min_years: float) -> float:
    if min_years <= 0:
        return min(1.0, years / 5)
    return min(1.0, years / min_years)


def confidence_penalty(parse_confidence: float) -> int:
    if parse_confidence >= 0.85:
        return 0
    if parse_confidence >= 0.7:
        return 5
    return 10


def recommend(score: int, missing_must: tuple[str, ...], parse_confidence: float) -> str:
    if parse_confidence < 0.7:
        return "manual_review"
    if score >= 80 and not missing_must:
        return "shortlist"
    if score < 55 or len(missing_must) >= 3:
        return "reject"
    return "review"


def priority_for(recommendation: str, score: int, missing_must: tuple[str, ...]) -> str:
    if recommendation == "manual_review":
        return "high"
    if recommendation == "shortlist":
        return "low"
    if recommendation == "reject" and score < 40:
        return "low"
    if missing_must:
        return "medium"
    return "normal"


def build_factors(
    *,
    matched_must: tuple[str, ...],
    matched_nice: tuple[str, ...],
    missing_must: tuple[str, ...],
    years: float,
    min_years: float,
    project_score_ratio: float,
    parse_confidence: float,
) -> tuple[ScoreFactor, ...]:
    factors: list[ScoreFactor] = []
    if matched_must:
        factors.append(
            ScoreFactor(
                label="Must-have skill match",
                impact="positive",
                weight=30,
                detail=", ".join(matched_must),
            )
        )
    if matched_nice:
        factors.append(
            ScoreFactor(
                label="Nice-to-have skill match",
                impact="positive",
                weight=15,
                detail=", ".join(matched_nice),
            )
        )
    if missing_must:
        factors.append(
            ScoreFactor(
                label="Missing required skills",
                impact="negative",
                weight=30,
                detail=", ".join(missing_must),
            )
        )
    factors.append(
        ScoreFactor(
            label="Experience fit",
            impact="positive" if years >= min_years else "negative",
            weight=25,
            detail=f"{years:.1f} years vs required {min_years:.1f}",
        )
    )
    factors.append(
        ScoreFactor(
            label="Project relevance",
            impact="positive" if project_score_ratio >= 0.5 else "negative",
            weight=20,
            detail=f"{round(project_score_ratio * 100)}% project keyword coverage",
        )
    )
    if parse_confidence < 0.85:
        factors.append(
            ScoreFactor(
                label="Parse confidence",
                impact="negative",
                weight=10,
                detail=f"CV parse confidence is {parse_confidence:.2f}",
            )
        )
    return tuple(factors)


def build_job_text(job: JobDescription) -> str:
    return " ".join(
        (
            job.raw_text,
            job.title or "",
            " ".join(job.must_have_skills),
            " ".join(job.nice_to_have_skills),
            " ".join(job.responsibilities),
            " ".join(job.project_keywords),
        )
    )


def token_set(text: str) -> set[str]:
    return {
        token
        for token in normalize_phrase(text).split()
        if len(token) > 2 and token not in STOPWORDS
    }


def normalize_phrase(value: str) -> str:
    value = value.lower()
    value = value.replace("ı", "i").replace("ğ", "g").replace("ü", "u")
    value = value.replace("ş", "s").replace("ö", "o").replace("ç", "c")
    value = re.sub(r"[^a-z0-9+#./]+", " ", value)
    value = value.replace("/", " ")
    return re.sub(r"\s+", " ", value).strip()


def clamp_score(value: int) -> int:
    return max(1, min(100, value))
