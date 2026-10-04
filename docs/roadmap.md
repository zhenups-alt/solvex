# Roadmap

[← Documentation](README.md)

Stages are capability gates, not promised launch dates or investment-return targets.

## 1. Working development MVP

- [x] English-first / Russian interface and Phantom wallet connection.
- [x] Wallet-signed authentication for protected profile and paper-agent actions.
- [x] Versioned policy catalog and deterministic risk checks.
- [x] Persistent proposal/check logs.
- [x] Optional Gemini recommendations within paper strategy bounds.
- [x] Server-side paper cycles, estimated costs, cost basis, P&L, pause/resume and history.
- [x] Duplicate-cycle protection and atomic balance/event persistence.
- [x] Devnet vault deployment, deposits/withdrawals and owner limit/pause controls.

## 2. Evidence and safety hardening

- [ ] Extend scenario, invariant and adversarial tests for policy and custody paths.
- [ ] Validate migrations and concurrency under the production PostgreSQL configuration.
- [ ] Implement qualified asset/protocol review, evidence expiry and versioned governance.
- [ ] Harden authentication, read privacy, abuse controls and session revocation.
- [ ] Document recovery, incident response, monitoring and backup/restore procedures.

Exit criteria: reproducible tests, explicit review records and documented operational limits.

## 3. Constrained live execution

- [ ] Derive authoritative balances and limits from chain state, not browser input.
- [ ] Construct and validate supported Jupiter routes and CPI account/instruction layouts.
- [ ] Validate quote age, output bounds, program allowlists and simulation results.
- [ ] Implement controlled Mainnet signing, submission and confirmation reconciliation.
- [ ] Handle retries without duplicate trades; reconcile DB events with chain signatures.
- [ ] Obtain independent contract/security review and remediate findings.
- [ ] Review deployment/upgrade authorities, key custody and production configuration.

Exit criteria: independently reviewed, end-to-end validated execution under explicit limits.
Simply setting an environment flag does not meet these criteria.

## 4. Limited pilot readiness

- [ ] Longer paper evaluation with realistic costs, liquidity and adverse market scenarios.
- [ ] Document strategy limitations and suitability; no guarantee of positive returns.
- [ ] Complete relevant legal, operational and Shariah review before public-facing claims.
- [ ] Publish user disclosures and a narrowly scoped pilot plan with appropriate oversight.

Public deposits are not accepted as part of the current development release.
