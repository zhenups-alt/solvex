# Solvex Vault

The Solvex vault is a new, per-user Anchor program. It does not reuse or upgrade
the legacy `simple_vault` deployment.

## Security model

- Every wallet gets an isolated PDA: `["vault", owner]`.
- Only the owner can deposit, withdraw, change the agent, change limits, or pause.
- The agent can only invoke the pinned Jupiter v6 program and only between the
  two associated-token custody accounts configured at initialization.
- The program checks quote expiry, exact input ceiling, minimum output,
  per-trade limits, daily turnover limits, and a monotonically increasing nonce.
- Every successful swap emits the backend decision hash for audit correlation.
- The owner can revoke the agent immediately by changing it or pausing the vault.

`max_principal_base` is denominated in the base mint's smallest unit. For the MVP,
the intended base mint is a screened stablecoin. No on-chain USD claim is made
without a trusted oracle.

Native SOL is represented as wrapped SOL inside the vault. This keeps both
custody accounts compatible with Jupiter's token-account based swap flow.

## Local commands

```bash
export PATH="$HOME/.cargo/bin:$HOME/.local/share/solana/install/active_release/bin:$PATH"
avm use 0.31.1
anchor build
cargo test --workspace
```

The generated deploy and authority keypairs stay under `chain/target/deploy/` and
must never be committed.

- Program ID: `8oi1inxaWoWmY7FjEEERuCdbGdCQpfgAg2KHyXFYAkP8`
- Devnet deployer: `BPzBkymfdWFywUYD851PcW9w6Xv6o3qb8nChx7RhxDt5`
- Initial agent authority: `BKLH3wdX7rwgah1C1KiHSEyrFcvdBtnbyRL8Xy1D9VpW`
- Devnet deployment slot: `506626832`
- Devnet deployment signature: `5uqL3bTx5QsCGSakXW9twdWmbMpjBtkCnZteZyGAsEctdNxd65vWZXffhQYBfh4Fr53PLdonL1vgHTLmS4YPQfYM`

Only public addresses belong in documentation. The corresponding JSON keypair files are
local secrets under `target/deploy/`.
