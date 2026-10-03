"""Deterministic paper spot accounting. This module cannot sign or send transactions.

USD_VIRTUAL is an accounting unit, not USDC. Its sandbox classification never modifies
the production Shariah catalog. Paper fills are estimates, not executable DEX quotes.
"""

from datetime import UTC, datetime
from decimal import ROUND_DOWN, Decimal
from typing import Literal

from pydantic import Field

from app.domain.types import (
    CheckOutcome,
    DecisionStatus,
    PolicyCheck,
    PortfolioSnapshot,
    RiskProfile,
    ScreeningStatus,
    StrictModel,
    TradeAction,
    TradeProposal,
    TransactionKind,
)
from app.policy.catalog import ASSET_CATALOG, CatalogEntry
from app.services.decision_pipeline import DecisionPipeline
from app.services.market_data import SolMarketSnapshot
from app.services.shariah_engine import ShariahPolicyEngine

D = Decimal
ZERO = D("0")
FEE_RATE = D("0.001")  # Assumed 0.10% all-in variable cost, not a live fee quote.
SLIPPAGE_BPS = 10
FIXED_FEE_USD = D("0.01")
SOL_UNIT = D("0.000000001")
USD_UNIT = D("0.000001")
STRATEGY_VERSION = "allocation-v1"
TARGETS = {"conservative": D("0.30"), "balanced": D("0.50"), "growth": D("0.70")}


class PaperState(StrictModel):
    profile: RiskProfile
    initial_usd: Decimal = Field(gt=0, le=1_000_000)
    cash_usd: Decimal = Field(ge=0)
    sol_quantity: Decimal = Field(default=ZERO, ge=0)
    sol_cost_basis_usd: Decimal = Field(default=ZERO, ge=0)
    realized_pnl_usd: Decimal = ZERO
    fees_usd: Decimal = Field(default=ZERO, ge=0)
    high_water_usd: Decimal = Field(gt=0)
    last_price_usd: Decimal | None = Field(default=None, gt=0)
    last_mark_at: datetime | None = None
    turnover_day: str = ""
    daily_turnover_usd: Decimal = Field(default=ZERO, ge=0)
    interval_seconds: int = Field(default=300, ge=60, le=3600)
    cooldown_seconds: int = Field(default=300, ge=60, le=3600)
    last_trade_at: datetime | None = None
    last_cycle_at: datetime | None = None
    cycle_count: int = 0
    trade_count: int = 0
    last_error: str | None = None
    decision_source: Literal["allocation", "gemini"] = "allocation"
    language: Literal["en", "ru"] = "en"


def new_state(profile: RiskProfile, initial: Decimal, interval: int) -> PaperState:
    if initial > profile.investment_cap_usd:
        raise ValueError("Virtual starting balance exceeds your saved investment cap")
    if not profile.enabled:
        raise ValueError("Enable your risk profile before starting the agent")
    return PaperState(
        profile=profile,
        initial_usd=initial,
        cash_usd=initial,
        high_water_usd=initial,
        interval_seconds=interval,
        cooldown_seconds=interval,
    )


def metrics(state: PaperState) -> dict:
    price = state.last_price_usd
    sol_value = state.sol_quantity * price if price is not None else ZERO
    equity = state.cash_usd + sol_value
    return {
        "equity_usd": str(equity),
        "total_pnl_usd": str(equity - state.initial_usd),
        "return_pct": str((equity / state.initial_usd - 1) * 100),
        "unrealized_pnl_usd": str(sol_value - state.sol_cost_basis_usd),
        "realized_pnl_usd": str(state.realized_pnl_usd),
        "sol_allocation_pct": str(sol_value / equity * 100 if equity > 0 else ZERO),
        "drawdown_pct": str(max(ZERO, (1 - equity / state.high_water_usd) * 100)),
        "target_sol_pct": str(TARGETS[state.profile.risk_level.value] * 100),
    }


def paper_pipeline() -> DecisionPipeline:
    sandbox_entry = CatalogEntry(
        status=ScreeningStatus.ELIGIBLE,
        rationale="Virtual bookkeeping only; no token, protocol, transfer or religious approval.",
        evidence=("sandbox:paper-only:v1",),
    )
    return DecisionPipeline(
        shariah_engine=ShariahPolicyEngine(
            assets={"SOL": ASSET_CATALOG["SOL"], "USD_VIRTUAL": sandbox_entry},
            protocols={"paper_spot_market": sandbox_entry},
            methodology_version="paper-sandbox-v1-not-live-approval",
        )
    )


