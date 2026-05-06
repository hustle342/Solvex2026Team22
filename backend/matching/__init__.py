# Optimized by Skills Agent for RecruitAI
# Matching Engine Package
"""
RecruitAI Matching Engine
=========================
Evaluates candidates (parsed CVs) against Job Descriptions (JDs).
Supports hard filters, weighted scoring, and explainability factors.
"""

from .engine import Matcher, JobDescription, Candidate
from .metrics import calculate_precision_at_k

__all__ = ["Matcher", "JobDescription", "Candidate", "calculate_precision_at_k"]
