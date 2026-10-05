# Development Guide

[← Back to Solvex](../README.md) · [Documentation](README.md) · [Architecture](architecture.md)

Run commands from the repository root unless a section explicitly changes directory.
These notes preserve the implementation and setup details behind the project overview.

Solvex is an autonomous Solana asset manager built around a fail-closed Shariah
policy and risk pipeline.

The AI can propose a portfolio action. It cannot approve or execute its own proposal:

```text
Market snapshot → AI proposal → Shariah Policy Engine → Risk Engine
                → transaction simulation → constrained vault execution → Decision Log
```

Any `Review`, unknown asset, unknown route program, missing evidence, failed risk check,
or failed simulation stops automatic execution.

> Solvex does not claim that an asset is universally or “100% halal.” `Eligible` means
> that no blocking condition was found under a specific, versioned technical methodology
> and that the item was explicitly approved in that version's catalog. It is not a fatwa.

## Current implementation

- React + Vite + TypeScript interface
- Phantom wallet connection on Solana Devnet
- FastAPI backend
- PostgreSQL persistence (SQLite may be used for local smoke tests)
- Versioned `Eligible / Review / Blocked` Shariah screening
- Deterministic investment cap, per-trade, turnover, slippage, and drawdown checks
- Persistent explainable Decision Log
- Gemini adapter using the official Google Gen AI SDK and structured output
- Per-user Anchor vault with owner-only custody, pause/revoke, and on-chain limits
- Anchor vault deployed on Solana Devnet
- Owner-signed Devnet vault pause/resume and application of saved limits on-chain
- Execution feature flag defaults to off
- Autonomous paper portfolio at `/autopilot`: start/pause/resume, persistent server-side cycles,
  virtual SOL/USD balances, cost-basis accounting, P&L, fees, drawdown, and exportable events
- Wallet-signed authentication for profile changes, analysis requests, and paper-agent control
- English by default; an explicitly saved Russian preference is preserved

The Jupiter Router/CPI path is implemented in the vault boundary, but live execution remains
off until a Jupiter API key is configured, a route passes the policy catalog, simulation
succeeds, and mainnet readiness is explicitly approved. Canonical Jupiter v6 is not available
as a Devnet SBF program, so the Devnet deployment cannot be presented as a live Jupiter swap
environment. No private wallet key belongs in the frontend or database.

## Run locally

Complete the Python backend setup below first. Then one command starts both Vite and FastAPI,
including the background paper worker:

```bash
npm install
cp .env.example .env.local
npm run dev
```

The app is served at `http://localhost:3000/autopilot`. Keep the terminal running. Closing a
browser tab does not stop the worker; stopping the backend or sleeping the computer does.
After restart, persisted running accounts resume from their next due cycle. There is no
catch-up burst for cycles missed while the server was offline.

Use `npm run dev:web` only if you intentionally run the API in a separate terminal.

## Run PostgreSQL

Start Docker Desktop, then:

```bash
docker compose up -d postgres
```

### Local SQLite alternative

For a fresh, disposable local setup without Docker, set the following in `backend/.env`:

```env
SOLVEX_DATABASE_URL=sqlite+aiosqlite:///./backend/solvex.db
SOLVEX_AUTO_CREATE_TABLES=true
SOLVEX_EXECUTION_ENABLED=false
```

Install the `[dev]` extras from the repository root, then run `npm run dev`. SQLite is
appropriate for a local demo, not a substitute for testing a production PostgreSQL deployment.
Do not switch an existing funded/test session to a new database without preserving its records.

## Run the FastAPI backend

Python 3.11 or newer is required.

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -e './backend[dev]'
cp backend/.env.example backend/.env
.venv/bin/alembic -c backend/alembic.ini upgrade head
npm run dev
```

The copy commands above are for a fresh checkout. Preserve existing environment files and keys.
The project runner expects the virtual environment at the repository root. On Windows, use
`.venv\Scripts\python.exe` and the corresponding executables in `.venv\Scripts\`.

API documentation is available at `http://localhost:8080/docs`.

`alembic upgrade head` is for a database managed by migrations. Existing local databases
created with `SOLVEX_AUTO_CREATE_TABLES=true` automatically receive the new paper/auth tables
on startup; do not blindly stamp or overwrite an existing database to resolve a migration error.

## Autonomous virtual portfolio

1. Connect Phantom and save risk limits. The first protected action requests a free message
   signature (not a transaction). Challenges expire after five minutes and cannot be replayed.
2. Open **Autopilot**, sign in if requested, choose an initial virtual USD balance within your
   saved cap and an interval (1–60 minutes), acknowledge paper mode, then start.
3. The server runs **Allocation v1**: Conservative/Balanced/Growth target 30/50/70% SOL and
   rebalance when allocation differs by at least five percentage points. Trades are bounded by
   available holdings, per-trade limit and UTC daily turnover. A cooldown equals the interval.
   Exceeding the peak drawdown limit changes the target to zero; permitted sells remain subject
   to turnover limits. This is not a guaranteed stop-loss or a validated profitable strategy.
4. Each cycle uses a fresh CoinGecko SOL price (maximum age 180 seconds). An unavailable or
   stale price creates an error event and a scheduled retry, with no fill or balance mutation.
5. Paper fills assume adverse slippage of 10 bps, a 10 bps variable fee, and a $0.01 fixed fee.
   They do not model actual DEX liquidity, market impact or dynamic network fees. The UI shows
   the price timestamp and marks stale valuations. This is forward paper testing, not a backtest.
