# Security and Release Boundaries

Solvex is an **unaudited development MVP**, not a production custody service. Do not use it
to accept public funds or infer Mainnet readiness from paper results or a Devnet deployment.

## Current protections

- Protected profile/paper actions require a wallet-signed, expiring one-use challenge and a session.
- AI proposals are checked independently of the model.
- Virtual execution cannot sign or submit chain transactions.
- Paper balances and journal entries commit atomically with cycle-version checks.
- Devnet owner controls require wallet transaction signatures; the vault implements token-unit limits.

These are implemented safeguards, not a guarantee against every exploit or operator error.

## Known release limitations

- Independent smart-contract/security auditing and end-to-end live-route validation are outstanding.
- Some read endpoints, including manual decision/profile reads, are not private.
- Manual analysis snapshots are client-supplied and must not become a live execution authority.
- Production rate limiting, session revocation, monitoring and incident recovery need further work.
- Public market data and virtual cost estimates do not establish executable liquidity or returns.
- Catalog governance and evidence review are not religious certification.

## Secret handling

Keep provider keys only in ignored backend environment files. Keep generated keypairs outside
version control. Never put credentials in `VITE_*` variables: these are bundled for the browser.
Do not paste keys, private wallet material, authentication tokens or database dumps into issues,
pull requests, screenshots, video recordings or model prompts.

## Reporting a vulnerability

Do not publish exploit details or real user data in a public issue. If the repository's
Security tab offers private vulnerability reporting, use that channel. Otherwise, ask the
repository owner to establish a private channel before sharing sensitive details; no dedicated
security contact or response-time commitment has been published yet.

Reports should use sanitized reproduction steps and a local or test-network environment.
Do not test against other users' wallets or funds.
