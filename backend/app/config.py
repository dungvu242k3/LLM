"""Application configuration loaded from environment variables."""

from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Settings loaded from .env file."""

    # App
    app_env: str = "development"
    database_url: str = "sqlite+aiosqlite:///./llm_eval.db"

    # OpenAI
    openai_api_key: Optional[str] = None

    # Gemini
    gemini_api_key: Optional[str] = None

    # Judge
    judge_provider: str = "openai"
    judge_model: str = ""

    # CORS
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
