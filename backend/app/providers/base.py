"""Abstract base class for LLM providers."""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional


@dataclass
class LLMResponse:
    """Standardized response from any LLM provider."""
    text: str
    latency_ms: int
    input_tokens: int
    output_tokens: int
    raw: dict
    model: str
    provider: str


class LLMProvider(ABC):
    """Abstract base class that all provider adapters must implement."""

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Return the provider identifier string."""
        ...

    @abstractmethod
    async def generate(
        self,
        model: str,
        messages: list[dict],
        temperature: float = 0.2,
        max_tokens: int = 1024,
    ) -> LLMResponse:
        """Send a chat completion request and return a standardized response.

        Args:
            model: The model identifier for this provider.
            messages: List of message dicts with 'role' and 'content'.
            temperature: Sampling temperature.
            max_tokens: Maximum output tokens.

        Returns:
            LLMResponse with text, latency, token counts, and raw data.
        """
        ...

    @abstractmethod
    async def is_available(self) -> bool:
        """Check if this provider is configured and accessible."""
        ...
