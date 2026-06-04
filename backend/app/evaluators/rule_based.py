"""Rule-based evaluator for test cases with clear expected answers."""

import re
from typing import Optional


def _normalize(text: str) -> str:
    """Normalize text for comparison: lowercase, strip whitespace, remove punctuation."""
    text = text.lower().strip()
    text = re.sub(r"[.,;:!?\"'()]+", "", text)
    text = re.sub(r"\s+", " ", text)
    return text


def _extract_number(text: str) -> Optional[float]:
    """Try to extract a numeric value from text."""
    # Remove common currency/unit markers
    cleaned = re.sub(r"[đ$€£¥₫,.\s]", "", text)
    # Try to find a number
    numbers = re.findall(r"\d+", cleaned)
    if numbers:
        return float(numbers[0])

    # Try with dots/commas as decimal
    numbers = re.findall(r"[\d.]+", text.replace(",", ""))
    if numbers:
        try:
            return float(numbers[0])
        except ValueError:
            pass
    return None


def exact_match_score(response: str, expected: str) -> float:
    """Score 1.0 if normalized response contains the expected answer, else 0.0."""
    if not expected:
        return 0.0
    return 1.0 if _normalize(expected) in _normalize(response) else 0.0


def numeric_match_score(response: str, expected: str, tolerance: float = 0.01) -> float:
    """Score 1.0 if response contains the expected numeric value (within tolerance)."""
    expected_num = _extract_number(expected)
    if expected_num is None:
        return 0.0

    response_num = _extract_number(response)
    if response_num is None:
        return 0.0

    if abs(response_num - expected_num) <= abs(expected_num * tolerance):
        return 1.0
    return 0.0


def keyword_match_score(response: str, keywords: list[str]) -> float:
    """Score based on fraction of keywords found in response."""
    if not keywords:
        return 0.0
    response_lower = _normalize(response)
    found = sum(1 for kw in keywords if _normalize(kw) in response_lower)
    return found / len(keywords)


def evaluate_rule_based(response: str, expected_answer: Optional[str], category: str) -> dict:
    """Run rule-based evaluation and return scores.

    Returns dict with:
        correctness_score: 0.0 or 1.0
        relevance_score: float 0-1
        total_score: weighted average
    """
    scores = {
        "correctness_score": 0.0,
        "relevance_score": 0.0,
        "reasoning_score": None,
        "factuality_score": None,
        "safety_score": None,
        "hallucination_score": None,
    }

    if not expected_answer:
        # Can't score without expected answer
        scores["correctness_score"] = None
        scores["total_score"] = None
        return scores

    # For math/numeric categories, try numeric match first
    if category in ("math", "reasoning"):
        num_score = numeric_match_score(response, expected_answer)
        if num_score > 0:
            scores["correctness_score"] = num_score
        else:
            scores["correctness_score"] = exact_match_score(response, expected_answer)
    else:
        scores["correctness_score"] = exact_match_score(response, expected_answer)

    # Simple relevance: response is non-empty and reasonably long
    if len(response.strip()) > 10:
        scores["relevance_score"] = 1.0
    elif len(response.strip()) > 0:
        scores["relevance_score"] = 0.5
    else:
        scores["relevance_score"] = 0.0

    # Total: weighted average of available scores
    available = [v for v in [scores["correctness_score"], scores["relevance_score"]] if v is not None]
    scores["total_score"] = sum(available) / len(available) if available else None

    return scores
