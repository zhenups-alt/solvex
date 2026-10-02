from decimal import Decimal

import pytest

from app.config import Settings
from app.domain.types import PortfolioSnapshot, RiskProfile, TradeAction
from app.services.openai_agent import OpenAIPortfolioAgent


@pytest.mark.asyncio
async def test_missing_api_key_returns_fail_closed_hold() -> None:
    settings = Settings(_env_file=None, OPENAI_API_KEY=None)
    agent = OpenAIPortfolioAgent(settings)
    profile = RiskProfile(
        wallet_address="wallet-1",
        investment_cap_usd=Decimal("1000"),
        max_single_trade_usd=Decimal("100"),
        max_daily_turnover_usd=Decimal("300"),
    )
    snapshot = PortfolioSnapshot(
        vault_principal_usd=Decimal("500"),
        vault_market_value_usd=Decimal("510"),
    )

    result = await agent.propose(profile, snapshot, {"assets": ["SOL"]})

    assert result.action == TradeAction.HOLD
    assert result.amount_usd == 0
    assert result.key_signals == ["AI_UNAVAILABLE"]
