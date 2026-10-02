from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db import get_session
from app.domain.types import (
    DecisionEvaluation,
    PortfolioSnapshot,
    RiskLevel,
    RiskProfile,
    TradeProposal,
)
from app.models import DecisionLogRecord, RiskProfileRecord
from app.policy.methodology import METHODOLOGY
from app.services.decision_pipeline import DecisionPipeline
from app.services.openai_agent import OpenAIPortfolioAgent
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


@router.post("/policy/screen")
async def screen_proposal(proposal: TradeProposal):
    return ShariahPolicyEngine().screen(proposal)


@router.put("/profiles/{wallet_address}", response_model=ProfileResponse)
async def upsert_profile(
    wallet_address: str,
    payload: RiskProfile,
    session: AsyncSession = Depends(get_session),
):
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
    session: AsyncSession = Depends(get_session),
):
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
    session: AsyncSession = Depends(get_session),
):
    """Create an untrusted AI proposal, evaluate it deterministically, and persist the result."""
    profile_record = await session.scalar(
        select(RiskProfileRecord).where(
            RiskProfileRecord.wallet_address == payload.wallet_address
        )
    )
    if profile_record is None:
        raise HTTPException(status_code=404, detail="risk profile not found")

    profile = to_domain_profile(profile_record)
    proposal = await OpenAIPortfolioAgent(get_settings()).propose(
        profile=profile,
        snapshot=payload.snapshot,
        market_context=payload.market_context,
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
