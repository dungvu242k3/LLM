"""Cost evaluator — calculates estimated cost from token usage and model pricing."""

from typing import Optional


def calculate_cost(
    input_tokens: int,
    output_tokens: int,
    input_price_per_1m: Optional[float],
    output_price_per_1m: Optional[float],
) -> Optional[float]:
    """Calculate estimated cost in USD.

    Args:
        input_tokens: Number of input/prompt tokens used.
        output_tokens: Number of output/completion tokens used.
        input_price_per_1m: Price per 1M input tokens in USD.
        output_price_per_1m: Price per 1M output tokens in USD.

    Returns:
        Estimated cost in USD, or None if pricing is unavailable.
    """
    if input_price_per_1m is None and output_price_per_1m is None:
        return None

    cost = 0.0
    if input_price_per_1m is not None:
        cost += (input_tokens / 1_000_000) * input_price_per_1m
    if output_price_per_1m is not None:
        cost += (output_tokens / 1_000_000) * output_price_per_1m

    return round(cost, 6)
