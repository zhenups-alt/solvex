from app.domain.types import (
    DecisionEvaluation,
    DecisionStatus,
    PortfolioSnapshot,
    RiskProfile,
    TradeAction,
    TradeProposal,
)
from app.services.risk_engine import RiskEngine
from app.services.shariah_engine import ShariahPolicyEngine


class DecisionPipeline:
    def __init__(
        self,
        shariah_engine: ShariahPolicyEngine | None = None,
        risk_engine: RiskEngine | None = None,
    ) -> None:
        self.shariah_engine = shariah_engine or ShariahPolicyEngine()
        self.risk_engine = risk_engine or RiskEngine()

    def evaluate(
        self,
        proposal: TradeProposal,
        profile: RiskProfile,
        snapshot: PortfolioSnapshot,
    ) -> DecisionEvaluation:
        shariah = self.shariah_engine.screen(proposal)
        risk = self.risk_engine.evaluate(proposal, profile, snapshot)

        if proposal.action == TradeAction.HOLD:
            status = DecisionStatus.NO_ACTION
        elif not shariah.approved:
            status = DecisionStatus.BLOCKED_SHARIAH
        elif not risk.approved:
            status = DecisionStatus.BLOCKED_RISK
        else:
            status = DecisionStatus.READY_FOR_SIMULATION

        return DecisionEvaluation(
            status=status,
            proposal=proposal,
            shariah=shariah,
            risk=risk,
            execution_allowed=status == DecisionStatus.READY_FOR_SIMULATION,
        )
