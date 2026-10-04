# Contributing to Solvex

Start with the [project overview](README.md), [development guide](docs/development.md)
and [architecture](docs/architecture.md). This is a development MVP; contributions must
preserve the separation between virtual trading, Devnet owner actions and future Mainnet work.

## Development workflow

1. Open an issue describing a non-sensitive bug or proposed change.
2. Create a focused branch and keep unrelated changes out of the diff.
3. Add regression tests for changed behavior and update relevant documentation.
4. Run the checks below and explain the result in your pull request.

```bash
npm run lint
npm run test:vault
npm run build
node scripts/check-docs.mjs
.venv/bin/ruff check backend
.venv/bin/pytest -q backend/tests
```

For on-chain changes, also run the Rust tests and Anchor build described in
[chain/README.md](chain/README.md). CI currently checks Python/TypeScript and documentation;
it does not replace contract testing or an independent audit.

## Safety requirements

- Never commit API keys, session tokens, seed phrases, private keys, databases or deploy keypairs.
- Use `.env.example` files to document configuration without real credentials.
- Keep Review/Blocked behavior fail-closed. Do not weaken checks to make a demo trade succeed.
- Do not relabel paper balances, test assets or simulated fills as real funds or confirmed swaps.
- Describe Shariah entries with scope and evidence; do not imply scholarly approval without it.
- Do not enable Mainnet execution or deploy/upgrade a program as part of unrelated cleanup.
- Keep English and Russian UI copy consistent where a feature supports both.

Use sanitized fixtures for tests and screenshots. See [SECURITY.md](SECURITY.md) for disclosure guidance.
