from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import models  # noqa: F401 - registers SQLAlchemy metadata
from app.api import router
from app.config import get_settings
from app.db import create_tables

settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    if settings.auto_create_tables:
        await create_tables()
    yield


app = FastAPI(
    title="Solvex API",
    version="0.1.0",
    description="Fail-closed AI proposal, Shariah policy, and risk decision pipeline.",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(router)


@app.get("/health")
async def health() -> dict:
    return {
        "ok": True,
        "service": "solvex-api",
        "environment": settings.environment,
        "execution_enabled": settings.execution_enabled,
        "jupiter_configured": bool(settings.jupiter_api_key),
        "vault_program_id": settings.vault_program_id,
    }
