from datetime import UTC, datetime
from decimal import Decimal
from enum import StrEnum
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, Field, model_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class ScreeningStatus(StrEnum):
    ELIGIBLE = "eligible"
    REVIEW = "review"
    BLOCKED = "blocked"


class CheckOutcome(StrEnum):
    PASS = "pass"
    REVIEW = "review"
    FAIL = "fail"


class TradeAction(StrEnum):
    BUY = "buy"
    SELL = "sell"
    HOLD = "hold"
    REBALANCE = "rebalance"


class TransactionKind(StrEnum):
    SPOT_SWAP = "spot_swap"
    HOLD = "hold"
    DEPOSIT = "deposit"
    WITHDRAW = "withdraw"


class RiskLevel(StrEnum):
    CONSERVATIVE = "conservative"
    BALANCED = "balanced"
    GROWTH = "growth"


class DecisionStatus(StrEnum):
    NO_ACTION = "no_action"
    BLOCKED_SHARIAH = "blocked_shariah"
    BLOCKED_RISK = "blocked_risk"
    READY_FOR_SIMULATION = "ready_for_simulation"
    SIMULATION_FAILED = "simulation_failed"
    READY_FOR_EXECUTION = "ready_for_execution"
    EXECUTED = "executed"


class PolicyCheck(StrictModel):
    code: str
    outcome: CheckOutcome
    message: str
    evidence: list[str] = Field(default_factory=list)


class TradeProposal(StrictModel):
    action: TradeAction
    transaction_kind: TransactionKind
    input_asset: str = ""
    output_asset: str = ""
    protocol_id: str = "none"
    route_programs: list[str] = Field(default_factory=list)
    amount_usd: Decimal = Field(default=Decimal("0"), ge=0)
    slippage_bps: int = Field(default=0, ge=0, le=10_000)
    confidence: int = Field(ge=0, le=100)
    rationale: str
    key_signals: list[str] = Field(default_factory=list)
    uses_leverage: bool = False
    uses_derivative: bool = False
    uses_interest: bool = False

    @model_validator(mode="after")
    def validate_action_shape(self) -> "TradeProposal":
        if self.action == TradeAction.HOLD:
            if self.transaction_kind != TransactionKind.HOLD or self.amount_usd != 0:
                raise ValueError("hold proposals must use transaction_kind=hold and amount_usd=0")
            return self
        if self.transaction_kind == TransactionKind.HOLD:
            raise ValueError("non-hold proposals cannot use transaction_kind=hold")
        if not self.input_asset or not self.output_asset:
            raise ValueError("transaction proposals require input_asset and output_asset")
        if self.input_asset.upper() == self.output_asset.upper():
            raise ValueError("input_asset and output_asset must differ")
        if self.amount_usd <= 0:
            raise ValueError("transaction amount must be greater than zero")
        return self


class RiskProfile(StrictModel):
    wallet_address: str
    risk_level: RiskLevel = RiskLevel.BALANCED
    investment_cap_usd: Decimal = Field(gt=0)
    max_single_trade_usd: Decimal = Field(gt=0)
    max_daily_turnover_usd: Decimal = Field(gt=0)
    max_slippage_bps: int = Field(default=50, ge=1, le=500)
    max_drawdown_pct: Decimal = Field(default=Decimal("10"), gt=0, le=100)
    enabled: bool = True

    @model_validator(mode="after")
    def validate_limits(self) -> "RiskProfile":
        if self.max_single_trade_usd > self.investment_cap_usd:
            raise ValueError("max_single_trade_usd cannot exceed investment_cap_usd")
        return self


class PortfolioSnapshot(StrictModel):
    vault_principal_usd: Decimal = Field(ge=0)
    vault_market_value_usd: Decimal = Field(ge=0)
    daily_turnover_usd: Decimal = Field(default=Decimal("0"), ge=0)
    current_drawdown_pct: Decimal = Field(default=Decimal("0"), ge=0, le=100)
    captured_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class EngineResult(StrictModel):
    status: ScreeningStatus
    approved: bool
    methodology_version: str
    checks: list[PolicyCheck]


class DecisionEvaluation(StrictModel):
    id: UUID = Field(default_factory=uuid4)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    status: DecisionStatus
    proposal: TradeProposal
    shariah: EngineResult
    risk: EngineResult
    execution_allowed: bool
