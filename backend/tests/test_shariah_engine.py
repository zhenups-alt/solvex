from decimal import Decimal

from app.domain.types import ScreeningStatus, TradeAction, TradeProposal, TransactionKind
from app.services.shariah_engine import ShariahPolicyEngine


def proposal(**overrides) -> TradeProposal:
    values = {
        "action": TradeAction.BUY,
        "transaction_kind": TransactionKind.SPOT_SWAP,
        "input_asset": "SOL",
        "output_asset": "SOLX",
        "protocol_id": "jupiter_spot_router",
        "route_programs": ["orca_whirlpool_spot"],
        "amount_usd": Decimal("25"),
        "slippage_bps": 30,
        "confidence": 72,
        "rationale": "Test proposal",
    }
    values.update(overrides)
    return TradeProposal(**values)


def test_unknown_asset_is_review_and_cannot_execute() -> None:
    result = ShariahPolicyEngine().screen(proposal())
    assert result.status == ScreeningStatus.REVIEW
    assert result.approved is False


def test_leverage_is_blocked() -> None:
    result = ShariahPolicyEngine().screen(
        proposal(output_asset="SOL", input_asset="USDC", uses_leverage=True)
    )
    assert result.status == ScreeningStatus.BLOCKED
    assert result.approved is False


def test_missing_route_fails_closed_to_review() -> None:
    result = ShariahPolicyEngine().screen(proposal(output_asset="USDC", route_programs=[]))
    assert result.status == ScreeningStatus.REVIEW
    assert result.approved is False


def test_hold_is_eligible_without_route() -> None:
    result = ShariahPolicyEngine().screen(
        TradeProposal(
            action=TradeAction.HOLD,
            transaction_kind=TransactionKind.HOLD,
            amount_usd=Decimal("0"),
            confidence=50,
            rationale="Insufficient evidence",
        )
    )
    assert result.status == ScreeningStatus.ELIGIBLE
    assert result.approved is True
