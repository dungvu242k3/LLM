"""9Router provider adapter — OpenAI-compatible API with smart fallback routing."""

import time
import httpx

from app.config import settings
from app.providers.base import LLMProvider, LLMResponse


class NineRouterProvider(LLMProvider):
    """Provider adapter for 9Router (local or cloud)."""

    def __init__(self):
        self.api_key = settings.nine_router_api_key
        self.base_url = settings.nine_router_base_url.rstrip("/")

    @property
    def provider_name(self) -> str:
        return "nine_router"

    async def generate(
        self,
        model: str,
        messages: list[dict],
        temperature: float = 0.2,
        max_tokens: int = 1024,
    ) -> LLMResponse:
        if not self.api_key or self.api_key in ("your_9router_key_here", "") or "mock" in self.api_key.lower():
            from app.providers.mock import generate_mock_response
            return generate_mock_response(model, self.provider_name, messages)

        start = time.time()

        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(
                f"{self.base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
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
        if not self.api_key or self.api_key in ("your_9router_key_here", "") or "mock" in self.api_key.lower():
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
