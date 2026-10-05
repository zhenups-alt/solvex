import asyncio
from contextlib import asynccontextmanager, suppress

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app import models  # noqa: F401 - registers SQLAlchemy metadata
from app.api import router
from app.auth import router as auth_router
from app.config import get_settings
from app.db import create_tables, get_session
from app.paper_api import router as paper_router
from app.services.paper_worker import worker_loop

settings = get_settings()


@asynccontextmanager
async def lifespan(application: FastAPI):
    if settings.auto_create_tables:
        await create_tables()
    stop = asyncio.Event()
    worker = asyncio.create_task(worker_loop(stop))
    application.state.paper_worker = worker
    try:
        yield
    finally:
        stop.set()
        worker.cancel()
        with suppress(asyncio.CancelledError):
            await worker


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
app.include_router(auth_router)
app.include_router(paper_router)


@app.get("/ready")
async def readiness(request: Request, session: AsyncSession = Depends(get_session)) -> dict:
    worker = getattr(request.app.state, "paper_worker", None)
    if worker is None or worker.done():
        raise HTTPException(503, "Paper worker is not running")
    try:
        await asyncio.wait_for(session.execute(text("SELECT 1")), timeout=5)
    except (SQLAlchemyError, TimeoutError):
        raise HTTPException(503, "Database is not ready") from None
    return {"ok": True, "database": "ready", "paper_worker": "running"}


@app.get("/health")
async def health() -> dict:
    return {
        "ok": True,
        "service": "solvex-api",
        "environment": settings.environment,
        "gemini_configured": bool(settings.gemini_api_key),
        "execution_enabled": settings.execution_enabled,
        "jupiter_configured": bool(settings.jupiter_api_key),
        "vault_program_id": settings.vault_program_id,
        "paper_worker_enabled": True,
        "live_trading_available": False,
    }
