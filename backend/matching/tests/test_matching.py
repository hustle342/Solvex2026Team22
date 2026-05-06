# Optimized by Skills Agent for RecruitAI
# Tests for Matching Engine

import pytest
from backend.matching.schemas import JobDescription, Candidate
from backend.matching.engine import Matcher
from backend.matching.metrics import calculate_precision_at_k

@pytest.fixture
def sample_jd():
    return JobDescription(
        id="jd-1",
        title="Senior Python Developer",
        required_skills=["python", "fastapi", "postgresql"],
        nice_to_have_skills=["docker", "kubernetes", "aws"],
        min_experience_years=4.0
    )

@pytest.fixture
def matcher():
    return Matcher(weight_required_skills=0.6, weight_nice_to_have=0.2, weight_experience=0.2)

def test_hard_filter_experience(matcher, sample_jd):
    """Candidate rejected because they have less than 4 years of experience."""
    cand = Candidate(id="c-1", name="Junior Dev", skills=["python", "fastapi", "postgresql"], total_experience_years=2.0)
    result = matcher.evaluate(sample_jd, cand)

    assert result.final_score == 0.0
    assert result.explanation.is_eligible is False
    assert "experience" in result.explanation.rejection_reason.lower()

def test_hard_filter_missing_skills(matcher, sample_jd):
    """Candidate rejected because they lack a required skill (postgresql)."""
    cand = Candidate(id="c-2", name="Mid Dev", skills=["python", "fastapi"], total_experience_years=5.0)
    result = matcher.evaluate(sample_jd, cand)

    assert result.final_score == 0.0
    assert result.explanation.is_eligible is False
    assert "postgresql" in result.explanation.missing_required_skills

def test_perfect_match(matcher, sample_jd):
    """Candidate has all required, all nice-to-have, and enough experience."""
    cand = Candidate(
        id="c-3",
        name="Perfect Dev",
        skills=["python", "fastapi", "postgresql", "docker", "kubernetes", "aws", "git"],
        total_experience_years=6.0
    )
    result = matcher.evaluate(sample_jd, cand)

    assert result.final_score == 100.0
    assert result.explanation.is_eligible is True
    assert len(result.explanation.matched_nice_to_have_skills) == 3

def test_partial_nice_to_have_match(matcher, sample_jd):
    """Candidate meets required, but only 1/3 nice-to-have skills."""
    cand = Candidate(
        id="c-4",
        name="Good Dev",
        skills=["Python", "Fastapi", "postgresql", "Docker"],  # Note case insensitivity testing
        total_experience_years=5.0
    )
    result = matcher.evaluate(sample_jd, cand)

    # Required: 60 points
    # Nice-to-have: (1/3) * 20 = 6.67 points
    # Experience: Meets min (5.0 >= 4.0), cap at 1.0 * 20 = 20 points
    # Total: ~86.67
    assert 86.0 < result.final_score < 87.0
    assert result.explanation.is_eligible is True
    assert "docker" in result.explanation.matched_nice_to_have_skills

def test_rank_candidates(matcher, sample_jd):
    candidates = [
        Candidate(id="c-1", name="A", skills=["python"], total_experience_years=1.0), # Score 0
        Candidate(id="c-2", name="B", skills=["python", "fastapi", "postgresql", "docker", "kubernetes", "aws"], total_experience_years=5.0), # Score 100
        Candidate(id="c-3", name="C", skills=["python", "fastapi", "postgresql", "docker"], total_experience_years=4.0) # Score ~86
    ]

    ranked = matcher.rank_candidates(sample_jd, candidates)
    assert ranked[0].candidate_id == "c-2"
    assert ranked[1].candidate_id == "c-3"
    assert ranked[2].candidate_id == "c-1"

def test_precision_at_k():
    mock_results = [
        {"final_score": 95.0}, # Rel
        {"final_score": 85.0}, # Rel
        {"final_score": 75.0}, # Rel
        {"final_score": 60.0}, # Non-Rel
        {"final_score": 0.0},  # Non-Rel
    ]

    p_at_3 = calculate_precision_at_k(mock_results, k=3, relevance_threshold=70.0)
    assert p_at_3 == 1.0  # 3/3 relevant

    p_at_5 = calculate_precision_at_k(mock_results, k=5, relevance_threshold=70.0)
    assert p_at_5 == 0.6  # 3/5 relevant
