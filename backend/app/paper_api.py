from datetime import UTC, datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import Field
from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import to_domain_profile
from app.auth import authenticated_wallet, require_owner, utc
from app.config import get_settings
from app.db import get_session
from app.domain.types import StrictModel
from app.models import PaperAccountRecord, PaperEventRecord, PaperSessionRecord, RiskProfileRecord
from app.services.paper_engine import (
    FEE_RATE,
    FIXED_FEE_USD,
    SLIPPAGE_BPS,
    STRATEGY_VERSION,
    PaperState,
    metrics,
    new_state,
)
from app.services.paper_worker import run_account

router = APIRouter(prefix="/api/v1/paper", tags=["autonomous paper portfolio"])


class StartPaperRequest(StrictModel):
    initial_usd: Decimal = Field(gt=0, le=1_000_000)
    interval_seconds: int = Field(default=300, ge=60, le=3600)
    acknowledge_virtual: Literal[True]
    decision_source: Literal["allocation", "gemini"] = "allocation"
    language: Literal["en", "ru"] = "en"


class FinishPaperRequest(StrictModel):
    session_start_version: int = Field(ge=0)
    acknowledge_archive: Literal[True]


async def current_start_version(
    session: AsyncSession, wallet: str, through_version: int | None = None,
) -> int:
    query = select(func.max(PaperSessionRecord.end_version)).where(
        PaperSessionRecord.wallet_address == wallet,
    )
    if through_version is not None:
        query = query.where(PaperSessionRecord.end_version < through_version)
    last = await session.scalar(query)
    return last + 1 if last is not None else 0


def serialize(row: PaperAccountRecord, start_version: int = 0) -> dict:
    state = PaperState.model_validate(row.state)
    return {
        "wallet_address": row.wallet_address,
        "mode": "paper",
        "status": row.status,
        "version": row.version,
        "session_start_version": start_version,
        "started_at": utc(row.created_at).isoformat(),
        "state": state.model_dump(mode="json"),
        "metrics": metrics(state),
        "next_run_at": utc(row.next_run_at).isoformat(),
        "strategy": STRATEGY_VERSION,
        "cost_model": {
            "fee_bps": int(FEE_RATE * 10000),
            "fixed_fee_usd": str(FIXED_FEE_USD),
            "slippage_bps": SLIPPAGE_BPS,
        },
        "live_execution_allowed": False,
    }


def serialize_session(row: PaperSessionRecord) -> dict:
    return {
        "id": str(row.id),
        "start_version": row.start_version,
        "end_version": row.end_version,
        "completed_at": utc(row.completed_at).isoformat(),
        "snapshot": row.snapshot,
    }


@router.get("/{wallet_address}")
async def get_paper(
    wallet_address: str,
    owner: str = Depends(authenticated_wallet),
    session: AsyncSession = Depends(get_session),
):
    require_owner(owner, wallet_address)
    row = await session.get(PaperAccountRecord, wallet_address)
    return {
        "account": serialize(row, await current_start_version(session, wallet_address, row.version))
        if row and row.status != "completed" else None,
    }


@router.get("/{wallet_address}/sessions")
async def get_sessions(
    wallet_address: str,
    limit: int = Query(20, ge=1, le=100),
    before_version: int | None = Query(None, ge=0),
    owner: str = Depends(authenticated_wallet),
    session: AsyncSession = Depends(get_session),
):
    require_owner(owner, wallet_address)
    query = select(PaperSessionRecord).where(PaperSessionRecord.wallet_address == wallet_address)
    if before_version is not None:
        query = query.where(PaperSessionRecord.end_version < before_version)
    rows = (
        await session.scalars(
            query.order_by(PaperSessionRecord.end_version.desc()).limit(limit + 1)
        )
    ).all()
    return {
        "items": [serialize_session(row) for row in rows[:limit]],
        "next_before_version": rows[limit - 1].end_version if len(rows) > limit else None,
    }


