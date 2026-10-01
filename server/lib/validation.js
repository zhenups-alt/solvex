import { PublicKey } from '@solana/web3.js';
import { badRequest } from './http-error.js';

export const normalizeAddress = (address) => {
  if (!address || typeof address !== 'string') {
    throw badRequest('wallet address is required');
  }

  try {
    return new PublicKey(address).toBase58();
  } catch {
    throw badRequest('invalid Solana wallet address');
  }
};

export const parsePositiveInt = (value, defaultValue, maxValue) => {
  if (value == null) return defaultValue;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return defaultValue;
  return Math.min(Math.floor(parsed), maxValue);
};
