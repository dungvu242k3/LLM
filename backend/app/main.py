"""FastAPI application entry point for LLM Evaluation Dashboard."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db
from app.api import models, test_cases, evaluations, reports, stats, chat

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle: create tables on startup."""
    logger.info("Starting LLM Evaluation Dashboard backend...")
    await init_db()
    logger.info("Database initialized successfully.")
    yield
    logger.info("Shutting down...")


app = FastAPI(
    title="LLM Evaluation Dashboard",
    description="API for benchmarking and evaluating Large Language Models",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers
app.include_router(models.router)
app.include_router(test_cases.router)
app.include_router(evaluations.router)
app.include_router(reports.router)
app.include_router(stats.router)
app.include_router(chat.router)


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "version": "1.0.0"}


@app.get("/api/providers")
async def list_available_providers():
    """List configured LLM providers and their availability."""
    from app.providers.registry import list_providers, get_provider

    results = []
    for name in list_providers():
        try:
            provider = get_provider(name)
            available = await provider.is_available()
            results.append({"name": name, "available": available})
        except Exception:
            results.append({"name": name, "available": False})

    return results
