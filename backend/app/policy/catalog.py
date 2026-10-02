from dataclasses import dataclass

from app.domain.types import ScreeningStatus, TransactionKind


@dataclass(frozen=True)
class CatalogEntry:
    status: ScreeningStatus
    rationale: str
    evidence: tuple[str, ...]


# Conservative bootstrap catalog. "Eligible" is a policy classification, not a religious ruling.
ASSET_CATALOG: dict[str, CatalogEntry] = {
    "SOL": CatalogEntry(
        status=ScreeningStatus.ELIGIBLE,
        rationale=(
            "Native network utility asset; approved only for direct spot ownership in this MVP."
        ),
        evidence=("internal-review:asset/SOL:v0.1",),
    ),
    "USDC": CatalogEntry(
        status=ScreeningStatus.REVIEW,
        rationale=(
            "Stablecoin reserve composition and issuer revenue require qualified Shariah review."
        ),
        evidence=("internal-review:asset/USDC:pending",),
    ),
}


PROTOCOL_CATALOG: dict[str, CatalogEntry] = {
    "jupiter_spot_router": CatalogEntry(
        status=ScreeningStatus.ELIGIBLE,
        rationale=(
            "Approved only as a router for verified spot-swap instructions and allowlisted "
            "route programs."
        ),
        evidence=("internal-review:protocol/jupiter-spot:v0.1",),
    ),
    "orca_whirlpool_spot": CatalogEntry(
        status=ScreeningStatus.ELIGIBLE,
        rationale=(
            "Approved only when used as a spot-swap hop; liquidity provision is outside "
            "this approval."
        ),
        evidence=("internal-review:protocol/orca-spot:v0.1",),
    ),
    "raydium_amm_spot": CatalogEntry(
        status=ScreeningStatus.ELIGIBLE,
        rationale=(
            "Approved only when used as a spot-swap hop; CLMM positions are outside this approval."
        ),
        evidence=("internal-review:protocol/raydium-spot:v0.1",),
    ),
    "jupiter_perpetuals": CatalogEntry(
        status=ScreeningStatus.BLOCKED,
        rationale="Perpetual derivatives and leverage are outside the Solvex Shariah policy.",
        evidence=("policy:SH-02",),
    ),
}


TRANSACTION_CATALOG: dict[TransactionKind, CatalogEntry] = {
    TransactionKind.SPOT_SWAP: CatalogEntry(
        status=ScreeningStatus.ELIGIBLE,
        rationale="Spot swaps may proceed only when asset and route checks are also eligible.",
        evidence=("policy:SH-03",),
    ),
    TransactionKind.HOLD: CatalogEntry(
        status=ScreeningStatus.ELIGIBLE,
        rationale="Holding performs no asset movement or financial contract.",
        evidence=("policy:SH-03",),
    ),
    TransactionKind.DEPOSIT: CatalogEntry(
        status=ScreeningStatus.ELIGIBLE,
        rationale="Vault deposit is eligible only for an approved asset and within the user cap.",
        evidence=("policy:SH-03",),
    ),
    TransactionKind.WITHDRAW: CatalogEntry(
        status=ScreeningStatus.ELIGIBLE,
        rationale="Returning user-owned spot assets does not create leverage or interest.",
        evidence=("policy:SH-03",),
    ),
}
