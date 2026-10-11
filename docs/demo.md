# Three-Minute Demo Recording Guide

[← Documentation](README.md)

Watch the [pitch](https://youtu.be/glgpi-gw61g) and
[product demo](https://youtu.be/j6ky3SVytNA) for the Colosseum submission. This guide
documents the product walkthrough.
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

## 01:20–01:45 — Interactive Shariah Asset Screener & Firewall

**Screen:** `/screener` page (or open Show sandbox policy and risk checks in the Autopilot journal).

> This is our core differentiator: the deterministic Shariah Firewall. In our live screener at `/screener`,
> judges and users can evaluate any asset or protocol against versioned policy rules (`solvex-shariah-v0.1.0`).
> Watch how testing native SOL returns `Eligible` for spot ownership, USDC triggers `Review` because
> reserve compositions require ongoing review, and Jupiter Perpetuals is immediately `Blocked` under Rule SH-02
> against leverage and derivatives. Notice that entering an unvetted custom token mint or unknown route fails
> closed under Rule SH-06 — uncertainty never auto-executes. This is a reproducible technical screening
> framework, not a fatwa.

## Interactive Demo Mode (For Quick Judging Without Wallet / Devnet SOL)

**Screen:** Home page hero "Explore Demo (No Wallet)" CTA or persistent amber Demo Banner.

> For hackathon evaluators without a Solana wallet or Devnet SOL, clicking "Explore Demo" enables an
> isolated simulation mode marked with a persistent amber indicator. Evaluators can explore live-rendered
> charts, agent limits, and full decision trails featuring approved spot BUYs, deliberate risk-management HOLDs,
> and firewall-blocked margin attempts with zero blockchain execution or private key requirements. Reset sample
> data at any time with one click.

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
