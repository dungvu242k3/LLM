"""Provider registry — factory for getting the right LLM adapter by name."""

from app.providers.base import LLMProvider
from app.providers.nine_router import NineRouterProvider
from app.providers.openrouter import OpenRouterProvider
from app.providers.openai import OpenAIProvider
from app.providers.gemini import GeminiProvider
from app.providers.claude import ClaudeProvider

# Singleton instances
_providers: dict[str, LLMProvider] = {}


def get_provider(provider_name: str) -> LLMProvider:
    """Get a provider adapter by name. Providers are lazy-initialized singletons.

    Args:
        provider_name: One of 'nine_router', 'openrouter', 'openai', 'gemini', 'claude'.

    Returns:
        LLMProvider instance.

    Raises:
        ValueError: If provider_name is not recognized.
    """
    if provider_name in _providers:
        return _providers[provider_name]

    provider_map: dict[str, type[LLMProvider]] = {
        "nine_router": NineRouterProvider,
        "openrouter": OpenRouterProvider,
        "openai": OpenAIProvider,
        "gemini": GeminiProvider,
        "claude": ClaudeProvider,
    }

    if provider_name not in provider_map:
        raise ValueError(
            f"Unknown provider: '{provider_name}'. Available: {list(provider_map.keys())}"
        )

    instance = provider_map[provider_name]()
    _providers[provider_name] = instance
    return instance


def list_providers() -> list[str]:
    """Return all registered provider names."""
    return ["nine_router", "openrouter", "openai", "gemini", "claude"]
