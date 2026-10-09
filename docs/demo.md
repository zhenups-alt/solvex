# Three-Minute Demo Recording Guide

[← Documentation](README.md)

The pitch and product demo have been recorded for the Colosseum submission. This guide
documents the product walkthrough; public video links can be added when available.
The [live MVP](https://solvex-mvp.vercel.app) is available to explore with a connected wallet.

## Preparation

- Set the UI to English and connect Phantom before recording. Never show keys or environment files.
- Save an example profile: $100 capital, $10 per trade, $100 daily turnover, 10% drawdown.
- Prepare a virtual portfolio with a few recorded decisions. No Devnet deposit is needed for paper mode.
- Record short clips and cut waiting time. Do not alter HOLD decisions into apparent fills.
- If a portfolio already exists, show Resume instead of trying to create it again.
- Keep paper results and Devnet custody visibly separate. Do not show an illustrative replay as live performance.

## 00:00–00:20 — Introduce Solvex

**Screen:** home page, then Autopilot.

> Meet Solvex, a Shariah-aware asset manager built for Solana. Our goal is simple: let users
> define their investment boundaries, then automate portfolio decisions within those boundaries.
> This demo shows our working paper-trading MVP, without moving real funds.

## 00:20–00:40 — Set user limits

**Screen:** Agent limits; highlight the four fields and save. Cut signature-wait time if needed.

> First, the user connects a wallet and sets clear limits. Here, we allow one hundred dollars
> in virtual capital, with a ten-dollar maximum per trade. Daily turnover and drawdown limits
> add further controls. These settings are enforced independently of the AI.

## 00:40–01:00 — Configure Autopilot

**Screen:** balance, interval and decision-source controls, including the Gemini option.
For an existing account, show its recorded decision source and active limits instead.

> Next, we configure Autopilot. Users choose a virtual starting balance, a checking interval,
> and a decision source. Solvex supports deterministic allocation rules or Gemini recommendations.
> In Gemini mode, the model can suggest a permitted trade or choose to hold.

## 01:00–01:20 — Start the agent

**Screen:** acknowledge paper mode and Start Autopilot, or Resume agent. Show Running on server.

> Once started, the backend checks the portfolio automatically. Closing the browser does not
> stop the agent, provided the backend remains running. Every proposed action must pass policy
> and risk checks. Missing or invalid market data prevents a virtual trade.

## 01:20–01:45 — Show the Shariah Firewall

**Screen:** open Show sandbox policy and risk checks in the Autopilot journal.

> This is our core feature: the Shariah Firewall. It screens transaction types, assets,
> protocols, and routes, including restrictions on leverage, derivatives, and interest-based
> mechanisms. The methodology distinguishes Eligible, Review, and Blocked. Uncertain cases
> do not receive automatic approval. This is structured screening, not universal halal certification.

## 01:45–02:10 — Explain a decision

**Screen:** rationale, then capital, trade, turnover, slippage and drawdown checks.

> Each decision has an explanation and a visible checklist. We can inspect the proposed
> action, its rationale, and the outcome of each policy and risk check. A recommendation alone
> is not permission to execute. The independent engines can reject it, and the journal records
> that outcome.

If the selected decision is HOLD, replace the final sentence with:

> Here, the agent chose to hold. No trade was needed, and no funds moved.

## 02:10–02:30 — Inspect portfolio results

**Screen:** virtual equity, P&L after costs, cash, SOL, allocation and fees.

> The portfolio view shows virtual cash, SOL exposure, and profit or loss after estimated
> costs. We also track allocation, fees, turnover, and drawdown. Paper results are not guaranteed
> returns. They help us inspect the strategy before introducing real capital.

## 02:30–02:45 — Pause

**Screen:** Pause agent, then the Paused status and preserved history.

> The user remains in control. Autopilot can be paused, and its history stays available.
> Saving new limits also pauses a running agent. Resuming applies the updated profile before
> further automated decisions.

## 02:45–03:00 — Close with the release boundary

**Screen:** overview, then Solvex and the repository URL.

> Today, Solvex combines autonomous paper trading with a separate Devnet vault. Next come
> validated Mainnet execution through Jupiter, independent auditing, and qualified screening.
> Solvex: explainable autonomy, with policy before execution.

Finish on [github.com/zhenups-alt/solvex](https://github.com/zhenups-alt/solvex).
