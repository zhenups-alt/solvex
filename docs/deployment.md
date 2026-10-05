# Deploy the paper-trading MVP

[← Documentation](README.md)

This is a deployment configuration, **not confirmation of a live deployment**. Record a
public URL only after the provider reports success and the smoke checks below pass.

## Services and boundaries

- **Vercel:** React/Vite frontend. `vercel.json` supports direct links such as `/autopilot`.
- **Render:** one continuously running FastAPI process with the in-process paper worker.
- **Neon or another persistent PostgreSQL host:** profiles, signed sessions, decisions,
  virtual balances and archived paper sessions.
- **Solana Devnet:** the existing vault program; it is not redeployed by these steps.

The checked-in Render Blueprint explicitly selects **Free** to avoid silently purchasing
compute. [Render Free sleeps after 15 minutes without incoming traffic](https://render.com/docs/free).
While asleep, it cannot run Autopilot. Opening the website can wake it, but there is a cold
start and no catch-up trading. **This is a demo limitation, not 24/7 autonomy.** Choose and
approve an always-on plan/server before describing the deployed agent as continuously running.
Database and AI providers have their own quotas; a free tier is not unlimited usage.

## 1. Provision a separate cloud database

Create a new PostgreSQL database in the owner's account. Do not reuse or overwrite the local
SQLite database. Existing local paper sessions are not copied automatically; the cloud starts
with fresh application records. The Devnet vault is still discoverable from the same wallet.

Keep the connection string in the backend host's secret environment variables only. Use a
direct endpoint for this single-process MVP and migrations. The driver must be `asyncpg`:

```text
postgresql+asyncpg://USER:URL_ENCODED_PASSWORD@HOST/DATABASE?ssl=verify-full
```

For a Neon connection string, change `postgresql://` to `postgresql+asyncpg://`, use
`ssl=verify-full` instead of libpq's `sslmode=require`, and omit `channel_binding`, which is
not an asyncpg keyword. Certificate and hostname verification remain enabled. Preserve the
actual URL-encoded username/password. Never paste a real connection string into documentation,
GitHub, frontend settings or chat. Provider-specific private database connections may have
different TLS requirements; do not disable TLS for an internet-accessible database.

## 2. Reserve the frontend project, then deploy the API

Reserve the Vercel project/domain in the owner's account so its exact HTTPS origin is known.
Do not publish a frontend with a localhost or missing API address.

Create the Render service from [render.yaml](../render.yaml), using the repository root (not
`backend/`) as its root directory. The settings are:

- Build: `python -m pip install ./backend`
- Start: `python -m app.serve`
- Health check: `/ready`
- One process/instance; leave live execution disabled.

Set the following backend environment variables:

```text
SOLVEX_ENVIRONMENT=production
SOLVEX_DATABASE_URL=<private PostgreSQL asyncpg URL>
SOLVEX_CORS_ORIGINS=https://<actual-frontend-domain>
SOLVEX_AUTO_CREATE_TABLES=false
SOLVEX_EXECUTION_ENABLED=false
SOLVEX_SOLANA_CLUSTER=devnet
GEMINI_API_KEY=<backend-only key, if Gemini mode is wanted>
JUPITER_API_KEY=<backend-only key, optional for paper mode>
```

`SOLVEX_CORS_ORIGINS` accepts comma-separated exact origins, with no trailing slashes. The
first origin appears in the wallet sign-in message. Add only trusted preview domains;
do not allow every `*.vercel.app` domain. Choose separate provider-scoped API keys and explicit
quotas for a public demo. Gemini calls can consume provider quota or incur charges. Allocation
rules work without Gemini; a successful page load alone does not verify Gemini mode.

`app.serve` validates the release boundary, applies Alembic migrations through
`0003_paper_sessions`, and only then starts Uvicorn on the host's `PORT`. Migration failure
stops startup. Use this migration flow for a fresh or migration-managed database; never stamp
an existing database blindly. No wallet, upgrade-authority or agent private key is required
for paper trading or owner-signed Devnet vault operations. Do not upload those keypairs.

## 3. Deploy the frontend

Use repository root, the Vite preset, Node.js 22, and the checked-in Vercel configuration.
Set **only** the public backend origin in the frontend build environment:

```text
VITE_API_URL=https://<actual-api-domain>
```

The build deliberately fails for a missing, non-HTTPS or localhost API origin. Changing
`VITE_API_URL` requires a new frontend build. `npm run build` remains usable for local checks;
Vercel uses the stricter `scripts/build-vercel.mjs` entry point. Never use `VITE_*` for API keys,
database passwords or private signing keys: those variables are public browser code.

## 4. Release checks

1. API `/health` returns `execution_enabled: false` and `live_trading_available: false`.
2. API `/ready` returns HTTP 200 only when PostgreSQL responds and the worker task is running.
3. API `/api/v1/market/sol` returns a fresh price. An unavailable quote must prevent a fill.
4. Public frontend `/`, `/autopilot`, `/agent-config`, `/vault` and `/decisions` load directly
   and after refresh. Browser requests must go to the public API, not `localhost`.
5. In Phantom, the **user** connects and signs the free sign-in message. Save limits, start
   a small virtual session, observe a server cycle and inspect policy/risk checks.
6. Pause/resume, end/archive, and start a new virtual portfolio. Reload to verify persistence.
7. Restart the backend and verify persistence again. On an always-on plan, close the browser
   and verify later that cycles continued. A sleeping Free instance cannot pass this check.
8. Check Devnet program/account reads. If demonstrating deposits or withdrawals, the user
   approves those test-network transactions in Phantom; never call them real-profit trades.

Publish only the verified URL. If accounts, provider access, quotas, fresh market data, or
wallet confirmation are missing, report the specific incomplete check instead of calling
the entire MVP fully operational.
