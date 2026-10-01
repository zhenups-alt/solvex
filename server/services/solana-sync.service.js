import { Connection, PublicKey, clusterApiUrl, LAMPORTS_PER_SOL } from '@solana/web3.js';

const network = process.env.SOLANA_NETWORK || 'devnet';
const endpoint = process.env.SOLANA_RPC_URL || clusterApiUrl(network);
const connection = new Connection(endpoint, 'confirmed');

export const getSyncConfig = () => ({
  network,
  endpoint,
});

export const pullWalletState = async (address, txLimit = 20) => {
  const pubkey = new PublicKey(address);
  const [balanceLamports, signatures] = await Promise.all([
    connection.getBalance(pubkey),
    connection.getSignaturesForAddress(pubkey, { limit: txLimit }),
  ]);

  const txSignatures = signatures.map((item) => item.signature);
  const parsedTxs =
    txSignatures.length > 0
      ? await connection.getParsedTransactions(txSignatures, {
          maxSupportedTransactionVersion: 0,
          commitment: 'confirmed',
        })
      : [];

  const transactions = signatures.map((sig, index) => {
    const tx = parsedTxs[index];
    const feeLamports = tx?.meta?.fee ?? null;
    return {
      signature: sig.signature,
      slot: sig.slot,
      err: sig.err || null,
      confirmationStatus: sig.confirmationStatus || null,
      blockTime: sig.blockTime ? new Date(sig.blockTime * 1000).toISOString() : null,
      memo: sig.memo || null,
      feeLamports,
      feeSol: feeLamports == null ? null : feeLamports / LAMPORTS_PER_SOL,
    };
  });

  return {
    address,
    network,
    endpoint,
    balanceLamports,
    balanceSol: balanceLamports / LAMPORTS_PER_SOL,
    transactions,
    syncedAt: new Date().toISOString(),
  };
};