@router.get("/{wallet_address}/events")
async def get_events(
    wallet_address: str,
    limit: int = Query(50, ge=1, le=200),
    session_id: UUID | None = None,
    before_version: int | None = Query(None, ge=0),
    owner: str = Depends(authenticated_wallet),
    session: AsyncSession = Depends(get_session),
):
    require_owner(owner, wallet_address)
    query = select(PaperEventRecord).where(PaperEventRecord.wallet_address == wallet_address)
    if session_id is not None:
        archived = await session.get(PaperSessionRecord, session_id)
        if archived is None or archived.wallet_address != wallet_address:
            raise HTTPException(404, "Archived session not found")
        query = query.where(
            PaperEventRecord.version >= archived.start_version,
            PaperEventRecord.version <= archived.end_version,
        )
    else:
        query = query.where(
            PaperEventRecord.version >= await current_start_version(session, wallet_address),
        )
    if before_version is not None:
        query = query.where(PaperEventRecord.version < before_version)
    rows = (
        await session.scalars(query.order_by(PaperEventRecord.version.desc()).limit(limit + 1))
    ).all()
    return {
        "items": [{"id": str(row.id), "version": row.version, **row.data} for row in rows[:limit]],
        "next_before_version": rows[limit - 1].version if len(rows) > limit else None,
    }


@router.post("/{wallet_address}/start", status_code=201)
async def start_paper(
    wallet_address: str,
    payload: StartPaperRequest,
    owner: str = Depends(authenticated_wallet),
    session: AsyncSession = Depends(get_session),
):
    require_owner(owner, wallet_address)
    row = await session.get(PaperAccountRecord, wallet_address)
    if row and row.status != "completed":
        raise HTTPException(409, "Portfolio already exists; resume it or end the current session")
    if payload.decision_source == "gemini" and not get_settings().gemini_api_key:
        raise HTTPException(409, "Gemini API key is missing; select the allocation strategy")
    profile = await session.scalar(
        select(RiskProfileRecord).where(
            RiskProfileRecord.wallet_address == wallet_address,
        )
    )
    if profile is None:
        raise HTTPException(409, "Save your risk limits before starting the agent")
    try:
        state = new_state(to_domain_profile(profile), payload.initial_usd, payload.interval_seconds)
    except ValueError as error:
        raise HTTPException(422, str(error)) from error
    now = datetime.now(UTC)
    version = row.version + 1 if row else 0
    values = {
        "status": "running",
        "version": version,
        "state": state.model_copy(update={
            "decision_source": payload.decision_source,
            "language": payload.language,
        }).model_dump(mode="json"),
        "next_run_at": now,
        "created_at": now,
    }
    if row:
        # Never reset wallet versions: an old in-flight worker must not match a new session.
        changed = await session.execute(update(PaperAccountRecord).where(
            PaperAccountRecord.wallet_address == wallet_address,
            PaperAccountRecord.version == row.version,
            PaperAccountRecord.status == "completed",
        ).values(**values))
        if changed.rowcount != 1:
            await session.rollback()
            raise HTTPException(409, "Another session was started; refresh and retry")
    else:
        row = PaperAccountRecord(wallet_address=wallet_address, **values)
        session.add(row)
    session.add(
        PaperEventRecord(
            wallet_address=wallet_address,
            version=version,
            data={
                "kind": "started",
                "mode": "paper",
                "status": "running",
                "at": datetime.now(UTC).isoformat(),
                "initial_usd": str(payload.initial_usd),
                "live_execution_allowed": False,
            },
        )
    )
    try:
        await session.commit()
    except IntegrityError as error:
        await session.rollback()
        raise HTTPException(409, "Portfolio already exists") from error
    await session.refresh(row)
    return {"account": serialize(row, version)}


