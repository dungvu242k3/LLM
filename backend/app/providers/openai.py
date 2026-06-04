"""OpenAI provider adapter."""

import time
import httpx
from app.config import settings
from app.providers.base import LLMProvider, LLMResponse

class OpenAIProvider(LLMProvider):
    """Provider adapter for OpenAI with automatic failover from 9Router to direct OpenAI key."""

    def __init__(self):
        self.api_key = settings.openai_api_key
        self.nine_router_key = settings.nine_router_api_key
        self.nine_router_base = settings.nine_router_base_url.rstrip("/")

    @property
    def provider_name(self) -> str:
        return "openai"

    async def generate(
        self,
        model: str,
        messages: list[dict],
        temperature: float = 0.2,
        max_tokens: int = 1024,
    ) -> LLMResponse:
        # 1. Try calling 9Router first if key is available
        if (
            self.nine_router_key
            and self.nine_router_key not in ("your_9router_key_here", "")
            and "mock" not in self.nine_router_key.lower()
        ):
            try:
                start = time.time()
                async with httpx.AsyncClient(timeout=120) as client:
                    resp = await client.post(
                        f"{self.nine_router_base}/chat/completions",
                        headers={
                            "Authorization": f"Bearer {self.nine_router_key}",
                            "Content-Type": "application/json",
                        },
                        json={
                            "model": model,
                            "messages": messages,
                            "temperature": temperature,
                            "max_tokens": max_tokens,
                        },
                    )
                    resp.raise_for_status()
                    data = resp.json()
                    usage = data.get("usage", {})
                    latency_ms = int((time.time() - start) * 1000)
                    return LLMResponse(
                        text=data["choices"][0]["message"]["content"],
                        latency_ms=latency_ms,
                        input_tokens=usage.get("prompt_tokens", 0),
                        output_tokens=usage.get("completion_tokens", 0),
                        raw=data,
                        model=model,
                        provider=self.provider_name,
                    )
            except Exception as e:
                import logging
                logging.getLogger(__name__).warning(
                    f"9Router request failed for {model}: {e}. Falling back to direct OpenAI API..."
                )

        # 2. Fallback: Call direct OpenAI API
        if not self.api_key or self.api_key in ("your_openai_key_here", "") or "mock" in self.api_key.lower():
            from app.providers.mock import generate_mock_response
            return generate_mock_response(model, self.provider_name, messages)

        start = time.time()

        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(
                "https://api.openai.com/v1/chat/completions",
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
        # Check if 9Router is configured and available
        if (
            self.nine_router_key
            and self.nine_router_key not in ("your_9router_key_here", "")
            and "mock" not in self.nine_router_key.lower()
        ):
            try:
                async with httpx.AsyncClient(timeout=10) as client:
                    resp = await client.get(
                        f"{self.nine_router_base}/models",
                        headers={"Authorization": f"Bearer {self.nine_router_key}"},
                    )
                    if resp.status_code == 200:
                        return True
            except Exception:
                pass

        # If 9Router fails or is not configured, check direct OpenAI key
        if not self.api_key or self.api_key in ("your_openai_key_here", "") or "mock" in self.api_key.lower():
            return True
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(
                    "https://api.openai.com/v1/models",
                    headers={"Authorization": f"Bearer {self.api_key}"},
                )
                return resp.status_code == 200
        except Exception:
            return False
