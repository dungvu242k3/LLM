"""Anthropic Claude provider adapter."""

import time
import httpx
from app.config import settings
from app.providers.base import LLMProvider, LLMResponse

class ClaudeProvider(LLMProvider):
    """Provider adapter for Anthropic Claude."""

    def __init__(self):
        # We might use an environment variable or openrouter key as fallback
        self.api_key = getattr(settings, "claude_api_key", None) or getattr(settings, "anthropic_api_key", None)

    @property
    def provider_name(self) -> str:
        return "claude"

    async def generate(
        self,
        model: str,
        messages: list[dict],
        temperature: float = 0.2,
        max_tokens: int = 1024,
    ) -> LLMResponse:
        # Since we are using mock by default if API key is not configured, fall back to mock
        if not self.api_key or "mock" in str(self.api_key).lower():
            from app.providers.mock import generate_mock_response
            return generate_mock_response(model, self.provider_name, messages)

        # Standardize OpenAI message format to Anthropic Messages format
        system_prompt = ""
        anthropic_messages = []
        for m in messages:
            if m["role"] == "system":
                system_prompt = m["content"]
            else:
                role = "user" if m["role"] == "user" else "assistant"
                anthropic_messages.append({
                    "role": role,
                    "content": m["content"]
                })

        start = time.time()

        async with httpx.AsyncClient(timeout=120) as client:
            payload = {
                "model": model,
                "messages": anthropic_messages,
                "max_tokens": max_tokens,
                "temperature": temperature,
            }
            if system_prompt:
                payload["system"] = system_prompt

            resp = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": self.api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json=payload,
            )

        latency_ms = int((time.time() - start) * 1000)
        resp.raise_for_status()
        data = resp.json()

        text = data["content"][0]["text"]
        usage = data.get("usage", {})

        return LLMResponse(
            text=text,
            latency_ms=latency_ms,
            input_tokens=usage.get("input_tokens", 0),
            output_tokens=usage.get("output_tokens", 0),
            raw=data,
            model=model,
            provider=self.provider_name,
        )

    async def is_available(self) -> bool:
        if not self.api_key or "mock" in str(self.api_key).lower():
            return True
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(
                    "https://api.anthropic.com/v1/messages",
                    headers={
                        "x-api-key": self.api_key,
                        "anthropic-version": "2023-06-01",
                        "content-type": "application/json",
                    },
                    json={
                        "model": "claude-3-5-sonnet-20241022",
                        "max_tokens": 1,
                        "messages": [{"role": "user", "content": "Ping"}]
                    }
                )
                return resp.status_code == 200
        except Exception:
            return False