def hold(reason: str) -> TradeProposal:
    return TradeProposal(
        action=TradeAction.HOLD,
        transaction_kind=TransactionKind.HOLD,
        confidence=100,
        rationale=reason,
        key_signals=[STRATEGY_VERSION],
    )


def strategy(state: PaperState, price: Decimal, now: datetime) -> TradeProposal:
    values = metrics(state)
    equity = D(values["equity_usd"])
    if equity <= 0:
        return hold("No virtual funds available.")
    if state.last_trade_at and (now - state.last_trade_at).total_seconds() < state.cooldown_seconds:
        return hold("Trade cooldown is active.")
    target = TARGETS[state.profile.risk_level.value]
    if D(values["drawdown_pct"]) > state.profile.max_drawdown_pct:
        target = ZERO
    difference = equity * target - state.sol_quantity * price
    if abs(difference) / equity < D("0.05"):
        return hold("Allocation is within the 5 percentage-point rebalance band.")
    buying = difference > 0
    remaining_turnover = state.profile.max_daily_turnover_usd - state.daily_turnover_usd
    available = (
        max(ZERO, (state.cash_usd - FIXED_FEE_USD) / (1 + FEE_RATE))
        if buying
        else state.sol_quantity * price
    )
    amount = min(
        abs(difference),
        state.profile.max_single_trade_usd,
        remaining_turnover,
        available,
    ).quantize(USD_UNIT, rounding=ROUND_DOWN)
    if amount < D("1"):
        return hold("Available balance or remaining daily limit is below the $1 trade minimum.")
    return TradeProposal(
        action=TradeAction.BUY if buying else TradeAction.SELL,
        transaction_kind=TransactionKind.SPOT_SWAP,
        input_asset="USD_VIRTUAL" if buying else "SOL",
        output_asset="SOL" if buying else "USD_VIRTUAL",
        protocol_id="paper_spot_market",
        route_programs=["paper_spot_market"],
        amount_usd=amount,
        slippage_bps=SLIPPAGE_BPS,
        confidence=100,
        rationale=(
            f"Rebalance toward {target * 100}% SOL. Current allocation "
            f"{D(values['sol_allocation_pct']):.2f}%. "
            "Trade size is bounded by the saved per-trade and daily limits."
        ),
        key_signals=[STRATEGY_VERSION, f"target_sol_pct:{target * 100}"],
    )


def ai_context(state: PaperState, market: SolMarketSnapshot, now: datetime):
    marked = state.model_copy(deep=True)
    marked.last_price_usd = market.price_usd
    equity = marked.cash_usd + marked.sol_quantity * market.price_usd
    marked.high_water_usd = max(marked.high_water_usd, equity)
    if marked.turnover_day != now.date().isoformat():
        marked.daily_turnover_usd = ZERO
    planned = strategy(marked, market.price_usd, now)
    snapshot = PortfolioSnapshot(
        vault_principal_usd=marked.initial_usd,
        vault_market_value_usd=equity,
        daily_turnover_usd=marked.daily_turnover_usd,
        current_drawdown_pct=min(D("100"), D(metrics(marked)["drawdown_pct"])),
        captured_at=now,
    )
    context = {
        "mode": "virtual bookkeeping only; not live blockchain execution",
        "assets": [
            {"symbol": "SOL", "price_usd": str(market.price_usd), "policy_status": "eligible"},
            {"symbol": "USD_VIRTUAL", "price_usd": "1", "policy_status": "sandbox_only"},
        ],
        "protocols": [{"id": "paper_spot_market", "execution_available": True}],
        "route_programs": ["paper_spot_market"],
        "holdings": {"SOL": str(marked.sol_quantity), "USD_VIRTUAL": str(marked.cash_usd)},
        "permitted_allocation_proposal": planned.model_dump(mode="json"),
        "instructions": (
            "Recommend HOLD or the same spot direction as permitted_allocation_proposal with "
            "an amount no greater than its amount_usd. Use paper_spot_market as protocol and "
            "route program; slippage_bps=10. Do not invent prices or news. This is simulated "
            "SOL/USD bookkeeping, not a USDC approval. Explain uncertainty."
        ),
        "source": market.source,
    }
    return planned, snapshot, context


