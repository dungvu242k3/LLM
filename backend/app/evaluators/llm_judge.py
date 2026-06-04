"""LLM-as-a-judge evaluator — uses a separate model to score responses."""

import json
import logging
from typing import Optional

from app.providers.base import LLMResponse
from app.providers.registry import get_provider
from app.config import settings

logger = logging.getLogger(__name__)

JUDGE_PROMPT_TEMPLATE = """You are an impartial evaluator assessing the quality of an AI model's response.

## Question
{question}

## Reference Answer (if available)
{expected_answer}

## Model's Response
{model_response}

## Evaluation Criteria
Score each criterion from 1 to 5:
- **relevance**: How relevant is the response to the question? (1=completely off-topic, 5=perfectly relevant)
- **correctness**: How factually correct is the response? (1=completely wrong, 5=fully correct)
- **completeness**: How complete is the response? (1=missing everything, 5=covers all aspects)
- **reasoning**: How well does the model demonstrate logical reasoning? (1=no reasoning, 5=excellent reasoning)
- **factuality**: How grounded in facts is the response? (1=made up, 5=fully factual)
- **hallucination_risk**: How likely is the response to contain fabricated information? (1=definitely hallucinating, 5=no hallucination)

## Instructions
Return ONLY a JSON object with the scores. No explanation, no markdown.

Example:
{{"relevance": 4, "correctness": 5, "completeness": 3, "reasoning": 4, "factuality": 5, "hallucination_risk": 4}}
"""


def _parse_judge_response(text: str) -> Optional[dict]:
    """Try to extract JSON scores from judge response."""
    # Try direct JSON parse
    try:
        return json.loads(text.strip())
    except json.JSONDecodeError:
        pass

    # Try to find JSON block in response
    import re
    json_match = re.search(r"\{[^}]+\}", text)
    if json_match:
        try:
            return json.loads(json_match.group())
        except json.JSONDecodeError:
            pass

    logger.warning(f"Failed to parse judge response: {text[:200]}")
    return None


async def evaluate_with_llm_judge(
    question: str,
    expected_answer: Optional[str],
    model_response: str,
) -> tuple[dict, Optional[LLMResponse]]:
    """Use a judge LLM to evaluate a model's response.

    Returns (scores_dict, response_object)
    """
    default_scores = {
        "relevance_score": None,
        "correctness_score": None,
        "reasoning_score": None,
        "factuality_score": None,
        "safety_score": None,
        "hallucination_score": None,
        "total_score": None,
    }

    # Support mock evaluation if judge model is not configured
    use_mock = not settings.judge_model or settings.judge_model in ("", "your-judge-model-id") or "mock" in settings.judge_model.lower()

    prompt = JUDGE_PROMPT_TEMPLATE.format(
        question=question,
        expected_answer=expected_answer or "Not provided",
        model_response=model_response,
    )

    try:
        if use_mock:
            from app.providers.mock import generate_mock_response
            response = generate_mock_response(
                model="mock-judge",
                provider="mock",
                messages=[{"role": "user", "content": f"assessing the quality of an AI model's response. Question: {question}, Model Response: {model_response}"}]
            )
        else:
            provider = get_provider(settings.judge_provider)
            response = await provider.generate(
                model=settings.judge_model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                max_tokens=512,
            )

        scores = _parse_judge_response(response.text)
        if not scores:
            return default_scores, response

        # Map judge scores to our schema (normalize 1-5 to 1-5)
        result = {
            "relevance_score": scores.get("relevance"),
            "correctness_score": scores.get("correctness"),
            "reasoning_score": scores.get("reasoning"),
            "factuality_score": scores.get("factuality"),
            "hallucination_score": scores.get("hallucination_risk"),
            "safety_score": None,  # Safety needs separate testing
            "total_score": None,
        }

        # Calculate weighted total
        available = [v for v in result.values() if v is not None]
        if available:
            result["total_score"] = round(sum(available) / len(available), 2)

        return result, response

    except Exception as e:
        logger.error(f"LLM judge evaluation failed: {e}")
        return default_scores, None
