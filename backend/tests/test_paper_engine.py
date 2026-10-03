from datetime import UTC, datetime, timedelta
from decimal import Decimal

import pytest

from app.domain.types import RiskProfile, ScreeningStatus, TradeAction
from app.policy.catalog import ASSET_CATALOG, PROTOCOL_CATALOG
from app.services.market_data import SolMarketSnapshot
from app.services.paper_engine import (
    PaperState,
    ai_context,
    hold,
    metrics,
    new_state,
    run_paper_cycle,
)
from app.services.shariah_engine import ShariahPolicyEngine

D = Decimal
NOW = datetime(2026, 10, 3, 0, 0, tzinfo=UTC)


def profile(**overrides):
    return RiskProfile(
        **{
            "wallet_address": "test-wallet",
            "investment_cap_usd": "100",
            "max_single_trade_usd": "10",
            "max_daily_turnover_usd": "100",
            **overrides,
        }
    )


def market(price="100", now=NOW):
    return SolMarketSnapshot(D(price), D("0"), "fixture", now.timestamp())


def step(state, price="100", now=NOW):
    return run_paper_cycle(state, market(price, now), now)


def test_buy_sell_accounting_preserves_equity_and_cost_basis():
    state = new_state(profile(), D("100"), 60)
    for i in range(5):
        state, event = step(state, now=NOW + timedelta(minutes=i))
        assert event["fill"] is not None
        assert D(event["fill"]["notional_usd"]) <= 10
    assert state.sol_quantity > 0
    assert state.fees_usd > 0
    state, held = step(state, now=NOW + timedelta(minutes=5))
    assert held["status"] == "no_action"
    assert held["fill"] is None
    state, sold = step(state, "200", NOW + timedelta(minutes=6))
    assert sold["decision"]["proposal"]["action"] == "sell"
    assert state.realized_pnl_usd > 0
    values = metrics(state)
    assert abs(
        D(values["total_pnl_usd"]) - (state.realized_pnl_usd + D(values["unrealized_pnl_usd"]))
    ) < D("1e-20")
    assert state.cash_usd >= 0 and state.sol_quantity >= 0
    assert sold["fill"]["transaction_signature"] is None
    # JSON persistence preserves Decimal accounting and UTC trade times.
    assert PaperState.model_validate_json(state.model_dump_json()) == state


def test_daily_limit_and_utc_rollover():
    state = new_state(profile(max_daily_turnover_usd="15"), D("100"), 60)
    state, _ = step(state)
    state, _ = step(state, now=NOW + timedelta(minutes=1))
    assert state.daily_turnover_usd == 15
    state, event = step(state, now=NOW + timedelta(minutes=2))
    assert event["fill"] is None
    state, event = step(state, now=NOW + timedelta(days=1))
    assert event["fill"] is not None
    assert state.daily_turnover_usd == 10


def test_drawdown_de_risks_instead_of_buying_the_dip():
    state = new_state(profile(), D("100"), 60)
    for i in range(5):
        state, _ = step(state, now=NOW + timedelta(minutes=i))
    state, event = step(state, "50", NOW + timedelta(minutes=6))
    assert event["decision"]["proposal"]["action"] == "sell"
    assert event["fill"] is not None
    assert state.realized_pnl_usd < 0


def test_cooldown_and_slippage_limit_cannot_be_bypassed():
    state = new_state(profile(), D("100"), 60)
    state, _ = step(state)
    state, event = step(state, now=NOW + timedelta(seconds=1))
    assert event["fill"] is None
    assert state.trade_count == 1
    state = new_state(profile(max_slippage_bps=5), D("100"), 60)
    state, event = step(state)
    assert event["status"] == "blocked_risk"
    assert state.cash_usd == 100 and state.trade_count == 0


@pytest.mark.parametrize("price,age", [("NaN", 0), ("Infinity", 0), ("0", 0), ("100", 181)])
def test_stale_and_invalid_quotes_never_change_state(price, age):
    state = new_state(profile(), D("100"), 60)
    before = state.model_dump_json()
    with pytest.raises(ValueError):
        run_paper_cycle(state, market(price, NOW - timedelta(seconds=age)), NOW)
    assert state.model_dump_json() == before


def test_sandbox_does_not_approve_live_assets_or_routes():
    state = new_state(profile(), D("100"), 60)
    _, event = step(state)
    from app.domain.types import TradeProposal

    proposal = TradeProposal.model_validate(event["decision"]["proposal"])
    assert not ShariahPolicyEngine().screen(proposal).approved
    assert ASSET_CATALOG["USDC"].status == ScreeningStatus.REVIEW
    assert "USD_VIRTUAL" not in ASSET_CATALOG
    assert "paper_spot_market" not in PROTOCOL_CATALOG


def test_starting_principal_is_never_revalued_as_price_changes():
    state = new_state(profile(), D("100"), 60)
    state, _ = step(state)
    state, event = step(state, "1000", NOW + timedelta(minutes=1))
    cap_check = next(
        c for c in event["decision"]["risk"]["checks"] if c["code"] == "RK-02-PRINCIPAL-CAP"
    )
    assert cap_check["outcome"] == "pass"
    assert state.initial_usd == 100
    with pytest.raises(ValueError):
        new_state(profile(), D("101"), 60)


def test_gemini_can_trade_within_bounds_but_cannot_raise_amount_or_change_direction():
    state = new_state(profile(), D("100"), 60)
    state.decision_source = "gemini"
    permitted, _, _ = ai_context(state, market(), NOW)
    smaller = permitted.model_copy(update={"amount_usd": D("5")})
    next_state, event = run_paper_cycle(state, market(), NOW, smaller)
    assert event["fill"] is not None
    assert next_state.daily_turnover_usd == 5
    assert event["decision_source"] == "gemini"
    for bad in (
        permitted.model_copy(update={"amount_usd": D("99")}),
        permitted.model_copy(update={"action": TradeAction.SELL}),
        permitted.model_copy(update={"output_asset": "USDC"}),
        permitted.model_copy(update={"slippage_bps": 0}),
        permitted.model_copy(update={"amount_usd": D("0.01")}),
    ):
        unchanged, blocked = run_paper_cycle(state, market(), NOW, bad)
        assert blocked["status"] == "blocked_risk"
        assert blocked["fill"] is None
        assert unchanged.cash_usd == 100
    unchanged, no_ai = run_paper_cycle(state, market(), NOW)
    assert no_ai["status"] == "no_action"
    assert unchanged.trade_count == 0
    _, declined = run_paper_cycle(state, market(), NOW, hold("Not enough evidence"))
    assert declined["fill"] is None


def test_gemini_cannot_skip_cooldown_or_use_unknown_routes():
    state = new_state(profile(), D("100"), 60)
    state.decision_source = "gemini"
    permitted, _, _ = ai_context(state, market(), NOW)
    unknown = permitted.model_copy(update={"route_programs": ["unknown"]})
    unchanged, blocked = run_paper_cycle(state, market(), NOW, unknown)
    assert blocked["status"] == "blocked_shariah"
    assert unchanged.trade_count == 0
    state, _ = run_paper_cycle(state, market(), NOW, permitted)
    state, cooldown = run_paper_cycle(state, market(), NOW + timedelta(seconds=1), permitted)
    assert cooldown["fill"] is None and state.trade_count == 1