6. Buys add all costs to SOL cost basis; sells release weighted-average cost basis. Total P&L
   equals realized plus unrealized P&L after estimated costs. Initial capital stays fixed and is
   never recomputed from a changing SOL price. No real wallet or vault balance funds this ledger.
7. Pause/resume from the UI. Saving new risk limits pauses a running agent; resume loads the new
   profile. Journal and balances commit in one database transaction with a version compare-and-swap,
   so duplicate workers cannot commit the same tick and pause invalidates in-flight work.
   A 45-second persisted lease also prevents duplicate model requests and expires after a crash.
8. To start over with a different virtual balance, interval or decision source, choose **End
   session**, then **Confirm end session**. This stops future cycles and archives the current
   state and complete journal. It does not sell assets or interact with the Devnet vault. The
   snapshot uses the last recorded price, which can be stale; it is not liquidation proceeds.
   The setup form reappears for a fresh portfolio. Completed sessions cannot be resumed; inspect
   them under **Completed sessions**, load older events, or export the loaded events and snapshot.
   Wallet ledger versions continue increasing across sessions so an old worker cannot commit
   to a replacement portfolio. Retried confirmations identify the original session, not its successor.

The archive requires the `0003_paper_sessions` migration for migration-managed databases.
Local installations with `SOLVEX_AUTO_CREATE_TABLES=true` create the new archive table on
backend restart without modifying existing portfolio or journal records.

Paper mode uses `USD_VIRTUAL` and `paper_spot_market` in a separate, explicitly sandbox-only
catalog. These do **not** exist in the production catalog. USDC remains **Review**. Sandbox
checks are not Shariah certification and paper fills never create a transaction signature.
The default decision source is **Allocation rules**, which makes no LLM API calls. Select
**Gemini** when starting the portfolio to ask the model for a proposal whenever the allocation
strategy permits a trade. Its proposal must stay within the permitted direction, size and
spot-only sandbox route, then pass the policy and risk engines. The model can choose HOLD;
missing/invalid responses and a 20-second timeout fail closed. Gemini mode uses the configured
API key and may incur provider charges. Quotes are checked for freshness again after the AI call.

Current release boundary: Devnet deposits/withdrawals and autonomous virtual accounting work.
Mainnet signing/submission, validated Jupiter CPI route construction, independent contract
audit, qualified asset/protocol screening, deployment operations, and demonstrated strategy
performance remain outstanding before public deposits. Changing `SOLVEX_EXECUTION_ENABLED`
alone cannot turn the paper worker into live trading. Existing manual analysis snapshots are
client-supplied and must not be reused as an authoritative live execution ledger.

Implementation references: [Phantom message signatures](https://docs.phantom.com/solana/signing-a-message)
and [CoinGecko price freshness](https://docs.coingecko.com/reference/simple-price).

`GEMINI_API_KEY` is optional for policy and risk development. Keep it only in
`backend/.env`; never expose it through a `VITE_*` variable.

Create project-scoped API credentials in the provider dashboards, then paste them into
the ignored `backend/.env` file:

```env
GEMINI_API_KEY=
JUPITER_API_KEY=
```

- Gemini keys: `https://aistudio.google.com/apikey`
- Gemini pricing: `https://ai.google.dev/gemini-api/docs/pricing`
- Jupiter Developer Portal: `https://developers.jup.ag/portal`

The Gemini key is a backend-only credential. The Jupiter key uses the `jup_...` format
and is sent to `api.jup.ag` in the `x-api-key` header. Do not paste either key into GitHub,
the frontend, screenshots, or chat messages.

## Build the Solana vault

The new program lives in `chain/` and has program ID
`8oi1inxaWoWmY7FjEEERuCdbGdCQpfgAg2KHyXFYAkP8`.

```bash
export PATH="$HOME/.cargo/bin:$HOME/.local/share/solana/install/active_release/bin:$PATH"
cd chain
avm use 0.31.1
cargo test --workspace
anchor build
```

Program and deploy-authority keypairs are generated under `chain/target/deploy/`, which is
gitignored. They are development credentials and must be backed up separately before a Devnet
deployment. The deployer address is `BPzBkymfdWFywUYD851PcW9w6Xv6o3qb8nChx7RhxDt5`.

The program was deployed to Devnet in slot `506626832`:

- Program ID: `8oi1inxaWoWmY7FjEEERuCdbGdCQpfgAg2KHyXFYAkP8`
- Upgrade authority: `BPzBkymfdWFywUYD851PcW9w6Xv6o3qb8nChx7RhxDt5`
- Deployment signature: `5uqL3bTx5QsCGSakXW9twdWmbMpjBtkCnZteZyGAsEctdNxd65vWZXffhQYBfh4Fr53PLdonL1vgHTLmS4YPQfYM`

## Verify

```bash
.venv/bin/ruff check backend
.venv/bin/pytest -q backend/tests
npm run lint
npm run build
npm run test:vault
```

## Security boundary for autonomous execution

The user-controlled investment cap is enforced twice: USD-denominated in FastAPI and in the
base mint's smallest unit on-chain. The on-chain design is:

1. The user deposits no more than the chosen principal into a dedicated vault PDA.
2. The vault records owner, delegated agent, pause state, limits, and approved assets/programs.
3. The agent can invoke only explicitly supported spot-swap paths.
4. Withdrawals can return assets only to the owner.
5. Policy/risk decisions and simulation results are persisted before execution.
6. Backend compromise must not grant access to assets outside the vault or bypass its limits.

The existing `vault-dev` program remains untouched: its upgrade-authority keypair is not in the
repository and its Raydium CLMM position flow is outside the Solvex spot-only MVP.
