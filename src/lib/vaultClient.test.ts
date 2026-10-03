import { strict as assert } from 'node:assert';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { PublicKey } from '@solana/web3.js';
import { NATIVE_MINT } from '@solana/spl-token';
import {
  createInitializeVaultTransaction, createSetPausedTransaction, createSetLimitsTransaction,
  createDepositSolTransaction, deriveVaultAddresses, DEVNET_USDC_MINT,
  SOLVEX_AGENT, VAULT_PROGRAM_ID, VaultOnChainState,
} from './vaultClient';

const owner = new PublicKey('11111111111111111111111111111111');
const addresses = deriveVaultAddresses(owner);
const state: VaultOnChainState = {
  address: addresses.vault, owner, agent: SOLVEX_AGENT, baseMint: NATIVE_MINT,
  quoteMint: DEVNET_USDC_MINT, baseCustody: addresses.baseCustody,
  quoteCustody: addresses.quoteCustody, maxPrincipalBase: 1_000_000_000n,
  depositedPrincipalBase: 500_000_000n, baseBalance: 0.5, quoteBalance: 0, paused: false,
};
const limits = { investmentCapUsd: 100, maxSingleTradeUsd: 10, maxDailyTurnoverUsd: 30, solPriceUsd: 100 };
const discriminator = (instruction: string) => createHash('sha256').update(`global:${instruction}`).digest().subarray(0, 8);

test('pause instruction matches Anchor and requires the owner signature', () => {
  const built = createSetPausedTransaction(owner, state, true);
  assert.equal(built.transaction.instructions.length, 1);
  const instruction = built.transaction.instructions[0];
  assert(instruction.programId.equals(VAULT_PROGRAM_ID));
  assert.deepEqual(Buffer.from(instruction.data).subarray(0, 8), discriminator('set_paused'));
  assert.equal(instruction.data[8], 1);
  assert(instruction.keys[1].pubkey.equals(owner));
  assert.equal(instruction.keys[1].isSigner, true);
  assert.throws(() => createSetPausedTransaction(SOLVEX_AGENT, state, true), /owner/);
});

test('updated limits use the exact initialization layout with no extra transfer', () => {
  const initialized = createInitializeVaultTransaction(owner, limits).transaction.instructions[0];
  const updated = createSetLimitsTransaction(owner, state, limits).transaction.instructions;
  assert.equal(updated.length, 1);
  const data = Buffer.from(updated[0].data);
  assert.deepEqual(data.subarray(0, 8), discriminator('set_limits'));
  assert.deepEqual(data.subarray(8), Buffer.from(initialized.data).subarray(40));
  assert.equal(data.readBigUInt64LE(8), 1_000_000_000n);
  assert.equal(data.readBigUInt64LE(16), 100_000_000n);
  assert.equal(data.readBigUInt64LE(24), 10_000_000n);
  assert.throws(() => createSetLimitsTransaction(owner, state, { ...limits, investmentCapUsd: 20 }), /below/);
  assert.throws(() => createSetLimitsTransaction(owner, state, { ...limits, maxDailyTurnoverUsd: 1 }), /daily/);
  assert.throws(() => createInitializeVaultTransaction(owner, { ...limits, investmentCapUsd: Infinity }), /positive/);
});

test('oversized, sub-lamport and paused deposits are rejected before RPC or signing', async () => {
  const noRpc = {} as Parameters<typeof createDepositSolTransaction>[0];
  await assert.rejects(createDepositSolTransaction(noRpc, owner, state, 0.6), /principal limit/);
  await assert.rejects(createDepositSolTransaction(noRpc, owner, state, 0.0000000001), /precision/);
  await assert.rejects(createDepositSolTransaction(noRpc, owner, { ...state, paused: true }, 0.1), /paused/);
});
