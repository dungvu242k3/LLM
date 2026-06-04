"""OpenRouter provider adapter — unified API for 200+ models."""

import time
import httpx

from app.config import settings
from app.providers.base import LLMProvider, LLMResponse


class OpenRouterProvider(LLMProvider):
    """Provider adapter for OpenRouter."""

    def __init__(self):
        self.api_key = settings.openrouter_api_key
        self.base_url = settings.openrouter_base_url.rstrip("/")

    @property
    def provider_name(self) -> str:
        return "openrouter"

    async def generate(
        self,
        model: str,
        messages: list[dict],
        temperature: float = 0.2,
        max_tokens: int = 1024,
    ) -> LLMResponse:
        if not self.api_key or self.api_key in ("your_openrouter_key_here", "") or "mock" in self.api_key.lower():
            from app.providers.mock import generate_mock_response
            return generate_mock_response(model, self.provider_name, messages)

        start = time.time()

        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(
                f"{self.base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://llm-eval-dashboard.local",
                    "X-Title": "LLM Evaluation Dashboard",
                },
                json={
                    "model": model,
                    "messages": messages,
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                },
            )

        latency_ms = int((time.time() - start) * 1000)
        resp.raise_for_status()
        data = resp.json()

        usage = data.get("usage", {})

        return LLMResponse(
            text=data["choices"][0]["message"]["content"],
            latency_ms=latency_ms,
            input_tokens=usage.get("prompt_tokens", 0),
            output_tokens=usage.get("completion_tokens", 0),
            raw=data,
            model=model,
            provider=self.provider_name,
        )

    async def is_available(self) -> bool:
        if not self.api_key or self.api_key in ("your_openrouter_key_here", "") or "mock" in self.api_key.lower():
            return True
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(
                    f"{self.base_url}/models",
                    headers={"Authorization": f"Bearer {self.api_key}"},
                )
                return resp.status_code == 200
        except Exception:
            return False
