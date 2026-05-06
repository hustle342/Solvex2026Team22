# Optimized by Skills Agent for RecruitAI
# Precision@K Metric Calculation

from typing import List

def calculate_precision_at_k(ranked_results: List[dict], k: int = 10, relevance_threshold: float = 70.0) -> float:
    """
    Calculates Precision@K for a ranked list of match results.

    A candidate is considered 'relevant' if their final_score >= relevance_threshold.

    Precision@K = (Number of relevant candidates in top K) / K

    :param ranked_results: A list of dicts or MatchResult objects, assumed sorted by score descending.
    :param k: The cutoff rank K.
    :param relevance_threshold: The score threshold to consider a match "relevant".
    :return: Float between 0.0 and 1.0
    """
    if not ranked_results or k <= 0:
        return 0.0

    # Ensure we only look at the top K results
    top_k = ranked_results[:k]
    actual_k = len(top_k)

    relevant_count = 0
    for result in top_k:
        # Support both dicts and MatchResult objects
        score = result.get("final_score", 0.0) if isinstance(result, dict) else getattr(result, "final_score", 0.0)
        if score >= relevance_threshold:
            relevant_count += 1

    return round(relevant_count / actual_k, 4)
