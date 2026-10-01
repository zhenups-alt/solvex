import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { randomUUID } from 'node:crypto';
import { PublicKey } from '@solana/web3.js';
import { badRequest, HttpError } from '../lib/http-error.js';
import { getWallet, listWallets, upsertWallet } from '../repositories/wallet.repository.js';
import { pullWalletState, getSyncConfig } from './solana-sync.service.js';

const challenges = new Map();
const intervalMs = Number(process.env.SYNC_INTERVAL_MS || 30000);
let timer = null;

const buildSignMessage = (address, nonce) =>
  `Solvex wallet sync\nAddress: ${address}\nNonce: ${nonce}\nIssuedAt: ${new Date().toISOString()}`;

const generateNonce = () => randomUUID();

export const createChallenge = (address) => {
  const nonce = generateNonce();
  const message = buildSignMessage(address, nonce);
  challenges.set(address, { nonce, message, createdAt: Date.now() });
  return { nonce, message };
};

const verifyOwnership = ({ address, signatureBase58, signedMessage }) => {
  if (!signatureBase58 || !signedMessage) {
    throw badRequest('signature and message are required for wallet registration');
  }

  const challenge = challenges.get(address);
  if (!challenge) throw badRequest('challenge not found, request a new challenge');
  if (challenge.message !== signedMessage) throw badRequest('signed message does not match challenge');
  if (Date.now() - challenge.createdAt > 5 * 60 * 1000) throw badRequest('challenge expired');

  const signature = bs58.decode(signatureBase58);
  const publicKeyBytes = new PublicKey(address).toBytes();
  const messageBytes = new TextEncoder().encode(signedMessage);
  const verified = nacl.sign.detached.verify(messageBytes, signature, publicKeyBytes);
  if (!verified) throw new HttpError(401, 'wallet signature verification failed');
  challenges.delete(address);
};

export const registerWallet = async ({ address, signature, message }) => {
  verifyOwnership({ address, signatureBase58: signature, signedMessage: message });

  const config = getSyncConfig();
  const now = new Date().toISOString();
  const wallet = await upsertWallet(address, (current) => ({
    address,
    network: config.network,
    endpoint: config.endpoint,
    createdAt: current?.createdAt || now,
    updatedAt: now,
    lastSyncedAt: current?.lastSyncedAt || null,
    balanceSol: current?.balanceSol ?? null,
    balanceLamports: current?.balanceLamports ?? null,
    transactions: current?.transactions || [],
  }));

  return wallet;
};

export const syncWallet = async (address, txLimit = 20) => {
  const current = await getWallet(address);
  if (!current) throw new HttpError(404, 'wallet is not registered');

  const latest = await pullWalletState(address, txLimit);
  const wallet = await upsertWallet(address, (prev) => ({
    ...(prev || {}),
    address,
    network: latest.network,
    endpoint: latest.endpoint,
    updatedAt: new Date().toISOString(),
    lastSyncedAt: latest.syncedAt,
    balanceSol: latest.balanceSol,
    balanceLamports: latest.balanceLamports,
    transactions: latest.transactions,
  }));

  return wallet;
};

export const getWalletSnapshot = async (address) => {
  const wallet = await getWallet(address);
  if (!wallet) throw new HttpError(404, 'wallet is not registered');
  return wallet;
};

export const getAllWallets = () => listWallets();

const syncAllRegisteredWallets = async () => {
  const wallets = await listWallets();
  await Promise.all(
    wallets.map(async (wallet) => {
      try {
        await syncWallet(wallet.address, 25);
      } catch (error) {
        console.error(`[wallet-sync] Failed sync for ${wallet.address}`, error.message);
      }
    }),
  );
};

export const startWalletSyncScheduler = () => {
  if (timer) return;
  timer = setInterval(() => {
    syncAllRegisteredWallets().catch((error) => {
      console.error('[wallet-sync] Scheduler error', error.message);
    });
  }, intervalMs);
};
