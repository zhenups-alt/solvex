from decimal import Decimal

from app.domain.types import (
    DecisionStatus,
    PortfolioSnapshot,
    RiskProfile,
    TradeAction,
    TradeProposal,
    TransactionKind,
)
from app.services.decision_pipeline import DecisionPipeline


def test_review_asset_blocks_before_simulation() -> None:
    proposal = TradeProposal(
        action=TradeAction.BUY,
        transaction_kind=TransactionKind.SPOT_SWAP,
        input_asset="SOL",
        output_asset="USDC",
        protocol_id="jupiter_spot_router",
        route_programs=["orca_whirlpool_spot"],
        amount_usd=Decimal("50"),
        slippage_bps=30,
        confidence=70,
        rationale="Portfolio rebalance",
    )
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

    result = DecisionPipeline().evaluate(proposal, profile, snapshot)

    assert result.status == DecisionStatus.BLOCKED_SHARIAH
    assert result.execution_allowed is False
    assert result.shariah.approved is False
    assert result.risk.approved is True
