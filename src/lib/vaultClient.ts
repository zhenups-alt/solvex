import {
  Connection,
  Keypair,
  PublicKey,
  SYSVAR_RENT_PUBKEY,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  AccountLayout,
  NATIVE_MINT,
  TOKEN_PROGRAM_ID,
  createCloseAccountInstruction,
  createInitializeAccountInstruction,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';

export const VAULT_PROGRAM_ID = new PublicKey('8oi1inxaWoWmY7FjEEERuCdbGdCQpfgAg2KHyXFYAkP8');
export const SOLVEX_AGENT = new PublicKey('BKLH3wdX7rwgah1C1KiHSEyrFcvdBtnbyRL8Xy1D9VpW');
export const DEVNET_USDC_MINT = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');

const INITIALIZE_VAULT_DISCRIMINATOR = new Uint8Array([48, 191, 163, 44, 71, 129, 63, 164]);
const SET_PAUSED_DISCRIMINATOR = new Uint8Array([91, 60, 125, 192, 176, 225, 166, 218]);
const SET_LIMITS_DISCRIMINATOR = new Uint8Array([207, 50, 250, 67, 211, 33, 70, 91]);
const VAULT_STATE_DISCRIMINATOR = new Uint8Array([228, 196, 82, 165, 98, 210, 235, 152]);
const DEPOSIT_BASE_DISCRIMINATOR = new Uint8Array([213, 125, 25, 122, 8, 72, 100, 237]);
const WITHDRAW_BASE_DISCRIMINATOR = new Uint8Array([161, 122, 255, 170, 42, 39, 23, 120]);
const LAMPORTS_PER_SOL_BIGINT = 1_000_000_000n;
const USDC_ATOMIC_UNITS = 1_000_000n;

export interface VaultLimitsInput {
  investmentCapUsd: number;
  maxSingleTradeUsd: number;
  maxDailyTurnoverUsd: number;
  solPriceUsd: number;
}

export interface VaultOnChainState {
  address: PublicKey;
  owner: PublicKey;
  agent: PublicKey;
  baseMint: PublicKey;
  quoteMint: PublicKey;
  baseCustody: PublicKey;
  quoteCustody: PublicKey;
  maxPrincipalBase: bigint;
  depositedPrincipalBase: bigint;
  paused: boolean;
  baseBalance: number;
  quoteBalance: number;
}

export interface BuiltVaultTransaction {
  transaction: Transaction;
  additionalSigners: Keypair[];
}

function instructionData(...parts: Uint8Array[]) {
  const length = parts.reduce((total, part) => total + part.length, 0);
  const result = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result as unknown as Buffer;
}

function encodeU64(value: bigint) {
  const bytes = new Uint8Array(8);
  new DataView(bytes.buffer).setBigUint64(0, value, true);
  return bytes;
}

function readU64(data: Uint8Array, offset: number) {
  return new DataView(data.buffer, data.byteOffset + offset, 8).getBigUint64(0, true);
}

function readPublicKey(data: Uint8Array, offset: number) {
  return new PublicKey(data.slice(offset, offset + 32));
}

function toAtomicSol(sol: number) {
  if (!Number.isFinite(sol) || sol <= 0) throw new Error('SOL amount must be greater than zero');
  const lamports = Math.floor(sol * Number(LAMPORTS_PER_SOL_BIGINT));
  if (!Number.isSafeInteger(lamports) || lamports <= 0) throw new Error('SOL amount is outside supported precision');
  return BigInt(lamports);
}

function usdToSolAtomic(usd: number, solPriceUsd: number) {
  return toAtomicSol(usd / solPriceUsd);
}

function usdToUsdcAtomic(usd: number) {
  const units = Math.floor(usd * Number(USDC_ATOMIC_UNITS));
  if (!Number.isSafeInteger(units) || units <= 0) throw new Error('USD limit is outside supported precision');
  return BigInt(units);
}

function encodedLimits(limits: VaultLimitsInput) {
  for (const value of Object.values(limits)) {
    if (!Number.isFinite(value) || value <= 0) throw new Error('All limits and the SOL price must be positive');
  }
  if (limits.maxSingleTradeUsd > limits.investmentCapUsd) throw new Error('Per-trade limit exceeds the investment cap');
  if (limits.maxSingleTradeUsd > limits.maxDailyTurnoverUsd) throw new Error('Per-trade limit exceeds the daily turnover cap');
  return [
    encodeU64(usdToSolAtomic(limits.investmentCapUsd, limits.solPriceUsd)),
    encodeU64(usdToSolAtomic(limits.maxSingleTradeUsd, limits.solPriceUsd)),
    encodeU64(usdToUsdcAtomic(limits.maxSingleTradeUsd)),
    encodeU64(usdToSolAtomic(limits.maxDailyTurnoverUsd, limits.solPriceUsd)),
    encodeU64(usdToUsdcAtomic(limits.maxDailyTurnoverUsd)),
  ];
}

export function deriveVaultAddresses(owner: PublicKey) {
  const [vault] = PublicKey.findProgramAddressSync(
    [new TextEncoder().encode('vault'), owner.toBytes()],
    VAULT_PROGRAM_ID,
  );
  return {
    vault,
    baseCustody: getAssociatedTokenAddressSync(NATIVE_MINT, vault, true),
    quoteCustody: getAssociatedTokenAddressSync(DEVNET_USDC_MINT, vault, true),
    ownerBaseAccount: getAssociatedTokenAddressSync(NATIVE_MINT, owner),
  };
}

export function createInitializeVaultTransaction(owner: PublicKey, limits: VaultLimitsInput): BuiltVaultTransaction {
  if (!Number.isFinite(limits.solPriceUsd) || limits.solPriceUsd <= 0) {
    throw new Error('A current SOL price is required to calculate on-chain limits');
  }
  const addresses = deriveVaultAddresses(owner);
  const data = instructionData(
    INITIALIZE_VAULT_DISCRIMINATOR,
    SOLVEX_AGENT.toBytes(),
    ...encodedLimits(limits),
  );
  const initialize = new TransactionInstruction({
    programId: VAULT_PROGRAM_ID,
    data,
    keys: [
      { pubkey: addresses.vault, isSigner: false, isWritable: true },
      { pubkey: addresses.baseCustody, isSigner: false, isWritable: true },
      { pubkey: addresses.quoteCustody, isSigner: false, isWritable: true },
      { pubkey: NATIVE_MINT, isSigner: false, isWritable: false },
      { pubkey: DEVNET_USDC_MINT, isSigner: false, isWritable: false },
      { pubkey: owner, isSigner: true, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ],
  });
  const unpause = new TransactionInstruction({
    programId: VAULT_PROGRAM_ID,
    data: instructionData(SET_PAUSED_DISCRIMINATOR, new Uint8Array([0])),
    keys: [
      { pubkey: addresses.vault, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: false },
    ],
  });
  return { transaction: new Transaction().add(initialize, unpause), additionalSigners: [] };
}

function ownerInstruction(owner: PublicKey, state: VaultOnChainState, data: Buffer) {
  if (!state.owner.equals(owner) || !state.address.equals(deriveVaultAddresses(owner).vault)) {
    throw new Error('Only the vault owner can change its settings');
  }
  return new TransactionInstruction({
    programId: VAULT_PROGRAM_ID, data,
    keys: [
      { pubkey: state.address, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: false },
    ],
  });
}

export function createSetPausedTransaction(owner: PublicKey, state: VaultOnChainState, paused: boolean): BuiltVaultTransaction {
  return {
    transaction: new Transaction().add(ownerInstruction(owner, state, instructionData(SET_PAUSED_DISCRIMINATOR, new Uint8Array([paused ? 1 : 0])))),
    additionalSigners: [],
  };
}

export function createSetLimitsTransaction(owner: PublicKey, state: VaultOnChainState, limits: VaultLimitsInput): BuiltVaultTransaction {
  const encoded = encodedLimits(limits);
  if (usdToSolAtomic(limits.investmentCapUsd, limits.solPriceUsd) < state.depositedPrincipalBase) {
    throw new Error('New on-chain cap is below the deposited principal. Withdraw first or raise the cap.');
  }
  return {
    transaction: new Transaction().add(ownerInstruction(owner, state, instructionData(SET_LIMITS_DISCRIMINATOR, ...encoded))),
    additionalSigners: [],
  };
}

async function createTemporaryWsolAccount(
  connection: Connection,
  owner: PublicKey,
  tokenAmount: bigint,
) {
  const temporaryAccount = Keypair.generate();
  const rent = await connection.getMinimumBalanceForRentExemption(AccountLayout.span, 'confirmed');
  const fundingLamports = Number(tokenAmount) + rent;
  return {
    temporaryAccount,
    instructions: [
      SystemProgram.createAccount({
        fromPubkey: owner,
        newAccountPubkey: temporaryAccount.publicKey,
        lamports: fundingLamports,
        space: AccountLayout.span,
        programId: TOKEN_PROGRAM_ID,
      }),
      createInitializeAccountInstruction(temporaryAccount.publicKey, NATIVE_MINT, owner),
    ],
  };
}

export async function createDepositSolTransaction(
  connection: Connection,
  owner: PublicKey,
  state: VaultOnChainState,
  amountSol: number,
): Promise<BuiltVaultTransaction> {
  if (!state.baseMint.equals(NATIVE_MINT)) throw new Error('This vault does not use wrapped SOL as its base asset');
  if (state.paused) throw new Error('Vault is paused');
  const amount = toAtomicSol(amountSol);
  const nextPrincipal = state.depositedPrincipalBase + amount;
  if (nextPrincipal > state.maxPrincipalBase) throw new Error('Deposit exceeds the on-chain principal limit');
  const temporary = await createTemporaryWsolAccount(connection, owner, amount);
  return {
    transaction: new Transaction().add(
    ...temporary.instructions,
    new TransactionInstruction({
      programId: VAULT_PROGRAM_ID,
      data: instructionData(DEPOSIT_BASE_DISCRIMINATOR, encodeU64(amount)),
      keys: [
        { pubkey: state.address, isSigner: false, isWritable: true },
        { pubkey: temporary.temporaryAccount.publicKey, isSigner: false, isWritable: true },
        { pubkey: state.baseCustody, isSigner: false, isWritable: true },
        { pubkey: owner, isSigner: true, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
    }),
    createCloseAccountInstruction(temporary.temporaryAccount.publicKey, owner, owner),
    ),
    additionalSigners: [temporary.temporaryAccount],
  };
}

export async function createWithdrawSolTransaction(
  connection: Connection,
  owner: PublicKey,
  state: VaultOnChainState,
  amountSol: number,
): Promise<BuiltVaultTransaction> {
  if (!state.baseMint.equals(NATIVE_MINT)) throw new Error('This vault does not use wrapped SOL as its base asset');
  const amount = toAtomicSol(amountSol);
  if (amount > BigInt(Math.floor(state.baseBalance * 1_000_000_000))) {
    throw new Error('Withdrawal exceeds the vault balance');
  }
  const temporary = await createTemporaryWsolAccount(connection, owner, 0n);
  return {
    transaction: new Transaction().add(
    ...temporary.instructions,
    new TransactionInstruction({
      programId: VAULT_PROGRAM_ID,
      data: instructionData(WITHDRAW_BASE_DISCRIMINATOR, encodeU64(amount)),
      keys: [
        { pubkey: state.address, isSigner: false, isWritable: true },
        { pubkey: state.baseCustody, isSigner: false, isWritable: true },
        { pubkey: temporary.temporaryAccount.publicKey, isSigner: false, isWritable: true },
        { pubkey: owner, isSigner: true, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
    }),
    createCloseAccountInstruction(temporary.temporaryAccount.publicKey, owner, owner),
    ),
    additionalSigners: [temporary.temporaryAccount],
  };
}

export async function loadVaultState(connection: Connection, owner: PublicKey): Promise<VaultOnChainState | null> {
  const { vault } = deriveVaultAddresses(owner);
  const account = await connection.getAccountInfo(vault, 'confirmed');
  if (!account) return null;
  const data = account.data;
  if (!account.owner.equals(VAULT_PROGRAM_ID) || data.length < 283
      || !VAULT_STATE_DISCRIMINATOR.every((value, index) => data[index] === value)
      || data[8] !== 1 || !readPublicKey(data, 9).equals(owner)) {
    throw new Error('Invalid or unsupported vault account');
  }
  const baseCustody = readPublicKey(data, 137);
  const quoteCustody = readPublicKey(data, 169);
  const [baseBalance, quoteBalance] = await Promise.all([
    connection.getTokenAccountBalance(baseCustody, 'confirmed').then((value) => value.value.uiAmount ?? 0),
    connection.getTokenAccountBalance(quoteCustody, 'confirmed').then((value) => value.value.uiAmount ?? 0),
  ]);
  return {
    address: vault,
    owner: readPublicKey(data, 9),
    agent: readPublicKey(data, 41),
    baseMint: readPublicKey(data, 73),
    quoteMint: readPublicKey(data, 105),
    baseCustody,
    quoteCustody,
    maxPrincipalBase: readU64(data, 201),
    depositedPrincipalBase: readU64(data, 209),
    paused: data[281] !== 0,
    baseBalance,
    quoteBalance,
  };
}
