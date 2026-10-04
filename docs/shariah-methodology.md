# Shariah Screening Methodology

[← Documentation](README.md)

Solvex implements a **technical screening framework**, not a fatwa or religious certification.
The current bootstrap catalog uses internal review records, not a claim of independent
scholarly approval. Qualified review and a documented governance process are required before
making production compliance claims.

## Three outcomes

- **Eligible:** the entry is explicitly admitted by this version of the catalog for the
  specified use and no blocking rule was found. It may proceed to independent risk checks.
- **Review:** unknown, incomplete or disputed evidence. No automatic execution.
- **Blocked:** an explicit conflict with a blocking rule. No execution.

Passing risk checks cannot override Review or Blocked. Passing Shariah screening cannot
override a failed risk check. A HOLD decision creates no asset movement.

## Implemented checks

The deterministic engine evaluates proposal flags for interest, leverage and derivatives;
transaction type; input/output asset entries; the protocol; and every declared route program.
Unknown assets or routes fail closed rather than inheriting the model's confidence.

The model cannot edit the catalog. However, proposal metadata alone is not proof of what
arbitrary transaction bytes do: production execution still needs independently validated
instructions, route evidence, simulation and on-chain enforcement.

## Current catalog examples

- **SOL:** Eligible only for direct spot ownership under the internal MVP catalog.
- **USDC:** Review pending qualified review of reserves and issuer-related mechanisms.
- **Jupiter spot router:** conditional internal eligibility for screened spot paths;
  it does not approve all assets or downstream protocols reachable through the router.
- **Orca/Raydium spot hops:** limited to the specified spot role, not blanket approval
  of liquidity provision or CLMM positions.
- **Jupiter perpetuals:** Blocked under the no-leverage/no-derivatives policy.

See the source of truth: [catalog](../backend/app/policy/catalog.py),
[methodology](../backend/app/policy/methodology.py), and
[screening implementation](../backend/app/services/shariah_engine.py).

## Paper mode is not asset approval

The virtual portfolio uses `USD_VIRTUAL` and `paper_spot_market` in a separate sandbox.
They are bookkeeping constructs, not tokens, protocols, financial contracts or a USDC
classification change. Its methodology identifier explicitly says `not-live-approval`.

## Review governance still to implement

Production review should record the reviewer, scope, evidence, effective/review dates,
version history and the handling of disputes. The current static catalog is a conservative
bootstrap; automated evidence-expiry enforcement and a qualified approval workflow are
roadmap items, not completed capabilities.
