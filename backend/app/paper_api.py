from datetime import UTC, datetime
from decimal import Decimal
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import Field
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import to_domain_profile
from app.auth import authenticated_wallet, require_owner, utc
from app.config import get_settings
from app.db import get_session
from app.domain.types import StrictModel
from app.models import PaperAccountRecord, PaperEventRecord, RiskProfileRecord
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


def serialize(row: PaperAccountRecord) -> dict:
    state = PaperState.model_validate(row.state)
    return {
        "wallet_address": row.wallet_address,
        "mode": "paper",
        "status": row.status,
        "version": row.version,
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


@router.get("/{wallet_address}")
async def get_paper(
    wallet_address: str,
    owner: str = Depends(authenticated_wallet),
    session: AsyncSession = Depends(get_session),
):
    require_owner(owner, wallet_address)
    row = await session.get(PaperAccountRecord, wallet_address)
    return {"account": serialize(row) if row else None}


@router.get("/{wallet_address}/events")
async def get_events(
    wallet_address: str,
    limit: int = Query(50, ge=1, le=200),
    owner: str = Depends(authenticated_wallet),
    session: AsyncSession = Depends(get_session),
):
    require_owner(owner, wallet_address)
    rows = (
        await session.scalars(
            select(PaperEventRecord)
            .where(
                PaperEventRecord.wallet_address == wallet_address,
            )
            .order_by(PaperEventRecord.version.desc())
            .limit(limit)
        )
    ).all()
    return {"items": [{"id": str(row.id), "version": row.version, **row.data} for row in rows]}


@router.post("/{wallet_address}/start", status_code=201)
async def start_paper(
    wallet_address: str,
    payload: StartPaperRequest,
    owner: str = Depends(authenticated_wallet),
    session: AsyncSession = Depends(get_session),
):
    require_owner(owner, wallet_address)
    if await session.get(PaperAccountRecord, wallet_address):
        raise HTTPException(409, "Portfolio already exists; resume it instead of resetting history")
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
    row = PaperAccountRecord(
        wallet_address=wallet_address,
        status="running",
        version=0,
        state=state.model_copy(
            update={
                "decision_source": payload.decision_source,
                "language": payload.language,
            }
        ).model_dump(mode="json"),
        next_run_at=datetime.now(UTC),
    )
    session.add(row)
    session.add(
        PaperEventRecord(
            wallet_address=wallet_address,
            version=0,
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
    return {"account": serialize(row)}


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
    if action == "run-now":
        # Do not bypass the configured interval or create duplicate manual ticks.
        await session.rollback()
        processed = await run_account(wallet_address)
        return {"processed": processed}
    status = "paused" if action == "pause" else "running"
    if row.status == status:
        return {"account": serialize(row)}
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
    return {"account": serialize(row)}
