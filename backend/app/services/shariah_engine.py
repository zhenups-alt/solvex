from app.domain.types import (
    CheckOutcome,
    EngineResult,
    PolicyCheck,
    ScreeningStatus,
    TradeAction,
    TradeProposal,
)
from app.policy.catalog import ASSET_CATALOG, PROTOCOL_CATALOG, TRANSACTION_CATALOG, CatalogEntry
from app.policy.methodology import METHODOLOGY_VERSION


def _outcome(status: ScreeningStatus) -> CheckOutcome:
    return {
        ScreeningStatus.ELIGIBLE: CheckOutcome.PASS,
        ScreeningStatus.REVIEW: CheckOutcome.REVIEW,
        ScreeningStatus.BLOCKED: CheckOutcome.FAIL,
    }[status]


def _catalog_check(code: str, subject: str, entry: CatalogEntry | None) -> PolicyCheck:
    if entry is None:
        return PolicyCheck(
            code=code,
            outcome=CheckOutcome.REVIEW,
            message=f"{subject} is not present in the approved policy catalog.",
            evidence=["policy:SH-06"],
        )
    return PolicyCheck(
        code=code,
        outcome=_outcome(entry.status),
        message=f"{subject}: {entry.rationale}",
        evidence=list(entry.evidence),
    )


class ShariahPolicyEngine:
    methodology_version = METHODOLOGY_VERSION

    def __init__(self, *, assets=None, protocols=None, methodology_version=None):
        self.assets = ASSET_CATALOG if assets is None else assets
        self.protocols = PROTOCOL_CATALOG if protocols is None else protocols
        if methodology_version:
            self.methodology_version = methodology_version

    def screen(self, proposal: TradeProposal) -> EngineResult:
        checks: list[PolicyCheck] = []

        for code, active, detected_message, clear_message in (
            (
                "SH-01-INTEREST",
                proposal.uses_interest,
                "Interest-based mechanism is prohibited.",
                "Interest-based mechanism not detected.",
            ),
            (
                "SH-02-LEVERAGE",
                proposal.uses_leverage,
                "Leverage is prohibited.",
                "Leverage not detected.",
            ),
            (
                "SH-02-DERIVATIVE",
                proposal.uses_derivative,
                "Derivatives are prohibited.",
                "Derivative exposure not detected.",
            ),
        ):
            checks.append(
                PolicyCheck(
                    code=code,
                    outcome=CheckOutcome.FAIL if active else CheckOutcome.PASS,
                    message=detected_message if active else clear_message,
                    evidence=[f"policy:{code[:5]}"],
                )
            )

        checks.append(
            _catalog_check(
                "SH-03-TRANSACTION",
                f"Transaction {proposal.transaction_kind}",
                TRANSACTION_CATALOG.get(proposal.transaction_kind),
            )
        )

        if proposal.action != TradeAction.HOLD:
            checks.append(
                _catalog_check(
                    "SH-04-INPUT-ASSET",
                    f"Input asset {proposal.input_asset.upper()}",
                    self.assets.get(proposal.input_asset.upper()),
                )
            )
            checks.append(
                _catalog_check(
                    "SH-04-OUTPUT-ASSET",
                    f"Output asset {proposal.output_asset.upper()}",
                    self.assets.get(proposal.output_asset.upper()),
                )
            )
            checks.append(
                _catalog_check(
                    "SH-05-PROTOCOL",
                    f"Protocol {proposal.protocol_id}",
                    self.protocols.get(proposal.protocol_id),
                )
            )

            if not proposal.route_programs:
                checks.append(
                    PolicyCheck(
                        code="SH-05-ROUTE",
                        outcome=CheckOutcome.REVIEW,
                        message=(
                            "Execution route is missing; every on-chain program must be "
                            "allowlisted."
                        ),
                        evidence=["policy:SH-05", "policy:SH-06"],
                    )
                )
            else:
                for route_program in proposal.route_programs:
                    checks.append(
                        _catalog_check(
                            "SH-05-ROUTE",
                            f"Route program {route_program}",
                            self.protocols.get(route_program),
                        )
                    )

        outcomes = {check.outcome for check in checks}
        if CheckOutcome.FAIL in outcomes:
            status = ScreeningStatus.BLOCKED
        elif CheckOutcome.REVIEW in outcomes:
            status = ScreeningStatus.REVIEW
        else:
            status = ScreeningStatus.ELIGIBLE

        return EngineResult(
            status=status,
            approved=status == ScreeningStatus.ELIGIBLE,
            methodology_version=self.methodology_version,
            checks=checks,
        )