@router.post("/{wallet_address}/finish")
async def finish_paper(
    wallet_address: str,
    payload: FinishPaperRequest,
    owner: str = Depends(authenticated_wallet),
    session: AsyncSession = Depends(get_session),
):
    require_owner(owner, wallet_address)
    # Retrying an old confirmation is safe, even after another tab starts a new session.
    existing = await session.scalar(select(PaperSessionRecord).where(
        PaperSessionRecord.wallet_address == wallet_address,
        PaperSessionRecord.start_version == payload.session_start_version,
    ))
    if existing:
        return {"session": serialize_session(existing)}
    row = await session.get(PaperAccountRecord, wallet_address)
    if row is None or row.status == "completed":
        raise HTTPException(409, "No active paper session to end")
    start_version = await current_start_version(session, wallet_address, row.version)
    if payload.session_start_version != start_version:
        raise HTTPException(409, "The session changed; refresh before ending it")
    now = datetime.now(UTC)
    version = row.version
    snapshot = serialize(row, start_version)
    snapshot.update(status="completed", version=version + 1)
    changed = await session.execute(update(PaperAccountRecord).where(
        PaperAccountRecord.wallet_address == wallet_address,
        PaperAccountRecord.version == version,
        PaperAccountRecord.status.in_(["running", "paused"]),
    ).values(status="completed", version=version + 1))
    if changed.rowcount != 1:
        await session.rollback()
        raise HTTPException(409, "A cycle just completed; refresh and retry ending the session")
    archived = PaperSessionRecord(
        wallet_address=wallet_address, start_version=start_version, end_version=version + 1,
        snapshot=snapshot, completed_at=now,
    )
    session.add(archived)
    session.add(PaperEventRecord(wallet_address=wallet_address, version=version + 1, data={
        "kind": "completed", "mode": "paper", "status": "completed", "at": now.isoformat(),
        "message": "Session ended and archived at the last recorded price. No assets were sold.",
        "metrics": snapshot["metrics"], "live_execution_allowed": False,
    }))
    await session.commit()
    await session.refresh(archived)
    return {"session": serialize_session(archived)}


@router.post("/{wallet_address}/{action}")
async def control_paper(
    wallet_address: str,
    action: Literal["pause", "resume", "run-now"],
    owner: str = Depends(authenticated_wallet),
    session: AsyncSession = Depends(get_session),
):
    require_owner(owner, wallet_address)
    row = await session.get(PaperAccountRecord, wallet_address)
    if row is None:
        raise HTTPException(404, "Create a virtual portfolio first")
    if row.status == "completed":
        raise HTTPException(409, "This session has ended; start a new virtual portfolio")
    if action == "run-now":
        # Do not bypass the configured interval or create duplicate manual ticks.
        await session.rollback()
        processed = await run_account(wallet_address)
        return {"processed": processed}
    status = "paused" if action == "pause" else "running"
    if row.status == status:
        return {
            "account": serialize(
                row, await current_start_version(session, wallet_address, row.version),
            ),
        }
    version = row.version
    state = PaperState.model_validate(row.state)
    if action == "resume":
        profile = await session.scalar(
            select(RiskProfileRecord).where(
                RiskProfileRecord.wallet_address == wallet_address,
            )
        )
        if profile is None or not profile.enabled or profile.investment_cap_usd < state.initial_usd:
            raise HTTPException(409, "Enable a profile with a cap covering the starting balance")
        state.profile = to_domain_profile(profile)
    changed = await session.execute(
        update(PaperAccountRecord)
        .where(
            PaperAccountRecord.wallet_address == wallet_address,
            PaperAccountRecord.version == version,
        )
        .values(status=status, version=version + 1, state=state.model_dump(mode="json"))
    )
    if changed.rowcount != 1:
        await session.rollback()
        raise HTTPException(409, "A cycle just completed; refresh and retry")
    session.add(
        PaperEventRecord(
            wallet_address=wallet_address,
            version=version + 1,
            data={
                "kind": action,
                "status": status,
                "mode": "paper",
                "at": datetime.now(UTC).isoformat(),
                "live_execution_allowed": False,
            },
        )
    )
    await session.commit()
    await session.refresh(row)
    return {
        "account": serialize(
            row, await current_start_version(session, wallet_address, row.version),
        ),
    }
