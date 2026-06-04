"""Provider registry — factory for getting the right LLM adapter by name."""

from app.providers.base import LLMProvider
from app.providers.openai import OpenAIProvider
from app.providers.gemini import GeminiProvider

# Singleton instances
_providers: dict[str, LLMProvider] = {}


def get_provider(provider_name: str) -> LLMProvider:
    """Get a provider adapter by name. Providers are lazy-initialized singletons.

    Args:
        provider_name: One of 'openai', 'gemini'.

    Returns:
        LLMProvider instance.

    Raises:
        ValueError: If provider_name is not recognized.
    """
    if provider_name in _providers:
        return _providers[provider_name]

    provider_map: dict[str, type[LLMProvider]] = {
        "openai": OpenAIProvider,
        "gemini": GeminiProvider,
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
    return ["openai", "gemini"]
