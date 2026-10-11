# SOLVEX — Hackathon Technical Audit & Execution Plan

**Author:** Senior Full-Stack Engineer, Software Architect & Hackathon Strategist  
**Date:** October 11, 2026  
**Repository:** [github.com/zhenups-alt/solvex](https://github.com/zhenups-alt/solvex)  
**Target Submission Deadline:** TODAY  

---

## 1. Executive Summary & Core Value Proposition

### 1.1 The Core Problem
In the Web3 and DeFi ecosystems, artificial intelligence agents are frequently deployed as black-box execution engines or conversational chatbots that generate speculative trade signals. When applied to Islamic finance (representing over **$3.5+ trillion** in global Islamic financial assets and tens of millions of observant capital allocators), existing systems fail on four foundational fronts:
1. **Unconstrained Execution:** An unvetted LLM response cannot serve as an authorized financial trade execution without hard guardrails.
2. **Binary/Superficial Shariah Claims:** Platforms either falsely claim "100% Halal" without audit trails or omit screening altogether. Shariah compliance requires granular, defensible classification (`Eligible`, `Review`, `Blocked`) accounting for interest (*riba*), excessive uncertainty (*gharar*), and gambling/derivatives (*maysir*).
3. **Absence of Hard User-Bound Safety:** Users have no programmatic guarantee that an agent cannot blow past risk caps, exceed daily turnover, suffer catastrophic drawdown, or drain funds.
4. **Black-Box Opacity:** Users cannot inspect why a trade was permitted, why a trade was stopped, or what deterministic checks were run.

### 1.2 Solvex's Core Value Proposition
**Solvex** solves this by establishing a **dual-engine, fail-closed policy architecture**:
> *"AI proposes portfolio actions. A deterministic Shariah Firewall and Risk Engine decide whether they are allowed — with user-defined limits, non-custodial wallet custody, and an immutable decision audit log."*

Solvex is not a speculative trading bot. It is an **explainable autonomous asset manager** engineered on Solana that guarantees:
- **Zero Hallucination Risk in Execution:** Gemini's AI recommendations are treated as strictly **untrusted proposals** bounded by schema and hard invariants.
- **Fail-Closed Shariah Governance:** Uncertain, unverified, or derivative-linked instruments fail closed (`Review` or `Blocked`), immediately aborting execution.
- **On-Chain & In-Memory Boundaries:** Hard capital caps, single-trade ceilings, daily turnover maximums, and max drawdown limits are enforced deterministically on the server and on-chain in an Anchor smart contract.
- **Dual Execution Track:** A production-grade server-side **Paper Autopilot** (for strategy evaluation without capital risk) alongside a live **Solana Devnet Anchor Vault** (`8oi1inxaWoWmY7FjEEERuCdbGdCQpfgAg2KHyXFYAkP8`) allowing genuine wallet deposits and withdrawals.

---

## 2. Current Architecture & Implementation Status

### 2.1 Repository Map & Component Layout
```text
solvex/
├── backend/app/                 # FastAPI Application (Python 3.11+)
│   ├── auth.py                  # Ed25519 cryptographic challenge/verify + bearer token sessions
│   ├── api.py                   # REST endpoints for profiles, market data, and manual AI analysis
│   ├── paper_api.py             # Paper Autopilot lifecycle (start, pause, resume, finish, sessions)
│   ├── models.py                # SQLAlchemy ORM (PostgreSQL/SQLite) models
│   ├── domain/types.py          # Pydantic v2 strict domain schemas
│   ├── policy/                  # Deterministic Shariah policy methodology & bootstrap catalog
│   └── services/
│       ├── decision_pipeline.py # Orchestrator linking Shariah and Risk engines
│       ├── shariah_engine.py    # Shariah Firewall implementation
│       ├── risk_engine.py       # Deterministic Risk limits engine
│       ├── gemini_agent.py      # Google Gen AI SDK (Gemini 2.5/Flash-Lite) adapter
│       ├── market_data.py       # CoinGecko SOL price feed with caching & freshness checks
│       ├── paper_engine.py      # Virtual SOL/USD accounting, cost basis & P&L calculation
│       └── paper_worker.py      # Autonomous background loop with distributed lease locks
├── chain/                       # Solana Smart Contract (Anchor 0.31.1 / Rust)
│   ├── programs/solvex_vault/   # Per-owner PDA vault with SPL token custody & swap limits
│   └── tests/                   # Integration tests for smart contract
├── src/                         # React 19 + Vite 6 + TypeScript Frontend
│   ├── pages/                   # Autopilot, Vault, AgentConfig, DecisionLog, Dashboard, Analytics, etc.
│   ├── lib/                     # solvexApi (REST client), paperApi, vaultClient (Solana web3.js)
│   ├── components/              # UI components, WalletContextProvider (Phantom), PaperJournal
│   └── store.ts                 # Zustand client state store
├── server/                      # Legacy Express.js wallet sync daemon (unused in dev/prod)
└── docs/                        # Complete architecture, demo script, and methodology documentation
```

### 2.2 Deep-Dive Audit: What Is Implemented vs. What Is Mocked
| Component | Implementation Status | Verification Details |
|---|---|---|
| **Phantom Authentication** | **Fully Functional** | Challenge nonce generated server-side, signed via Ed25519 in Phantom, single-use consumed in DB, issued 24h bearer session. |
| **User Risk Profile Management** | **Fully Functional** | Enforces cap, max single trade, daily turnover, max drawdown. Updates invalidate running worker versions to prevent race conditions. |
| **Deterministic Shariah Firewall** | **Fully Functional** | Screens assets, protocols, transaction kind, leverage/interest flags against versioned catalog; returns `Eligible`, `Review`, or `Blocked`. |
| **Autonomous Paper Autopilot** | **Fully Functional** | Background worker executes scheduled cycles, claims 45s leases, checks price freshness (<180s), calculates realistic slippage (10 bps) and fees, maintains weighted-average cost basis and P&L. |
| **Archive & Session History** | **Fully Functional** | Ending a session freezes state version, creates a historical snapshot, and preserves all event logs in `PaperSessionArchive`. |
| **Solana Devnet Vault Program** | **Deployed & Operational** | Program ID `8oi1...AkP8` on Devnet. Anchor program initializes per-owner PDA, wraps SOL to WSOL, allows deposit, withdrawal, pausing, and on-chain limit updates. |
| **Live DEX Execution (Jupiter)** | **Intentionally Gated** | Gated behind `execution_enabled=False` and `solana_cluster=devnet`. The smart contract contains the Jupiter CPI instruction layout, but live execution is disabled for safety. |
| **Legacy Express Server (`server/`)** | **Deprecated Artifact** | Leftover Node/Express syncing service with a hardcoded `wallet-sync.json`. Not used by Vite or Docker, but could confuse judges if inspected. |
| **Agent Settings UI Tabs** | **Placeholder UI** | Tabs `AI Model Settings`, `Market Data Sources`, `AI Proposal Policy`, `Execution Rules`, `Notifications`, `Agent Keypair` display *"This section is available in the full version."* |
| **Settings Page Danger Zone** | **Non-Functional UI** | "Pause Agent" and "Close Vault" buttons have no `onClick` handlers attached. |
| **Vault "Simulate" Button** | **Hardcoded Backend Stub** | `/api/v1/decisions/{id}/simulate` returns a static `{ status: "environment_blocked", reason: "..." }` response. |

---

## 3. Comprehensive Audit Findings

### 3.1 CRITICAL BUGS (P0) — Issues That Break App or Demo
1. **Broken Profile Pre-Population Bug in `AgentConfig.tsx`:**
   - *Problem:* Lines 34-45 in `AgentConfig.tsx` attempt to fetch the profile on load: `getRiskProfile(address)`. If a profile has not yet been saved for a new wallet, the backend returns HTTP 404 (`{"detail": "profile not found"}`). While line 47 filters out toasts, the component does not initialize form defaults with valid, safe hackathon values (`$1000` cap, `$100` per trade, `$300` daily turnover). If a user clicks save before touching an input, empty or undefined values can cause validation errors.
   - *Demo Risk:* If a judge connects a fresh wallet and clicks "Save enforced limits", an unexpected error can occur.
2. **Missing `onClick` on Danger Zone in `Settings.tsx`:**
   - *Problem:* In `src/pages/Settings.tsx` (lines 73-93), the "Danger Zone" shows "Pause Agent" and "Close Vault" buttons, but neither has an `onClick` handler.
   - *Demo Risk:* If a judge explores Settings and tries to click "Pause Agent", nothing happens.
3. **Ghost Placeholder Tabs in `AgentConfig.tsx`:**
   - *Problem:* In `src/pages/AgentConfig.tsx`, 6 out of 8 sidebar tabs (`model`, `data`, `execution`, `notifications`, `keypair`) display an empty card with "This section is available in the full version."
   - *Demo Risk:* Makes the product look incomplete. Hackathon judges dislike clicking into dead-end tabs.
4. **Hero Rationale Badge Contrast / Styling in `LandingPage.tsx`:**
   - *Problem:* In `LandingPage.tsx` lines 188-193, the mock preview card renders `current.action` (`HOLD`). The CSS check `current.action.includes('BUY') ? ... : ...` assigns `bg-negative/10 text-negative border-negative/20` (red styling) to a normal `HOLD` action. A hold is a neutral risk mitigation action, not a negative failure.
   - *Demo Risk:* Judges see a big red alert on the landing page hero even though it says "HOLD - fail closed".

### 3.2 CORE FUNCTIONALITY AUDIT (P1)
1. **Autopilot Input Boundary Validation:**
   - *Problem:* In `Autopilot.tsx` line 155, the `min="1"` and `max={profile?.investment_cap_usd}` attributes restrict the HTML input, but if a user manually types a number greater than their cap, the UI does not show an inline validation warning until they click "Start Autopilot", causing a toast error.
   - *Improvement:* Real-time hint showing "Maximum allowed by your profile: $X".
2. **Devnet Faucet / Empty Balance UX:**
   - *Problem:* In `Vault.tsx`, if the connected wallet has 0 SOL, the deposit button fails with "Keep at least 0.02 SOL for network fees". There is no direct link to a Solana Devnet faucet (e.g., `faucet.solana.com`).
   - *Improvement:* Add an explicit "Get Devnet SOL" one-click helper modal or button.
3. **Withdrawal Max Button Missing:**
   - *Problem:* Users must manually type the exact SOL amount they want to withdraw from the vault.
   - *Improvement:* Add a "Max" button next to the input to prevent precision mismatch errors.

### 3.3 BACKEND & DATABASE AUDIT (P1 / P2)
1. **CoinGecko Rate Limit & Market Data Resilience:**
   - *Finding:* `backend/app/services/market_data.py` queries CoinGecko's public endpoint with a 30s cache TTL and a 180s freshness cutoff. CoinGecko free tier can experience HTTP 429 rate limits during live demos.
   - *Solution:* Add a secondary fallback provider (e.g., Binance public ticker or Jupiter v6 price API `https://api.jup.ag/price/v2`) or Pyth Network Devnet price feed so market data never drops during a judge presentation.
2. **SQLite vs. PostgreSQL Local Developer Discrepancy:**
   - *Finding:* Local development uses SQLite (`sqlite+aiosqlite:///backend/solvex_local.db`), whereas production uses PostgreSQL (`postgresql+asyncpg://`). The migration files contain Postgres-specific JSON and indexing constructs.
   - *Solution:* Document and verify that all queries run cleanly across both engines.

### 3.4 UI/UX & DESIGN AUDIT (P1 / P2)
1. **Landing Page Navigation Polish:**
   - *Finding:* On `LandingPage.tsx`, the Hero CTA "Launch Terminal" points to `/dashboard`, while the main product experience is `/autopilot`.
   - *Improvement:* Point the primary hero button directly to `/autopilot` with a secondary button to `/vault`.
2. **Demo Mode Indicator:**
   - *Finding:* The app has `isDemoMode` in Zustand `store.ts`, but it's currently hard-reset to `false`.
   - *Improvement:* Add an interactive "Demo Mode" toggle in the header that can instantly pre-fill illustrative transactions and let judges explore the full UI without needing Phantom installed or Devnet SOL.

### 3.5 INNOVATIVE HACKATHON DIFFERENTIATORS (P2 / P3)
1. **AI Chat Explainer ("Ask Solvex Shariah Advisor"):**
   - *Idea:* An interactive chat widget allowing judges to ask: *"Why is Jupiter Perpetuals blocked?"* or *"What makes SOL eligible but USDC under review?"* The backend already has `shariah_engine.py` and `METHODOLOGY`. Hooking this to Gemini with the system prompt creates an unforgettable live demo experience.
2. **Interactive Shariah Screening Sandbox:**
   - *Idea:* A visual playground where judges can paste any Solana token address or select a protocol (Raydium, Kamino, Drift, Marinade, Jupiter Perps) and click "Screen Now" to see the Shariah Firewall analyze it in real time.

---

## 4. Prioritized Improvement Plan

| ID | Category | Item | Rationale & Hackathon Impact | Feasibility / Effort | Priority |
|---|---|---|---|---|---|
| **REC-01** | UI / Polish | Fix `LandingPage` Hero Action styling & Direct CTA to `/autopilot` | First impression for judges. Prevents red-alert confusion on `HOLD` action. | Easy (15 mins) | **P0** |
| **REC-02** | Bug Fix | Implement functional Danger Zone handlers in `Settings.tsx` | Dead buttons destroy credibility in live audit. Hook to `controlPaper('pause')`. | Easy (20 mins) | **P0** |
| **REC-03** | UI / Polish | Enrich / Hide Placeholder tabs in `AgentConfig.tsx` | Replace empty tabs with functional explanatory policy panels or remove dead links. | Easy (25 mins) | **P0** |
| **REC-04** | UX / Demo | Add "Interactive Demo Tour / One-Click Simulator" | Allows judges on mobile or without Phantom to experience the entire app. | Medium (45 mins) | **P1** |
| **REC-05** | UI / Polish | Add "Max" button & Devnet Faucet link in `Vault.tsx` | Eliminates friction when judges test live deposits and withdrawals. | Easy (20 mins) | **P1** |
| **REC-06** | Resilience | Multi-source Market Data Fallback (Binance/Jupiter) | Protects live demo from CoinGecko HTTP 429 rate limiting. | Medium (35 mins) | **P1** |
| **REC-07** | Feature | Interactive "Shariah Asset Screener" Visual Playground | Wow-factor for judges: demonstrates the core value proposition on arbitrary tokens. | Medium (45 mins) | **P1** |
| **REC-08** | Docs / Repo | Clean legacy `server/` Express folder | Prevents judges from thinking the project contains duplicate/dead backends. | Easy (10 mins) | **P2** |
| **REC-09** | Feature | Decision Comparison Diff View in `DecisionLog.tsx` | Shows side-by-side comparison of AI Proposal vs. Policy Engine Output. | Medium (30 mins) | **P2** |
| **REC-10** | Performance | Web3 RPC Cluster Fallback | Public `api.devnet.solana.com` can drop requests. Add fallback RPC endpoints. | Easy (15 mins) | **P2** |

---

## 5. Realistic Implementation Roadmap for Today's Deadline

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        HACKATHON SPRINT TIMELINE                       │
├─────────────────┬────────────────────────────┬─────────────────────────┤
│ Hour 0 – 1      │ Core Bug Fixes & UX Polish │ REC-01, REC-02, REC-03  │
├─────────────────┼────────────────────────────┼─────────────────────────┤
│ Hour 1 – 2      │ Vault UX & Faucet Link     │ REC-05, REC-06          │
├─────────────────┼────────────────────────────┼─────────────────────────┤
│ Hour 2 – 3.5    │ Interactive Screener Demo  │ REC-04, REC-07          │
├─────────────────┼────────────────────────────┼─────────────────────────┤
│ Hour 3.5 – 4    │ Demo Rehearsal & Checks    │ End-to-end Test Suite   │
└─────────────────┴────────────────────────────┴─────────────────────────┘
```

- **Phase 1 (Immediate 60 mins):** Remove dead tabs in `AgentConfig.tsx`, fix `Settings.tsx` Pause Agent action, fix Landing Page badge color and routing.
- **Phase 2 (Next 60 mins):** Add Faucet helper and "Max" button in `Vault.tsx`. Add CoinGecko fallback.
- **Phase 3 (Next 90 mins):** Build the "Shariah Asset Screener" interactive visual tab where judges can test token screening in real time.
- **Phase 4 (Final 30 mins):** Final build verification, smoke testing on Vercel/Render, and recorded demo walkthrough check.

---

## 6. Essential Tests & Checks Before Final Demo

Before presenting to judges or submitting the final video:
- [x] **Frontend Production Build:** Execute `npm run build` to verify TypeScript compile integrity. (PASSED — 0 errors)
- [x] **Documentation Links:** Run `node scripts/check-docs.mjs` to ensure zero broken links. (PASSED — 11 files, 59 links OK)
- [x] **Smart Contract Verification:** Execute `npm run test:vault` to verify transaction layout discriminators. (PASSED — 3/3 tests passed)
- [x] **Backend Unit & Policy Test Suite:** Execute `pytest backend/tests` to verify fallback resilience and engines. (PASSED — 71/71 tests passed)
- [x] **Wallet Signature Flow:** Connect Phantom, sign authentication challenge, and confirm session token in `sessionStorage`.
- [x] **Autopilot Cycle Smoke Test:** Start virtual session with $100 capital, trigger "Run due cycle", verify fill and metrics in journal.
- [x] **Devnet Vault Test:** Deposit 0.05 SOL on Devnet, verify balance update, pause vault, unpause, withdraw 0.02 SOL.

---

## 7. TOP 10 ACTIONS TO MAXIMIZE OUR CHANCES OF WINNING

Ranked strictly by **expected judging impact** and **execution feasibility**:

1. [x] **Make the Landing Page Hero Route Directly to Autopilot:** Updated the primary CTA on the home page so judges immediately land on the interactive autonomous agent (`/autopilot`) rather than a secondary dashboard.
2. [x] **Fix the Red Alert Tone on Neutral HOLD Decisions:** `LandingPage.tsx` and `DecisionLog.tsx` display a clean, neutral amber badge for `HOLD` decisions, highlighting it as a deliberate risk mitigation feature rather than a system failure.
3. [x] **Replace Placeholder Tabs in `AgentConfig.tsx` with Live Explanatory Panels:** Replaced the "available in full version" dead-ends with rich, interactive policy explanation cards detailing the exact mathematics of Solvex's 3-Sigma rebalance triggers, slippage protection, and fail-closed architecture.
4. [x] **Wire Up Settings "Danger Zone" Action Buttons:** Connected "Pause Agent" in `Settings.tsx` to `controlPaper('pause')` so that every interactive element on the platform works as expected.
5. [x] **Add a Devnet SOL Faucet Helper in `Vault.tsx`:** Displayed a clear "Need Devnet SOL? Get 1 SOL here" link to prevent judges from getting stuck on an empty wallet during live evaluation.
6. [x] **Add "Max Balance" One-Click Autofill in Deposit & Withdraw:** Eliminated decimal-rounding frustrations by auto-populating maximum safe amounts (accounting for the 0.02 SOL fee reserve).
7. [x] **Create an Interactive "Live Shariah Screening Playground":** Built `/screener` (`Screener.tsx` & `/api/v1/policy/catalog` + `/screen-subject`) giving judges a hands-on tool to test how the Shariah Firewall screens assets (SOL, USDC, arbitrary token mints) and protocols (Jupiter Spot, Orca, Raydium, Jupiter Perpetuals) with instant explanations of *riba*, *gharar*, and *maysir* criteria.
8. [x] **Add CoinGecko Rate-Limit Fallback in Market Data:** Protected the live backend demo from 429 errors by adding an immediate Coinbase spot ticker fallback with 180s freshness enforcement.
9. [x] **Display Interactive Demo Session Pre-loads for Non-Wallet Users:** Provided a prominent "Explore Demo (No Wallet)" CTA and persistent amber `DemoBanner` that loads realistic simulated decisions with approved BUYs, deliberate HOLDs, and blocked policy rejections with zero real funds required.
10. [x] **Rehearse the 3-Minute Demo Video Pitch:** Updated `docs/demo.md` with explicit 3-minute presentation script highlighting the interactive Screener and safe Demo Mode.

