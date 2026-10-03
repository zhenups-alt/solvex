from datetime import UTC, datetime
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import authenticated_wallet, require_owner
from app.config import get_settings
from app.db import get_session
from app.domain.types import (
    DecisionEvaluation,
    PortfolioSnapshot,
    RiskLevel,
    RiskProfile,
    TradeProposal,
)
from app.models import DecisionLogRecord, PaperAccountRecord, PaperEventRecord, RiskProfileRecord
from app.policy.methodology import METHODOLOGY
from app.services.decision_pipeline import DecisionPipeline
from app.services.gemini_agent import GeminiPortfolioAgent
from app.services.market_data import MarketDataUnavailable, SolMarketDataService
from app.services.shariah_engine import ShariahPolicyEngine

router = APIRouter(prefix="/api/v1")
pipeline = DecisionPipeline()


class ProfileResponse(RiskProfile):
    model_config = ConfigDict(from_attributes=True, extra="forbid")
    id: UUID


class DecisionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    wallet_address: str
    proposal: TradeProposal
    snapshot: PortfolioSnapshot


class AgentAnalysisRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    wallet_address: str
    snapshot: PortfolioSnapshot
    market_context: dict
    language: Literal["en", "ru"] = "en"


class SimulationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    wallet_address: str


def to_domain_profile(record: RiskProfileRecord) -> RiskProfile:
    return RiskProfile(
        wallet_address=record.wallet_address,
        risk_level=RiskLevel(record.risk_level),
        investment_cap_usd=record.investment_cap_usd,
        max_single_trade_usd=record.max_single_trade_usd,
        max_daily_turnover_usd=record.max_daily_turnover_usd,
        max_slippage_bps=record.max_slippage_bps,
        max_drawdown_pct=record.max_drawdown_pct,
        enabled=record.enabled,
    )


@router.get("/policy/methodology")
async def get_methodology() -> dict:
    return METHODOLOGY


@router.get("/market/sol")
async def get_sol_market_data() -> dict:
    try:
        snapshot = await SolMarketDataService().get_snapshot()
    except MarketDataUnavailable as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    return {
        "symbol": "SOL",
        "price_usd": str(snapshot.price_usd),
        "change_24h_pct": str(snapshot.change_24h_pct),
        "source": snapshot.source,
        "captured_at": datetime.fromtimestamp(snapshot.captured_at, UTC).isoformat(),
    }


@router.post("/policy/screen")
async def screen_proposal(proposal: TradeProposal):
    return ShariahPolicyEngine().screen(proposal)


@router.put("/profiles/{wallet_address}", response_model=ProfileResponse)
async def upsert_profile(
    wallet_address: str,
    payload: RiskProfile,
    owner: str = Depends(authenticated_wallet),
    session: AsyncSession = Depends(get_session),
):
    require_owner(owner, wallet_address)
    if wallet_address != payload.wallet_address:
        raise HTTPException(status_code=400, detail="wallet address path and body must match")
    record = await session.scalar(
        select(RiskProfileRecord).where(RiskProfileRecord.wallet_address == wallet_address)
    )
    values = payload.model_dump()
    values["risk_level"] = payload.risk_level.value
    if record is None:
        record = RiskProfileRecord(**values)
        session.add(record)
    else:
        for key, value in values.items():
            setattr(record, key, value)
    paper = await session.get(PaperAccountRecord, wallet_address)
    if paper and paper.status == "running":
        version = paper.version
        changed = await session.execute(update(PaperAccountRecord).where(
            PaperAccountRecord.wallet_address == wallet_address,
            PaperAccountRecord.version == version,
        ).values(status="paused", version=version + 1))
        if changed.rowcount != 1:
            await session.rollback()
            raise HTTPException(409, "Agent completed a cycle; retry saving limits")
        session.add(PaperEventRecord(wallet_address=wallet_address, version=version + 1, data={
            "kind": "limits_changed", "mode": "paper", "status": "paused",
            "at": datetime.now(UTC).isoformat(),
            "message": "Risk limits changed. Resume to apply them to the virtual portfolio.",
            "live_execution_allowed": False,
        }))
    await session.commit()
    await session.refresh(record)
    return record


@router.get("/profiles/{wallet_address}", response_model=ProfileResponse)
async def get_profile(wallet_address: str, session: AsyncSession = Depends(get_session)):
    record = await session.scalar(
        select(RiskProfileRecord).where(RiskProfileRecord.wallet_address == wallet_address)
    )
    if record is None:
        raise HTTPException(status_code=404, detail="profile not found")
    return record


