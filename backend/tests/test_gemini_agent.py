from decimal import Decimal
from types import SimpleNamespace

import pytest

from app.config import Settings
from app.domain.types import PortfolioSnapshot, RiskProfile, TradeAction
from app.services.gemini_agent import GeminiPortfolioAgent


def profile() -> RiskProfile:
    return RiskProfile(
        wallet_address="wallet-1",
        investment_cap_usd=Decimal("1000"),
        max_single_trade_usd=Decimal("100"),
        max_daily_turnover_usd=Decimal("300"),
    )


def snapshot() -> PortfolioSnapshot:
    return PortfolioSnapshot(
        vault_principal_usd=Decimal("500"),
        vault_market_value_usd=Decimal("510"),
    )


@pytest.mark.asyncio
async def test_missing_api_key_returns_fail_closed_hold() -> None:
    settings = Settings(_env_file=None, GEMINI_API_KEY=None)
    agent = GeminiPortfolioAgent(settings)

    result = await agent.propose(profile(), snapshot(), {"assets": ["SOL"]})

    assert result.action == TradeAction.HOLD
    assert result.amount_usd == 0
    assert result.key_signals == ["AI_UNAVAILABLE"]


class FakeModels:
    async def generate_content(self, **_: object) -> SimpleNamespace:
        return SimpleNamespace(
            text=(
                '{"action":"hold","transaction_kind":"hold","input_asset":"",'
                '"output_asset":"","protocol_id":"none","route_programs":[],'
                '"amount_usd":0,"slippage_bps":0,"confidence":70,'
                '"rationale":"Insufficient evidence","key_signals":["LOW_CONFIDENCE"],'
                '"uses_leverage":false,"uses_derivative":false,"uses_interest":false}'
            )
        )


class FakeAsyncClient:
    def __init__(self) -> None:
        self.models = FakeModels()

    async def __aenter__(self) -> "FakeAsyncClient":
        return self

    async def __aexit__(self, *_: object) -> None:
        return None


class FakeGeminiClient:
    def __init__(self) -> None:
        self.aio = FakeAsyncClient()


@pytest.mark.asyncio
async def test_structured_gemini_response_is_revalidated_as_domain_proposal() -> None:
    settings = Settings(_env_file=None, GEMINI_API_KEY="test-key")
    agent = GeminiPortfolioAgent(settings, client=FakeGeminiClient())

    result = await agent.propose(profile(), snapshot(), {"assets": ["SOL"]})

    assert result.action == TradeAction.HOLD
    assert result.confidence == 70
    assert result.key_signals == ["LOW_CONFIDENCE"]
    assert result.input_asset == ""
    assert result.output_asset == ""
