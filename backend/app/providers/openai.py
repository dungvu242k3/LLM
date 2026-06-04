"""OpenAI provider adapter."""

import time
import httpx
import logging

from app.config import settings
from app.providers.base import LLMProvider, LLMResponse

logger = logging.getLogger(__name__)


class OpenAIProvider(LLMProvider):
    """Provider adapter for OpenAI."""

    def __init__(self):
        self.api_key = settings.openai_api_key

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
        # Call direct OpenAI API using OPENAI_API_KEY
        use_direct = (
            self.api_key
            and self.api_key not in ("your_openai_key_here", "")
            and "mock" not in self.api_key.lower()
        )

        # For futuristic models, skip direct OpenAI because it will return 404
        real_models = ["gpt-4o", "gpt-4o-mini", "gpt-4", "gpt-3.5-turbo", "o3-mini"]
        if use_direct and model in real_models:
            start = time.time()
            try:
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
                    resp.raise_for_status()
                    data = resp.json()

                    latency_ms = int((time.time() - start) * 1000)
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
            except Exception as e:
                logger.error(f"Direct OpenAI call failed for model {model}: {e}")

        # Fallback to Mock if not configured or futuristic model
        from app.providers.mock import generate_mock_response
        return generate_mock_response(model, self.provider_name, messages)

    async def is_available(self) -> bool:
        # Check direct OpenAI key availability
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