@router.post("/decisions/evaluate", response_model=DecisionEvaluation)
async def evaluate_decision(
    payload: DecisionRequest,
    owner: str = Depends(authenticated_wallet),
    session: AsyncSession = Depends(get_session),
):
    require_owner(owner, payload.wallet_address)
    profile_record = await session.scalar(
        select(RiskProfileRecord).where(RiskProfileRecord.wallet_address == payload.wallet_address)
    )
    if profile_record is None:
        raise HTTPException(status_code=404, detail="risk profile not found")

    result = pipeline.evaluate(
        proposal=payload.proposal,
        profile=to_domain_profile(profile_record),
        snapshot=payload.snapshot,
    )
    session.add(
        DecisionLogRecord(
            id=result.id,
            wallet_address=payload.wallet_address,
            status=result.status.value,
            proposal=result.proposal.model_dump(mode="json"),
            shariah_result=result.shariah.model_dump(mode="json"),
            risk_result=result.risk.model_dump(mode="json"),
            execution_allowed=result.execution_allowed,
        )
    )
    await session.commit()
    return result


@router.post("/agent/analyze", response_model=DecisionEvaluation)
async def analyze_portfolio(
    payload: AgentAnalysisRequest,
    owner: str = Depends(authenticated_wallet),
    session: AsyncSession = Depends(get_session),
):
    """Create an untrusted AI proposal, evaluate it deterministically, and persist the result."""
    require_owner(owner, payload.wallet_address)
    profile_record = await session.scalar(
        select(RiskProfileRecord).where(
            RiskProfileRecord.wallet_address == payload.wallet_address
        )
    )
    if profile_record is None:
        raise HTTPException(status_code=404, detail="risk profile not found")

    profile = to_domain_profile(profile_record)
    proposal = await GeminiPortfolioAgent(get_settings()).propose(
        profile=profile,
        snapshot=payload.snapshot,
        market_context=payload.market_context,
        language=payload.language,
    )
    result = pipeline.evaluate(proposal=proposal, profile=profile, snapshot=payload.snapshot)
    session.add(
        DecisionLogRecord(
            id=result.id,
            wallet_address=payload.wallet_address,
            status=result.status.value,
            proposal=result.proposal.model_dump(mode="json"),
            shariah_result=result.shariah.model_dump(mode="json"),
            risk_result=result.risk.model_dump(mode="json"),
            execution_allowed=result.execution_allowed,
        )
    )
    await session.commit()
    return result


@router.post("/decisions/{decision_id}/simulate")
async def simulate_decision(
    decision_id: UUID,
    payload: SimulationRequest,
    owner: str = Depends(authenticated_wallet),
    session: AsyncSession = Depends(get_session),
):
    require_owner(owner, payload.wallet_address)
    record = await session.scalar(
        select(DecisionLogRecord).where(
            DecisionLogRecord.id == decision_id,
            DecisionLogRecord.wallet_address == payload.wallet_address,
        )
    )
    if record is None:
        raise HTTPException(status_code=404, detail="decision not found")

    settings = get_settings()
    if not record.execution_allowed:
        simulation = {
            "status": "skipped",
            "mode": "policy_only",
            "reason": "proposal did not pass both deterministic engines",
        }
    elif settings.solana_cluster == "devnet":
        simulation = {
            "status": "environment_blocked",
            "mode": "policy_only",
            "reason": "canonical Jupiter v6 is unavailable as a Devnet SBF program",
            "policy_and_risk_validated": True,
        }
    elif not settings.jupiter_api_key:
        simulation = {
            "status": "environment_blocked",
            "mode": "policy_only",
            "reason": "Jupiter API key is not configured",
            "policy_and_risk_validated": True,
        }
    else:
        simulation = {
            "status": "pending_integration",
            "mode": "policy_only",
            "reason": "transaction builder is not enabled",
            "policy_and_risk_validated": True,
        }

    record.simulation = simulation
    await session.commit()
    return {"decision_id": str(record.id), "simulation": simulation}


@router.get("/decisions/{wallet_address}")
async def list_decisions(
    wallet_address: str,
    limit: int = Query(default=50, ge=1, le=100),
    session: AsyncSession = Depends(get_session),
):
    records = (
        await session.scalars(
            select(DecisionLogRecord)
            .where(DecisionLogRecord.wallet_address == wallet_address)
            .order_by(DecisionLogRecord.created_at.desc())
            .limit(limit)
        )
    ).all()
    return {
        "items": [
            {
                "id": record.id,
                "wallet_address": record.wallet_address,
                "status": record.status,
                "proposal": record.proposal,
                "shariah": record.shariah_result,
                "risk": record.risk_result,
                "execution_allowed": record.execution_allowed,
                "simulation": record.simulation,
                "execution": record.execution,
                "created_at": record.created_at,
            }
            for record in records
        ]
    }
