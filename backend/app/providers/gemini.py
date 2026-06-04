"""Google Gemini provider adapter."""

import time
import httpx
from app.config import settings
from app.providers.base import LLMProvider, LLMResponse

class GeminiProvider(LLMProvider):
    """Provider adapter for Google Gemini."""

    def __init__(self):
        self.api_key = settings.gemini_api_key

    @property
    def provider_name(self) -> str:
        return "gemini"

    async def generate(
        self,
        model: str,
        messages: list[dict],
        temperature: float = 0.2,
        max_tokens: int = 1024,
    ) -> LLMResponse:
        # Standardize model names for Gemini (e.g. gemini-1.5-flash)
        model_name = model
        if not model_name.startswith("models/"):
            model_name = f"models/{model_name}"

        real_models = ["models/gemini-1.5-flash", "models/gemini-1.5-pro", "models/gemini-2.0-flash", "models/gemini-2.0-flash-thinking-exp"]
        if model_name not in real_models or not self.api_key or self.api_key in ("your_gemini_key_here", "") or "mock" in self.api_key.lower():
            from app.providers.mock import generate_mock_response
            return generate_mock_response(model, self.provider_name, messages)

        # Convert OpenAI-style messages to Gemini contents format
        contents = []
        for m in messages:
            role = "user" if m["role"] == "user" else "model"
            contents.append({
                "role": role,
                "parts": [{"text": m["content"]}]
            })

        start = time.time()

        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(
                f"https://generativelanguage.googleapis.com/v1beta/{model_name}:generateContent?key={self.api_key}",
                headers={"Content-Type": "application/json"},
                json={
                    "contents": contents,
                    "generationConfig": {
                        "temperature": temperature,
                        "maxOutputTokens": max_tokens,
                    }
                },
            )

        latency_ms = int((time.time() - start) * 1000)
        resp.raise_for_status()
        data = resp.json()

        # Parse response text
        text = ""
        try:
            text = data["candidates"][0]["content"]["parts"][0]["text"]
        except (KeyError, IndexError):
            text = "ERROR: Failed to parse content from Gemini response."

        # Estimate tokens
        input_chars = sum(len(m["content"]) for m in messages)
        output_chars = len(text)
        input_tokens = int(input_chars / 4)
        output_tokens = int(output_chars / 4)

        return LLMResponse(
            text=text,
            latency_ms=latency_ms,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            raw=data,
            model=model,
            provider=self.provider_name,
        )

    async def is_available(self) -> bool:
        if not self.api_key or self.api_key in ("your_gemini_key_here", "") or "mock" in self.api_key.lower():
            return True
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(
                    f"https://generativelanguage.googleapis.com/v1beta/models?key={self.api_key}"
                )
                return resp.status_code == 200
        except Exception:
            return False
