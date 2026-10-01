import { promises as fs } from 'node:fs';
import path from 'node:path';

const defaultPath = path.resolve(process.cwd(), process.env.SYNC_STORE_FILE || 'server/data/wallet-sync.json');

const ensureStore = async () => {
  const dir = path.dirname(defaultPath);
  await fs.mkdir(dir, { recursive: true });

  try {
    await fs.access(defaultPath);
  } catch {
    const seed = { wallets: {} };
    await fs.writeFile(defaultPath, JSON.stringify(seed, null, 2), 'utf8');
  }
};

const readStore = async () => {
  await ensureStore();
  const raw = await fs.readFile(defaultPath, 'utf8');
  const parsed = JSON.parse(raw);
  if (!parsed.wallets || typeof parsed.wallets !== 'object') {
    return { wallets: {} };
  }
  return parsed;
};

const writeStore = async (store) => {
  await ensureStore();
  await fs.writeFile(defaultPath, JSON.stringify(store, null, 2), 'utf8');
};

export const getWallet = async (address) => {
  const store = await readStore();
  return store.wallets[address] || null;
};

export const listWallets = async () => {
  const store = await readStore();
  return Object.entries(store.wallets).map(([address, value]) => ({
    address,
    network: value.network,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    lastSyncedAt: value.lastSyncedAt || null,
    balanceSol: value.balanceSol ?? null,
  }));
};

export const upsertWallet = async (address, updater) => {
  const store = await readStore();
  const current = store.wallets[address] || null;
  const next = updater(current);
  store.wallets[address] = next;
  await writeStore(store);
  return next;
};
