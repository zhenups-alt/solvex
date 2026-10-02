from app.domain.types import (
    CheckOutcome,
    EngineResult,
    PolicyCheck,
    PortfolioSnapshot,
    RiskProfile,
    ScreeningStatus,
    TradeAction,
    TradeProposal,
)

RISK_ENGINE_VERSION = "solvex-risk-v0.1.0"


class RiskEngine:
    methodology_version = RISK_ENGINE_VERSION

    def evaluate(
        self,
        proposal: TradeProposal,
        profile: RiskProfile,
        snapshot: PortfolioSnapshot,
    ) -> EngineResult:
        checks = [
            PolicyCheck(
                code="RK-01-AGENT-ENABLED",
                outcome=CheckOutcome.PASS if profile.enabled else CheckOutcome.FAIL,
                message="Agent is enabled." if profile.enabled else "Agent is paused by the user.",
            ),
            PolicyCheck(
                code="RK-02-PRINCIPAL-CAP",
                outcome=(
                    CheckOutcome.PASS
                    if snapshot.vault_principal_usd <= profile.investment_cap_usd
                    else CheckOutcome.FAIL
                ),
                message=(
                    f"Delegated principal ${snapshot.vault_principal_usd}; user cap "
                    f"${profile.investment_cap_usd}."
                ),
            ),
        ]

        if proposal.action != TradeAction.HOLD:
            checks.extend(
                [
                    PolicyCheck(
                        code="RK-03-AVAILABLE-VALUE",
                        outcome=(
                            CheckOutcome.PASS
                            if proposal.amount_usd <= snapshot.vault_market_value_usd
                            else CheckOutcome.FAIL
                        ),
                        message=(
                            f"Trade ${proposal.amount_usd}; vault value "
                            f"${snapshot.vault_market_value_usd}."
                        ),
                    ),
                    PolicyCheck(
                        code="RK-04-SINGLE-TRADE",
                        outcome=(
                            CheckOutcome.PASS
                            if proposal.amount_usd <= profile.max_single_trade_usd
                            else CheckOutcome.FAIL
                        ),
                        message=(
                            f"Trade ${proposal.amount_usd}; per-trade limit "
                            f"${profile.max_single_trade_usd}."
                        ),
                    ),
                    PolicyCheck(
                        code="RK-05-DAILY-TURNOVER",
                        outcome=(
                            CheckOutcome.PASS
                            if snapshot.daily_turnover_usd + proposal.amount_usd
                            <= profile.max_daily_turnover_usd
                            else CheckOutcome.FAIL
                        ),
                        message=(
                            f"Projected daily turnover "
                            f"${snapshot.daily_turnover_usd + proposal.amount_usd}; limit "
                            f"${profile.max_daily_turnover_usd}."
                        ),
                    ),
                    PolicyCheck(
                        code="RK-06-SLIPPAGE",
                        outcome=(
                            CheckOutcome.PASS
                            if proposal.slippage_bps <= profile.max_slippage_bps
                            else CheckOutcome.FAIL
                        ),
                        message=(
                            f"Requested slippage {proposal.slippage_bps} bps; limit "
                            f"{profile.max_slippage_bps} bps."
                        ),
                    ),
                    PolicyCheck(
                        code="RK-07-DRAWDOWN",
                        outcome=(
                            CheckOutcome.PASS
                            if snapshot.current_drawdown_pct <= profile.max_drawdown_pct
                            or proposal.action == TradeAction.SELL
                            else CheckOutcome.FAIL
                        ),
                        message=(
                            f"Current drawdown {snapshot.current_drawdown_pct}%; limit "
                            f"{profile.max_drawdown_pct}%. De-risking sells remain permitted."
                        ),
                    ),
                ]
            )

        approved = all(check.outcome == CheckOutcome.PASS for check in checks)
        return EngineResult(
            status=ScreeningStatus.ELIGIBLE if approved else ScreeningStatus.BLOCKED,
            approved=approved,
            methodology_version=self.methodology_version,
            checks=checks,
        )
