import unittest

from recruitai_ai_engine import CandidateProfile, JobDescription, ScoreCandidateInput, score_candidate


class ScoreCandidateTests(unittest.TestCase):
    def test_scores_strong_candidate_as_shortlist(self):
        candidate = CandidateProfile(
            candidate_id="cand-1",
            raw_text=(
                "Senior AI Engineer with 6 years experience in Python, FastAPI, NLP, "
                "LLM, PostgreSQL and Docker.\n"
                "Project: developed an LLM powered CV matching platform with FastAPI."
            ),
            projects=("LLM CV matching platform with Python FastAPI and PostgreSQL",),
            parse_confidence=0.94,
        )
        job = JobDescription(
            job_id="job-1",
            title="Senior AI Engineer",
            raw_text="Looking for Python FastAPI NLP engineer for LLM matching systems.",
            must_have_skills=("Python", "FastAPI", "NLP"),
            nice_to_have_skills=("LLM", "PostgreSQL", "Docker"),
            min_years_experience=5,
            project_keywords=("LLM", "matching", "FastAPI"),
        )

        result = score_candidate(ScoreCandidateInput(candidate=candidate, job=job))

        self.assertGreaterEqual(result.score, 80)
        self.assertEqual(result.recommendation, "shortlist")
        self.assertEqual(result.missing_must_have_skills, ())
        self.assertIn("python", result.matched_skills)

    def test_missing_required_skills_pushes_to_reject_or_review(self):
        candidate = CandidateProfile(
            candidate_id="cand-2",
            raw_text="Frontend developer with 2 years experience in React and CSS.",
            parse_confidence=0.91,
        )
        job = JobDescription(
            job_id="job-2",
            raw_text="Backend role requiring Python, FastAPI, PostgreSQL and Redis.",
            must_have_skills=("Python", "FastAPI", "PostgreSQL", "Redis"),
            min_years_experience=4,
        )

        result = score_candidate(ScoreCandidateInput(candidate=candidate, job=job))

        self.assertLess(result.score, 55)
        self.assertEqual(result.recommendation, "reject")
        self.assertIn("python", result.missing_must_have_skills)

    def test_low_parse_confidence_forces_manual_review(self):
        candidate = CandidateProfile(
            candidate_id="cand-3",
            raw_text="Python FastAPI engineer with 5 years experience.",
            parse_confidence=0.62,
        )
        job = JobDescription(
            job_id="job-3",
            raw_text="Python FastAPI engineer.",
            must_have_skills=("Python", "FastAPI"),
            min_years_experience=3,
        )

        result = score_candidate(ScoreCandidateInput(candidate=candidate, job=job))

        self.assertEqual(result.recommendation, "manual_review")
        self.assertEqual(result.review_priority, "high")
        self.assertLess(result.breakdown.confidence_adjustment, 0)

    def test_dashboard_output_is_serializable_shape(self):
        result = score_candidate(
            ScoreCandidateInput(
                candidate=CandidateProfile(
                    candidate_id="cand-4",
                    raw_text="Python developer, 3 years experience. Project: API automation.",
                ),
                job=JobDescription(
                    job_id="job-4",
                    raw_text="Python API developer",
                    must_have_skills=("Python",),
                    min_years_experience=2,
                ),
            )
        )

        payload = result.to_dashboard_dict()

        self.assertEqual(payload["candidate_id"], "cand-4")
        self.assertIn("breakdown", payload)
        self.assertIn("factors", payload)
        self.assertIn("audit", payload)


if __name__ == "__main__":
    unittest.main()
