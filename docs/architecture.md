# Architecture and Trust Boundaries

[← Documentation](README.md) · [Roadmap](roadmap.md)

## Current systems

Solvex has two separate execution domains:

1. **Paper Autopilot:** server-side virtual SOL/USD accounting. No deposit, token transfer,
   private key, Jupiter transaction or chain signature is part of a paper fill.
2. **Devnet vault:** an Anchor program with per-owner state and token custody accounts.
   The owner signs creation, SOL deposit/withdrawal, pause and limit changes in Phantom.

The intended future system adds validated, simulated, constrained spot execution through
Jupiter on Solana. That path is not an enabled production service.

## Components

- [`src/pages/Autopilot.tsx`](../src/pages/Autopilot.tsx): user controls, results and the paper journal.
- [`src/lib/solvexApi.ts`](../src/lib/solvexApi.ts): backend client and wallet session handling.
- [`backend/app/auth.py`](../backend/app/auth.py): expiring nonce challenges, Ed25519 verification,
  single-use challenge consumption and hashed bearer sessions.
- [`backend/app/paper_api.py`](../backend/app/paper_api.py): owner-authorized start/pause/resume and history.
- [`backend/app/services/paper_worker.py`](../backend/app/services/paper_worker.py): persisted schedule,
  market/AI requests, cycle claims and atomic commits.
- [`backend/app/services/paper_engine.py`](../backend/app/services/paper_engine.py): allocation strategy,
  proposal bounds, sandbox checks, virtual fills and cost-basis accounting.
- [`backend/app/services/shariah_engine.py`](../backend/app/services/shariah_engine.py) and
  [`risk_engine.py`](../backend/app/services/risk_engine.py): independent deterministic checks.
- [`backend/app/services/gemini_agent.py`](../backend/app/services/gemini_agent.py): structured,
  untrusted model proposals; it does not sign transactions.
- [`src/lib/vaultClient.ts`](../src/lib/vaultClient.ts): owner transaction construction and vault parsing.
- [`chain/programs/solvex_vault/src/lib.rs`](../chain/programs/solvex_vault/src/lib.rs): on-chain vault rules.

## One paper cycle

```text
Due, running account
        │
        ▼
Claim 45-second lease with account-version compare-and-swap
        │
        ▼
Fresh price + server-recorded balances and saved risk profile
        │
        ▼
Allocation proposal ──► optional Gemini recommendation
        │
        ▼
Sandbox policy + risk checks + deterministic strategy bounds
        │
        ├── HOLD / rejected ──► record explanation; no fill
        │
        └── permitted ──► calculate virtual fill and estimated costs
                                  │
                                  ▼
                  Commit balances + event in one DB transaction
```

- A cycle must still own the expected account version when it commits.
- Pause and profile changes invalidate in-flight work by advancing that version.
- Duplicate workers cannot commit the same cycle. A lease expires after a crash.
- Stale/invalid data produces an error event and a scheduled retry, not a fill.
- Price freshness is checked again after a model response; the AI request has a timeout.
- Missed intervals do not create a burst of catch-up trades after a restart.

## Accounting and strategy

Allocation v1 targets 30%, 50% or 70% SOL for Conservative, Balanced or Growth.
It rebalances outside a five-percentage-point band, subject to holdings, trade size,
UTC-day turnover and cooldown. Exceeding peak drawdown changes the target to zero;
protective sells remain subject to the other limits. This is not a guaranteed stop-loss.

The starting principal is fixed. Estimated fills include 10 bps adverse slippage,
a 10 bps fee and a $0.01 fixed fee. Buys include costs in SOL basis; sells release
weighted-average basis. Total P&L equals realized plus unrealized P&L after those costs.
Real liquidity, market impact and dynamic chain fees are not modeled.

## Trust boundaries and limitations

- **Wallet → API:** a sign-in message proves ownership for settings and paper controls;
  it does not authorize a blockchain transfer.
- **AI → engines:** model output is a proposal, not approval. It must stay within the
  deterministic strategy direction, amount, route and slippage constraints.
- **Paper → production:** `USD_VIRTUAL` and `paper_spot_market` exist only in the sandbox
  catalog. USDC's production `Review` status is not changed by paper trading.
- **API → chain:** current owner actions are constructed separately and signed by Phantom.
  Paper state must never be treated as a real vault balance or executable quote.
- **USD → token units:** Devnet limits are converted at a quoted SOL price and remain fixed
  token amounts until the owner updates them. There is no continuously enforced on-chain USD oracle.
- **Public release:** manual analysis accepts client-supplied snapshots; profile and manual
  decision reads are not yet private. Do not expose this development server as a production
  custody service. See [Security](../SECURITY.md).

## Repository map

```text
src/                     React interface and Solana client
backend/app/             FastAPI, authentication, policy/risk and paper worker
backend/tests/           Python regression tests
backend/alembic/         Database migrations
chain/                   Anchor vault and Rust tests
scripts/                 Local runner and documentation checks
docs/                    Setup, architecture, methodology, demo and roadmap
assets/                  Repository banner and labeled UI preview
.github/workflows/       Non-deploying CI
server/                  Legacy Express wallet-sync code; not started by npm run dev
```
