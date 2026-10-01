import { asyncHandler } from '../lib/async-handler.js';
import { normalizeAddress, parsePositiveInt } from '../lib/validation.js';
import {
  createChallenge,
  getAllWallets,
  getWalletSnapshot,
  registerWallet,
  syncWallet,
} from '../services/wallet-sync.service.js';

export const requestWalletChallenge = asyncHandler(async (req, res) => {
  const address = normalizeAddress(req.body?.address);
  const challenge = createChallenge(address);
  res.status(200).json({ ok: true, address, ...challenge });
});

export const registerWalletController = asyncHandler(async (req, res) => {
  const address = normalizeAddress(req.body?.address);
  const wallet = await registerWallet({
    address,
    signature: req.body?.signature,
    message: req.body?.message,
  });
  res.status(200).json({ ok: true, wallet });
});

export const listWalletsController = asyncHandler(async (_req, res) => {
  const wallets = await getAllWallets();
  res.status(200).json({ ok: true, wallets });
});

export const getWalletController = asyncHandler(async (req, res) => {
  const address = normalizeAddress(req.params.address);
  const wallet = await getWalletSnapshot(address);
  res.status(200).json({ ok: true, wallet });
});

export const syncWalletController = asyncHandler(async (req, res) => {
  const address = normalizeAddress(req.params.address);
  const txLimit = parsePositiveInt(req.query?.txLimit, 20, 50);
  const wallet = await syncWallet(address, txLimit);
  res.status(200).json({ ok: true, wallet });
});
