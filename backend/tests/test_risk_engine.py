from decimal import Decimal

from app.domain.types import (
    PortfolioSnapshot,
    RiskProfile,
    ScreeningStatus,
    TradeAction,
    TradeProposal,
    TransactionKind,
)
from app.services.risk_engine import RiskEngine


def profile(**overrides) -> RiskProfile:
    values = {
        "wallet_address": "wallet-1",
        "investment_cap_usd": Decimal("1000"),
        "max_single_trade_usd": Decimal("200"),
        "max_daily_turnover_usd": Decimal("500"),
        "max_slippage_bps": 50,
        "max_drawdown_pct": Decimal("10"),
    }
    values.update(overrides)
    return RiskProfile(**values)


def snapshot(**overrides) -> PortfolioSnapshot:
    values = {
        "vault_principal_usd": Decimal("800"),
        "vault_market_value_usd": Decimal("850"),
        "daily_turnover_usd": Decimal("100"),
        "current_drawdown_pct": Decimal("3"),
    }
    values.update(overrides)
    return PortfolioSnapshot(**values)


def trade(**overrides) -> TradeProposal:
    values = {
        "action": TradeAction.BUY,
        "transaction_kind": TransactionKind.SPOT_SWAP,
        "input_asset": "SOL",
        "output_asset": "USDC",
        "protocol_id": "jupiter_spot_router",
        "route_programs": ["orca_whirlpool_spot"],
        "amount_usd": Decimal("100"),
        "slippage_bps": 30,
        "confidence": 80,
        "rationale": "Rebalance",
    }
    values.update(overrides)
    return TradeProposal(**values)


def test_trade_within_all_limits_is_approved() -> None:
    result = RiskEngine().evaluate(trade(), profile(), snapshot())
    assert result.status == ScreeningStatus.ELIGIBLE
    assert result.approved is True


def test_principal_above_user_cap_is_blocked() -> None:
    result = RiskEngine().evaluate(
        trade(), profile(), snapshot(vault_principal_usd=Decimal("1000.01"))
    )
    assert result.status == ScreeningStatus.BLOCKED


def test_daily_turnover_limit_is_blocked() -> None:
    result = RiskEngine().evaluate(
        trade(amount_usd=Decimal("150")),
        profile(),
        snapshot(daily_turnover_usd=Decimal("400")),
    )
    assert result.approved is False


def test_drawdown_blocks_buy_but_allows_derisking_sell() -> None:
    stressed = snapshot(current_drawdown_pct=Decimal("12"))
    assert RiskEngine().evaluate(trade(), profile(), stressed).approved is False
    assert (
        RiskEngine().evaluate(trade(action=TradeAction.SELL), profile(), stressed).approved is True
    )
