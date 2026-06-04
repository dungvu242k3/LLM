"""API routes for LLM model CRUD operations."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Model
from app.schemas.model import ModelCreate, ModelUpdate, ModelResponse

router = APIRouter(prefix="/api/models", tags=["models"])


@router.get("", response_model=list[ModelResponse])
async def list_models(db: AsyncSession = Depends(get_db)):
    """List all configured LLM models."""
    result = await db.execute(select(Model).order_by(Model.created_at.desc()))
    return result.scalars().all()


@router.get("/{model_id}", response_model=ModelResponse)
async def get_model(model_id: str, db: AsyncSession = Depends(get_db)):
    """Get a single model by ID."""
    result = await db.execute(select(Model).where(Model.id == model_id))
    model = result.scalar_one_or_none()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    return model


@router.post("", response_model=ModelResponse, status_code=201)
async def create_model(data: ModelCreate, db: AsyncSession = Depends(get_db)):
    """Create a new model configuration."""
    model = Model(**data.model_dump())
    db.add(model)
    await db.flush()
    await db.refresh(model)
    return model


@router.put("/{model_id}", response_model=ModelResponse)
async def update_model(
    model_id: str, data: ModelUpdate, db: AsyncSession = Depends(get_db)
):
    """Update an existing model configuration."""
    result = await db.execute(select(Model).where(Model.id == model_id))
    model = result.scalar_one_or_none()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(model, key, value)

    await db.flush()
    await db.refresh(model)
    return model


@router.delete("/{model_id}", status_code=204)
async def delete_model(model_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a model configuration."""
    result = await db.execute(select(Model).where(Model.id == model_id))
    model = result.scalar_one_or_none()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    await db.delete(model)
