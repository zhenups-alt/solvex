# Solvex

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
- OpenAI Responses API adapter with strict structured output
- Per-user Anchor vault with owner-only custody, pause/revoke, and on-chain limits
- Anchor vault deployed on Solana Devnet
- Execution feature flag defaults to off

The Jupiter Router/CPI path is implemented in the vault boundary, but live execution remains
off until a Jupiter API key is configured, a route passes the policy catalog, simulation
succeeds, and mainnet readiness is explicitly approved. Canonical Jupiter v6 is not available
as a Devnet SBF program, so the Devnet deployment cannot be presented as a live Jupiter swap
environment. No private wallet key belongs in the frontend or database.

## Run the frontend

```bash
npm install
cp .env.example .env.local
npm run dev
```

The app is served at `http://localhost:3000`.

## Run PostgreSQL

Start Docker Desktop, then:

```bash
docker compose up -d postgres
```

## Run the FastAPI backend

Python 3.11 or newer is required.

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -e './backend[dev]'
cp backend/.env.example backend/.env
.venv/bin/alembic -c backend/alembic.ini upgrade head
.venv/bin/uvicorn app.main:app --app-dir backend --reload --port 8080
```

API documentation is available at `http://localhost:8080/docs`.

`OPENAI_API_KEY` is optional for policy and risk development. Keep it only in
`backend/.env`; never expose it through a `VITE_*` variable.

Create project-scoped API credentials in the provider dashboards, then paste them into
the ignored `backend/.env` file:

```env
OPENAI_API_KEY=
JUPITER_API_KEY=
```

- OpenAI keys: `https://platform.openai.com/api-keys`
- OpenAI billing: `https://platform.openai.com/settings/organization/billing/overview`
- Jupiter Developer Portal: `https://developers.jup.ag/portal`

The OpenAI key is displayed in full only once. The Jupiter key uses the `jup_...` format
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
