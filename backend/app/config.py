"""Application configuration loaded from environment variables."""

from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Settings loaded from .env file."""

    # App
    app_env: str = "development"
    database_url: str = "sqlite+aiosqlite:///./llm_eval.db"

    # 9Router
    nine_router_api_key: Optional[str] = None
    nine_router_base_url: str = "http://localhost:20128/v1"

    # OpenRouter
    openrouter_api_key: Optional[str] = None
    openrouter_base_url: str = "https://openrouter.ai/api/v1"

    # OpenAI
    openai_api_key: Optional[str] = None

    # Gemini
    gemini_api_key: Optional[str] = None

    # Anthropic Claude
    claude_api_key: Optional[str] = None
    anthropic_api_key: Optional[str] = None

    # Judge
    judge_provider: str = "nine_router"
    judge_model: str = ""

    # CORS
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
