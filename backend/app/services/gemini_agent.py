import json
import logging
from decimal import Decimal
from typing import Any

from google import genai
from google.genai import types
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
    """Provider schema; the result is validated again by the domain model."""

    model_config = ConfigDict(extra="forbid")

    action: TradeAction
    transaction_kind: TransactionKind
    input_asset: str
    output_asset: str
    protocol_id: str
    route_programs: list[str]
    amount_usd: float = Field(ge=0)
    slippage_bps: int = Field(ge=0, le=10_000)
    confidence: int = Field(ge=0, le=100)
    rationale: str
    key_signals: list[str]
    uses_leverage: bool
    uses_derivative: bool
    uses_interest: bool


class GeminiPortfolioAgent:
    def __init__(self, settings: Settings, client: Any | None = None) -> None:
        self.client = client
        if self.client is None and settings.gemini_api_key:
            self.client = genai.Client(api_key=settings.gemini_api_key)
        self.model = settings.gemini_model

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
        language: str = "en",
    ) -> TradeProposal:
        if self.client is None:
            return self._safe_hold("Gemini is not configured; fail-closed HOLD.")

        try:
            contents = json.dumps(
                {
                    "risk_profile": profile.model_dump(mode="json"),
                    "portfolio_snapshot": snapshot.model_dump(mode="json"),
                    "market_context": market_context,
                    "response_language": language,
                }
            )
            language_instruction = (
                "Write rationale and key_signals in Russian. Keep asset, protocol, and action "
                "identifiers unchanged."
                if language == "ru"
                else "Write rationale and key_signals in English."
            )
            async with self.client.aio as async_client:
                response = await async_client.models.generate_content(
                    model=self.model,
                    contents=contents,
                    config=types.GenerateContentConfig(
                        system_instruction=f"{SYSTEM_PROMPT}\n{language_instruction}",
                        temperature=0,
                        response_mime_type="application/json",
                        response_json_schema=StructuredTradeProposal.model_json_schema(),
                    ),
                )
            if not response.text:
                return self._safe_hold("Gemini returned no proposal; fail-closed HOLD.")
            structured = StructuredTradeProposal.model_validate_json(response.text)
            proposal = TradeProposal.model_validate(structured.model_dump())
            if proposal.action == TradeAction.HOLD:
                return TradeProposal(
                    action=TradeAction.HOLD,
                    transaction_kind=TransactionKind.HOLD,
                    input_asset="",
                    output_asset="",
                    protocol_id="none",
                    route_programs=[],
                    amount_usd=Decimal("0"),
                    slippage_bps=0,
                    confidence=proposal.confidence,
                    rationale=proposal.rationale,
                    key_signals=proposal.key_signals,
                    uses_leverage=False,
                    uses_derivative=False,
                    uses_interest=False,
                )
            return proposal
        except Exception:
            logger.exception("Gemini proposal failed; returning fail-closed HOLD")
            return self._safe_hold("Gemini failed; fail-closed HOLD.")