def run_paper_cycle(
    original: PaperState,
    market: SolMarketSnapshot,
    now: datetime | None = None,
    advisor_proposal: TradeProposal | None = None,
) -> tuple[PaperState, dict]:
    now = now or datetime.now(UTC)
    price = market.price_usd
    age = now.timestamp() - market.captured_at
    if not price.is_finite() or price <= 0 or age > 180 or age < -30:
        raise ValueError("Market price is invalid or older than 180 seconds")
    state = original.model_copy(deep=True)
    state.last_price_usd = price
    state.last_mark_at = datetime.fromtimestamp(market.captured_at, UTC)
    if state.turnover_day != now.date().isoformat():
        state.turnover_day = now.date().isoformat()
        state.daily_turnover_usd = ZERO
    equity = state.cash_usd + state.sol_quantity * price
    state.high_water_usd = max(state.high_water_usd, equity)
    planned = strategy(state, price, now)
    proposal = planned
    if state.decision_source == "gemini" and planned.action != TradeAction.HOLD:
        proposal = advisor_proposal or hold("Gemini recommendation unavailable; no virtual trade.")
    snapshot = PortfolioSnapshot(
        vault_principal_usd=state.initial_usd,
        vault_market_value_usd=equity,
        daily_turnover_usd=state.daily_turnover_usd,
        current_drawdown_pct=min(D("100"), D(metrics(state)["drawdown_pct"])),
        captured_at=now,
    )
    decision = paper_pipeline().evaluate(proposal, state.profile, snapshot)
    within_strategy = proposal.action == TradeAction.HOLD or (
        planned.action != TradeAction.HOLD
        and proposal.action == planned.action
        and proposal.transaction_kind == TransactionKind.SPOT_SWAP
        and proposal.input_asset == planned.input_asset
        and proposal.output_asset == planned.output_asset
        and proposal.amount_usd <= planned.amount_usd
        and proposal.amount_usd >= 1
        and proposal.slippage_bps == SLIPPAGE_BPS
    )
    decision.risk.checks.append(
        PolicyCheck(
            code="RK-08-STRATEGY-BOUND",
            outcome=CheckOutcome.PASS if within_strategy else CheckOutcome.FAIL,
            message="Proposal must stay within the allocation, cooldown and trade-size bounds.",
        )
    )
    if not within_strategy:
        decision.risk.approved = False
        decision.risk.status = ScreeningStatus.BLOCKED
        decision.status = DecisionStatus.BLOCKED_RISK
        decision.execution_allowed = False
    fill = None
    if decision.execution_allowed:
        buying = proposal.action == TradeAction.BUY
        slippage = D(SLIPPAGE_BPS) / 10_000
        fill_price = price * (1 + slippage if buying else 1 - slippage)
        quantity = (proposal.amount_usd / (fill_price if buying else price)).quantize(
            SOL_UNIT, rounding=ROUND_DOWN
        )
        gross = quantity * fill_price
        fees = gross * FEE_RATE + FIXED_FEE_USD
        if quantity <= 0:
            raise ValueError("Trade quantity rounds to zero")
        if buying:
            debit = gross + fees
            if debit > state.cash_usd:
                raise ValueError("Insufficient virtual cash including costs")
            state.cash_usd -= debit
            state.sol_quantity += quantity
            state.sol_cost_basis_usd += debit
        else:
            if quantity > state.sol_quantity or gross <= fees:
                raise ValueError("Insufficient virtual SOL or proceeds after costs")
            released_basis = state.sol_cost_basis_usd * quantity / state.sol_quantity
            state.cash_usd += gross - fees
            state.sol_quantity -= quantity
            state.sol_cost_basis_usd -= released_basis
            state.realized_pnl_usd += gross - fees - released_basis
        state.fees_usd += fees
        state.daily_turnover_usd += proposal.amount_usd
        state.last_trade_at = now
        state.trade_count += 1
        fill = {
            "kind": "paper_fill",
            "quantity_sol": str(quantity),
            "price_usd": str(fill_price),
            "notional_usd": str(gross),
            "fees_usd": str(fees),
            "source": market.source,
            "market_price_usd": str(price),
            "price_at": state.last_mark_at.isoformat(),
            "transaction_signature": None,
        }
    state.last_cycle_at = now
    state.cycle_count += 1
    state.last_error = None
    event = {
        "kind": "cycle",
        "mode": "paper",
        "strategy": STRATEGY_VERSION,
        "decision_source": state.decision_source,
        "status": "paper_filled" if fill else decision.status.value,
        "decision": decision.model_dump(mode="json"),
        "fill": fill,
        "metrics": metrics(state),
        "cash_usd": str(state.cash_usd),
        "sol_quantity": str(state.sol_quantity),
        "at": now.isoformat(),
        "live_execution_allowed": False,
    }
    # Catch accounting mistakes before a state can be committed.
    state = PaperState.model_validate(state.model_dump())
    return state, event
