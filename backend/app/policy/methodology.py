from app.domain.types import ScreeningStatus

METHODOLOGY_VERSION = "solvex-shariah-v0.1.0"

METHODOLOGY = {
    "version": METHODOLOGY_VERSION,
    "name": "Solvex conservative automated Shariah screening methodology",
    "disclaimer": (
        "This is a technical screening framework, not a fatwa or a guarantee that an asset "
        "is halal. Eligible means that no blocking condition was found under this version and "
        "that the asset/protocol was explicitly approved in the versioned catalog."
    ),
    "statuses": {
        ScreeningStatus.ELIGIBLE: "May proceed to risk checks.",
        ScreeningStatus.REVIEW: "Disputed, incomplete, stale, or unknown; never auto-execute.",
        ScreeningStatus.BLOCKED: "Explicitly conflicts with a blocking rule; never execute.",
    },
    "principles": [
        {
            "code": "SH-01",
            "name": "No riba-like mechanism",
            "rule": (
                "Interest-bearing lending, borrowing, fixed-yield debt, and interest tokens "
                "are blocked."
            ),
        },
        {
            "code": "SH-02",
            "name": "No leverage or derivatives",
            "rule": (
                "Margin, perpetuals, futures, options, synthetic leverage, and liquidation "
                "exposure are blocked."
            ),
        },
        {
            "code": "SH-03",
            "name": "Spot ownership and delivery",
            "rule": "MVP automation is limited to spot swaps with immediate on-chain settlement.",
        },
        {
            "code": "SH-04",
            "name": "Permissible asset purpose",
            "rule": (
                "Assets with prohibited primary purpose or material prohibited revenue are blocked."
            ),
        },
        {
            "code": "SH-05",
            "name": "Protocol allowlisting",
            "rule": (
                "Every program in an execution route must be reviewed and explicitly allowlisted."
            ),
        },
        {
            "code": "SH-06",
            "name": "Uncertainty fails closed",
            "rule": (
                "Unknown, stale, incomplete, or disputed evidence is Review and cannot "
                "auto-execute."
            ),
        },
        {
            "code": "SH-07",
            "name": "Versioned human governance",
            "rule": (
                "Catalog changes require a recorded reviewer, rationale, evidence, and "
                "effective date."
            ),
        },
    ],
}
