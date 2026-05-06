# Optimized by Skills Agent for RecruitAI
# Core Matching Engine Logic

from typing import List
from .schemas import JobDescription, Candidate, MatchResult, ExplainabilityFactor

class Matcher:
    """
    Evaluates candidates against Job Descriptions using hard filters and weighted scoring.
    """
    
    def __init__(self, weight_required_skills: float = 0.6, weight_nice_to_have: float = 0.2, weight_experience: float = 0.2):
        self.weight_req_skills = weight_required_skills
        self.weight_nice = weight_nice_to_have
        self.weight_exp = weight_experience

    def _normalize_skill(self, skill: str) -> str:
        """Simple normalization for exact matching."""
        return skill.strip().lower()

    def evaluate(self, jd: JobDescription, candidate: Candidate) -> MatchResult:
        """
        Evaluate a single candidate against a JD.
        1. Applies Hard Filters (Must-have skills, Min Experience).
        2. Applies Weighted Scoring if eligible.
        3. Generates Explainability Factors.
        """
        c_skills = {self._normalize_skill(s) for s in candidate.skills}
        j_req_skills = {self._normalize_skill(s) for s in jd.required_skills}
        j_nice_skills = {self._normalize_skill(s) for s in jd.nice_to_have_skills}

        matched_req = list(c_skills.intersection(j_req_skills))
        missing_req = list(j_req_skills.difference(c_skills))
        matched_nice = list(c_skills.intersection(j_nice_skills))

        # ── 1. Hard Filters ──────────────────────────────────────────────────
        rejection_reason = None
        is_eligible = True

        if candidate.total_experience_years < jd.min_experience_years:
            is_eligible = False
            rejection_reason = f"Candidate experience ({candidate.total_experience_years}y) is below required minimum ({jd.min_experience_years}y)."
        
        # Hard filter on required skills: we can require 100% or a threshold. 
        # For strict matching, if missing_req > 0, they fail the hard filter.
        elif len(missing_req) > 0:
            is_eligible = False
            rejection_reason = f"Missing required skills: {', '.join(missing_req)}"

        if not is_eligible:
            explanation = ExplainabilityFactor(
                is_eligible=False,
                rejection_reason=rejection_reason,
                missing_required_skills=missing_req,
                matched_required_skills=matched_req,
                summary_reasoning="Candidate eliminated by hard filters.",
                score_breakdown={"total": 0.0}
            )
            return MatchResult(candidate_id=candidate.id, job_id=jd.id, final_score=0.0, explanation=explanation)

        # ── 2. Weighted Scoring ──────────────────────────────────────────────
        # Required skills score (100% since they passed the hard filter)
        req_score = 100.0 * self.weight_req_skills

        # Nice-to-have score
        nice_score_pct = (len(matched_nice) / len(j_nice_skills)) if len(j_nice_skills) > 0 else 1.0
        nice_score = (nice_score_pct * 100.0) * self.weight_nice

        # Experience score (Cap at 100% for the allocated weight if they meet or exceed)
        # Give bonus if they have more, up to max allowed by weight
        exp_ratio = min(candidate.total_experience_years / (jd.min_experience_years or 1.0), 1.5) 
        # If min is 0, they get full points if they have any exp. If both 0, ratio 1.0
        if jd.min_experience_years == 0 and candidate.total_experience_years == 0:
            exp_ratio = 1.0
        exp_score = min(exp_ratio * 100.0, 100.0) * self.weight_exp

        final_score = round(req_score + nice_score + exp_score, 2)

        # ── 3. Explainability ────────────────────────────────────────────────
        score_breakdown = {
            "required_skills_points": round(req_score, 2),
            "nice_to_have_points": round(nice_score, 2),
            "experience_points": round(exp_score, 2),
            "total": final_score
        }

        reasoning = (f"Excellent match. Candidate meets experience requirements and possesses "
                     f"{len(matched_nice)}/{len(j_nice_skills)} nice-to-have skills.")

        explanation = ExplainabilityFactor(
            is_eligible=True,
            matched_required_skills=matched_req,
            matched_nice_to_have_skills=matched_nice,
            score_breakdown=score_breakdown,
            summary_reasoning=reasoning
        )

        return MatchResult(candidate_id=candidate.id, job_id=jd.id, final_score=final_score, explanation=explanation)

    def rank_candidates(self, jd: JobDescription, candidates: List[Candidate]) -> List[MatchResult]:
        """Rank a list of candidates against a JD, sorted by descending score."""
        results = [self.evaluate(jd, c) for c in candidates]
        return sorted(results, key=lambda x: x.final_score, reverse=True)
