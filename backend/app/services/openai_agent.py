import json
import logging
from decimal import Decimal

from openai import AsyncOpenAI
from pydantic import BaseModel, ConfigDict, Field

from app.config import Settings
from app.domain.types import (
    PortfolioSnapshot,
    RiskProfile,
    TradeAction,
    TradeProposal,
    TransactionKind,
)

SYSTEM_PROMPT = """You are the Solvex portfolio analysis component.
Produce exactly one conservative portfolio proposal from the supplied market and portfolio data.
You do not approve Shariah compliance, risk, simulation, or execution.
Deterministic engines do that.
Never claim an asset is halal. Prefer HOLD when evidence is incomplete or uncertain.
Set uses_leverage, uses_derivative, and uses_interest truthfully.
Use only the asset and protocol identifiers supplied in the input.
"""

logger = logging.getLogger(__name__)


class StructuredTradeProposal(BaseModel):
    """All fields are required so OpenAI strict Structured Outputs can enforce the schema."""

    model_config = ConfigDict(extra="forbid")

    action: TradeAction
    transaction_kind: TransactionKind
    input_asset: str
    output_asset: str
    protocol_id: str
    route_programs: list[str]
    amount_usd: Decimal = Field(ge=0)
    slippage_bps: int = Field(ge=0, le=10_000)
    confidence: int = Field(ge=0, le=100)
    rationale: str
    key_signals: list[str]
    uses_leverage: bool
    uses_derivative: bool
    uses_interest: bool


class OpenAIPortfolioAgent:
    def __init__(self, settings: Settings) -> None:
        self.client = (
            AsyncOpenAI(api_key=settings.openai_api_key) if settings.openai_api_key else None
        )
        self.model = settings.openai_model
        self.reasoning_effort = settings.openai_reasoning_effort

    @staticmethod
    def _safe_hold(reason: str) -> TradeProposal:
        return TradeProposal(
            action=TradeAction.HOLD,
            transaction_kind=TransactionKind.HOLD,
            input_asset="",
            output_asset="",
            protocol_id="none",
            route_programs=[],
            amount_usd=Decimal("0"),
            slippage_bps=0,
            confidence=0,
            rationale=reason,
            key_signals=["AI_UNAVAILABLE"],
            uses_leverage=False,
            uses_derivative=False,
            uses_interest=False,
        )

    async def propose(
        self,
        profile: RiskProfile,
        snapshot: PortfolioSnapshot,
        market_context: dict,
    ) -> TradeProposal:
        if self.client is None:
            return self._safe_hold("AI provider is not configured; fail-closed HOLD.")

        try:
            response = await self.client.responses.create(
                model=self.model,
                reasoning={"effort": self.reasoning_effort},
                store=False,
                input=[
                    {"role": "developer", "content": SYSTEM_PROMPT},
                    {
                        "role": "user",
                        "content": json.dumps(
                            {
                                "risk_profile": profile.model_dump(mode="json"),
                                "portfolio_snapshot": snapshot.model_dump(mode="json"),
                                "market_context": market_context,
                            }
                        ),
                    },
                ],
                text={
                    "format": {
                        "type": "json_schema",
                        "name": "trade_proposal",
                        "strict": True,
                        "schema": StructuredTradeProposal.model_json_schema(),
                    }
                },
            )
            if not response.output_text:
                return self._safe_hold("AI provider returned no proposal; fail-closed HOLD.")
            structured = StructuredTradeProposal.model_validate_json(response.output_text)
            return TradeProposal.model_validate(structured.model_dump())
        except Exception:
            logger.exception("OpenAI proposal failed; returning fail-closed HOLD")
            return self._safe_hold("AI provider failed; fail-closed HOLD.")
