"""Database seeding script to populate models and test cases."""

import json
import asyncio
import os
import sys
from sqlalchemy import select, delete

# Ensure parent directory is in sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import async_session, init_db
from app.models import TestCase, Model

# Path to datasets
DATASET_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "datasets",
    "llm_eval_mixed.json"
)

# Define default models (Latest 2026 SOTA models)
default_models = [
    {
        "provider": "nine_router",
        "model_id": "qwen/qwen-2.5-coder",
        "display_name": "Qwen 2.5 Coder (9Router)",
        "context_length": 128000,
        "input_price_per_1m_tokens": 0.0,
        "output_price_per_1m_tokens": 0.0,
        "is_active": True
    },
    {
        "provider": "nine_router",
        "model_id": "qwen/qwen-3.7-max",
        "display_name": "Qwen 3.7 Max (9Router)",
        "context_length": 128000,
        "input_price_per_1m_tokens": 1.00,
        "output_price_per_1m_tokens": 4.00,
        "is_active": True
    },
    {
        "provider": "nine_router",
        "model_id": "qwen/qwen-3.7-plus",
        "display_name": "Qwen 3.7 Plus (9Router)",
        "context_length": 128000,
        "input_price_per_1m_tokens": 0.40,
        "output_price_per_1m_tokens": 1.60,
        "is_active": True
    },
    {
        "provider": "nine_router",
        "model_id": "qwen/qwen-3.6-plus",
        "display_name": "Qwen 3.6 Plus (9Router)",
        "context_length": 128000,
        "input_price_per_1m_tokens": 0.40,
        "output_price_per_1m_tokens": 2.00,
        "is_active": True
    },
    {
        "provider": "nine_router",
        "model_id": "qwen/qwen-3.6-35b-coder",
        "display_name": "Qwen 3.6 35B Coder (9Router)",
        "context_length": 128000,
        "input_price_per_1m_tokens": 0.0,
        "output_price_per_1m_tokens": 0.0,
        "is_active": True
    },
    {
        "provider": "nine_router",
        "model_id": "google/gemini-flash-1.5",
        "display_name": "Gemini 1.5 Flash (9Router)",
        "context_length": 1048576,
        "input_price_per_1m_tokens": 0.075,
        "output_price_per_1m_tokens": 0.3,
        "is_active": True
    },
    {
        "provider": "openai",
        "model_id": "gpt-4o-mini",
        "display_name": "GPT-4o Mini",
        "context_length": 128000,
        "input_price_per_1m_tokens": 0.15,
        "output_price_per_1m_tokens": 0.60,
        "is_active": True
    },
    {
        "provider": "openai",
        "model_id": "gpt-4o",
        "display_name": "GPT-4o",
        "context_length": 128000,
        "input_price_per_1m_tokens": 2.50,
        "output_price_per_1m_tokens": 10.00,
        "is_active": True
    },
    {
        "provider": "openai",
        "model_id": "gpt-5.5",
        "display_name": "GPT-5.5 Flagship",
        "context_length": 256000,
        "input_price_per_1m_tokens": 5.00,
        "output_price_per_1m_tokens": 30.00,
        "is_active": True
    },
    {
        "provider": "openai",
        "model_id": "gpt-5.4-mini",
        "display_name": "GPT-5.4 Mini",
        "context_length": 128000,
        "input_price_per_1m_tokens": 0.75,
        "output_price_per_1m_tokens": 4.50,
        "is_active": True
    },
    {
        "provider": "openai",
        "model_id": "gpt-5.4-pro",
        "display_name": "GPT-5.4 Pro",
        "context_length": 256000,
        "input_price_per_1m_tokens": 30.00,
        "output_price_per_1m_tokens": 180.00,
        "is_active": True
    },
    {
        "provider": "openai",
        "model_id": "o3-mini",
        "display_name": "o3-mini",
        "context_length": 200000,
        "input_price_per_1m_tokens": 1.10,
        "output_price_per_1m_tokens": 4.40,
        "is_active": True
    },
    {
        "provider": "gemini",
        "model_id": "gemini-1.5-flash",
        "display_name": "Gemini 1.5 Flash",
        "context_length": 1048576,
        "input_price_per_1m_tokens": 0.075,
        "output_price_per_1m_tokens": 0.30,
        "is_active": True
    },
    {
        "provider": "gemini",
        "model_id": "gemini-1.5-pro",
        "display_name": "Gemini 1.5 Pro",
        "context_length": 2097152,
        "input_price_per_1m_tokens": 1.25,
        "output_price_per_1m_tokens": 5.00,
        "is_active": True
    },
    {
        "provider": "gemini",
        "model_id": "gemini-2.0-flash",
        "display_name": "Gemini 2.0 Flash",
        "context_length": 1048576,
        "input_price_per_1m_tokens": 0.075,
        "output_price_per_1m_tokens": 0.30,
        "is_active": True
    },
    {
        "provider": "gemini",
        "model_id": "gemini-3.5-flash",
        "display_name": "Gemini 3.5 Flash",
        "context_length": 2097152,
        "input_price_per_1m_tokens": 1.50,
        "output_price_per_1m_tokens": 9.00,
        "is_active": True
    },
    {
        "provider": "gemini",
        "model_id": "gemini-3.1-pro",
        "display_name": "Gemini 3.1 Pro",
        "context_length": 2097152,
        "input_price_per_1m_tokens": 2.00,
        "output_price_per_1m_tokens": 12.00,
        "is_active": True
    },
    {
        "provider": "gemini",
        "model_id": "gemini-3.1-flash",
        "display_name": "Gemini 3.1 Flash",
        "context_length": 1048576,
        "input_price_per_1m_tokens": 0.075,
        "output_price_per_1m_tokens": 0.30,
        "is_active": True
    },
    {
        "provider": "claude",
        "model_id": "claude-3-5-sonnet-20241022",
        "display_name": "Claude 3.5 Sonnet",
        "context_length": 200000,
        "input_price_per_1m_tokens": 3.00,
        "output_price_per_1m_tokens": 15.00,
        "is_active": True
    },
    {
        "provider": "claude",
        "model_id": "claude-3-5-haiku-20241022",
        "display_name": "Claude 3.5 Haiku",
        "context_length": 200000,
        "input_price_per_1m_tokens": 0.80,
        "output_price_per_1m_tokens": 4.00,
        "is_active": True
    },
    {
        "provider": "claude",
        "model_id": "claude-opus-4.8",
        "display_name": "Claude 4.8 Opus",
        "context_length": 200000,
        "input_price_per_1m_tokens": 5.00,
        "output_price_per_1m_tokens": 25.00,
        "is_active": True
    },
    {
        "provider": "claude",
        "model_id": "claude-opus-4.6",
        "display_name": "Claude 4.6 Opus",
        "context_length": 200000,
        "input_price_per_1m_tokens": 5.00,
        "output_price_per_1m_tokens": 25.00,
        "is_active": True
    },
    {
        "provider": "nine_router",
        "model_id": "deepseek/deepseek-chat",
        "display_name": "DeepSeek V3 (9Router)",
        "context_length": 64000,
        "input_price_per_1m_tokens": 0.14,
        "output_price_per_1m_tokens": 0.28,
        "is_active": True
    },
    {
        "provider": "nine_router",
        "model_id": "deepseek/deepseek-v4-pro",
        "display_name": "DeepSeek V4 Pro (9Router)",
        "context_length": 1000000,
        "input_price_per_1m_tokens": 0.435,
        "output_price_per_1m_tokens": 0.87,
        "is_active": True
    },
    {
        "provider": "nine_router",
        "model_id": "deepseek/deepseek-v4-flash",
        "display_name": "DeepSeek V4 Flash (9Router)",
        "context_length": 1000000,
        "input_price_per_1m_tokens": 0.14,
        "output_price_per_1m_tokens": 0.28,
        "is_active": True
    },
    {
        "provider": "nine_router",
        "model_id": "deepseek/deepseek-r1:free",
        "display_name": "DeepSeek R1 Free (9Router)",
        "context_length": 16384,
        "input_price_per_1m_tokens": 0.0,
        "output_price_per_1m_tokens": 0.0,
        "is_active": True
    },
    {
        "provider": "nine_router",
        "model_id": "meta-llama/llama-3.3-70b-instruct:free",
        "display_name": "Llama 3.3 70B Free (9Router)",
        "context_length": 131072,
        "input_price_per_1m_tokens": 0.0,
        "output_price_per_1m_tokens": 0.0,
        "is_active": True
    },
    {
        "provider": "nine_router",
        "model_id": "meta-llama/llama-4-maverick",
        "display_name": "Llama 4 Maverick (9Router)",
        "context_length": 1000000,
        "input_price_per_1m_tokens": 0.15,
        "output_price_per_1m_tokens": 0.60,
        "is_active": True
    },
    {
        "provider": "nine_router",
        "model_id": "meta-llama/llama-4-scout",
        "display_name": "Llama 4 Scout (9Router)",
        "context_length": 10000000,
        "input_price_per_1m_tokens": 0.08,
        "output_price_per_1m_tokens": 0.30,
        "is_active": True
    },
    {
        "provider": "nine_router",
        "model_id": "google/gemini-2.0-flash-thinking-exp:free",
        "display_name": "Gemini 2.0 Thinking Free (9Router)",
        "context_length": 40000,
        "input_price_per_1m_tokens": 0.0,
        "output_price_per_1m_tokens": 0.0,
        "is_active": True
    }
]

async def seed():
    print(f"Loading test cases from: {DATASET_PATH}")
    if not os.path.exists(DATASET_PATH):
        print(f"Error: Dataset file not found at {DATASET_PATH}")
        return

    with open(DATASET_PATH, 'r', encoding='utf-8') as f:
        test_cases_data = json.load(f)

    await init_db()
    async with async_session() as session:
        # Clear existing models and test cases to ensure fresh seed
        print("Clearing existing models and test cases...")
        await session.execute(delete(TestCase))
        await session.execute(delete(Model))
        await session.commit()

        # Seed new test cases
        for tc in test_cases_data:
            session.add(TestCase(
                category=tc["category"],
                question=tc["question"],
                expected_answer=tc.get("expected_answer"),
                difficulty=tc.get("difficulty"),
                language=tc.get("language", "en"),
                tags=tc.get("tags"),
                rubric=tc.get("rubric")
            ))
        print(f"Added {len(test_cases_data)} test cases.")

        # Seed new models
        for model_data in default_models:
            session.add(Model(**model_data))
        print(f"Added {len(default_models)} default models.")
            
        await session.commit()
    print("Database seeding completed successfully!")

if __name__ == "__main__":
    asyncio.run(seed())
