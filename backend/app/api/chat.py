"""API routes for real-time model chatting."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field

from app.database import get_db
from app.models import Model
from app.providers.registry import get_provider

router = APIRouter(prefix="/api/chat", tags=["chat"])


class ChatMessage(BaseModel):
    """A single message within the chat history."""
    role: str = Field(..., description="Role of the message author (user, assistant, system)")
    content: str = Field(..., description="Content of the message")


class ChatRequest(BaseModel):
    """Schema for chat requests."""
    model_id: str = Field(..., description="Database ID of the model to chat with")
    messages: list[ChatMessage] = Field(..., description="Conversation history")
    temperature: float = Field(0.7, description="Sampling temperature")
    max_tokens: int = Field(1024, description="Maximum number of tokens to generate")


class ChatResponse(BaseModel):
    """Schema for chat responses containing output text and execution statistics."""
    text: str
    latency_ms: int
    input_tokens: int
    output_tokens: int
    provider: str
    model: str


@router.post("", response_model=ChatResponse)
async def chat_with_model(data: ChatRequest, db: AsyncSession = Depends(get_db)):
    """Send a chat request directly to a model and get a response."""
    # Find the model configuration in the database
    result = await db.execute(select(Model).where(Model.id == data.model_id))
    model = result.scalar_one_or_none()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    if not model.is_active:
        raise HTTPException(status_code=400, detail="Model is inactive")

    # Get provider adapter
    try:
        provider = get_provider(model.provider)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Convert Pydantic messages to list[dict]
    messages_dict = [{"role": msg.role, "content": msg.content} for msg in data.messages]

    try:
        response = await provider.generate(
            model=model.model_id,
            messages=messages_dict,
            temperature=data.temperature,
            max_tokens=data.max_tokens,
        )
        return ChatResponse(
            text=response.text,
            latency_ms=response.latency_ms,
            input_tokens=response.input_tokens,
            output_tokens=response.output_tokens,
            provider=response.provider,
            model=response.model,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate response: {str(e)}")
