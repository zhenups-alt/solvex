/**
 * WalletContextProvider.tsx
 * 
 * Uses window.solana (Phantom's direct API) instead of @solana/wallet-adapter-react.
 * This is the most reliable approach for Phantom wallet integration.
 */

import React, { FC, ReactNode, createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Connection, PublicKey, clusterApiUrl, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SolanaNetwork = 'mainnet-beta' | 'devnet' | 'testnet';

interface WalletContextState {
  // Wallet state
  connected: boolean;
  connecting: boolean;
  publicKey: PublicKey | null;
  address: string | null;
  balance: number | null;

  // Network
  network: SolanaNetwork;
  setNetwork: (n: SolanaNetwork) => void;
  connection: Connection;

  // Actions
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  signMessage: (message: string) => Promise<string | null>;
  sendSol: (recipient: string, amountSol: number) => Promise<string | null>;
}

const WalletContext = createContext<WalletContextState>({} as WalletContextState);

export const usePhantom = () => useContext(WalletContext);

// ─── Helper: shorten address ──────────────────────────────────────────────────

function getPhantom(): any {
  if (typeof window !== 'undefined' && (window as any).solana?.isPhantom) {
    return (window as any).solana;
  }
  return null;
}

// ─── Provider ────────────────────────────────────────────────────────────────

export const WalletContextProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const apiBase = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8080';
  const [network, setNetworkState] = useState<SolanaNetwork>('devnet');
  const [connection, setConnection] = useState<Connection>(
    new Connection(clusterApiUrl('devnet'), 'confirmed')
  );
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [publicKey, setPublicKey] = useState<PublicKey | null>(null);
  const [balance, setBalance] = useState<number | null>(null);

  const address = publicKey?.toBase58() ?? null;

  const syncWalletWithBackend = useCallback(
    async (walletAddress: string) => {
      const phantom = getPhantom();
      if (!phantom) return;
      if (network !== 'devnet') return;

      try {
        const challengeRes = await fetch(`${apiBase}/api/wallets/challenge`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: walletAddress }),
        });
        const challengeData = await challengeRes.json();
        if (!challengeRes.ok || !challengeData?.message) {
          throw new Error(challengeData?.error || 'Failed to request backend challenge');
        }

        const encoded = new TextEncoder().encode(challengeData.message);
        const { signature } = await phantom.signMessage(encoded, 'utf8');
        const bs58 = await import('bs58');
        const signatureBase58 = bs58.default.encode(signature);

        const registerRes = await fetch(`${apiBase}/api/wallets/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            address: walletAddress,
            message: challengeData.message,
            signature: signatureBase58,
          }),
        });
        if (!registerRes.ok) {
          const body = await registerRes.json().catch(() => ({}));
          throw new Error(body?.error || 'Failed to register wallet');
        }

        const syncRes = await fetch(`${apiBase}/api/wallets/${walletAddress}/sync?txLimit=20`, {
          method: 'POST',
        });
        if (!syncRes.ok) {
          const body = await syncRes.json().catch(() => ({}));
          throw new Error(body?.error || 'Failed to sync wallet');
        }
      } catch (err: any) {
        console.error('[Wallet] Backend sync failed:', err);
        toast.error('Wallet sync failed', { description: err.message || 'Could not sync with backend.' });
      }
    },
    [apiBase, network]
  );

  // ─── Set network ───────────────────────────────────────────────────────────

  const setNetwork = useCallback((n: SolanaNetwork) => {
    console.log('[Wallet] Switching network to:', n);
    setNetworkState(n);
    setConnection(new Connection(clusterApiUrl(n), 'confirmed'));
  }, []);

  // ─── Fetch balance ─────────────────────────────────────────────────────────

  const fetchBalance = useCallback(async (pk: PublicKey, conn: Connection) => {
    try {
      const bal = await conn.getBalance(pk);
      setBalance(bal / LAMPORTS_PER_SOL);
      console.log('[Wallet] Balance fetched:', bal / LAMPORTS_PER_SOL, 'SOL');
    } catch (err) {
      console.error('[Wallet] Failed to fetch balance:', err);
    }
  }, []);

  // ─── Init: auto reconnect if previously trusted ────────────────────────────

  useEffect(() => {
    console.log('[Wallet] Checking Phantom install status...');
    console.log('[Wallet] window.solana:', (window as any).solana);
    console.log('[Wallet] isPhantom:', !!(window as any).solana?.isPhantom);

    const phantom = getPhantom();
    if (!phantom) {
      console.log('[Wallet] Phantom not installed.');
      return;
    }

    // Auto-reconnect silently
    phantom.connect({ onlyIfTrusted: true })
      .then((resp: any) => {
        const pk = new PublicKey(resp.publicKey.toString());
        setPublicKey(pk);
        setConnected(true);
        console.log('[Wallet] Auto-reconnected:', pk.toBase58());
        fetchBalance(pk, connection);
        syncWalletWithBackend(pk.toBase58()).catch((err) => {
          console.error('[Wallet] Auto reconnect backend sync failed:', err);
        });
      })
      .catch(() => {
        console.log('[Wallet] No trusted session found (first visit).');
      });

    // ─── Event listeners ───────────────────────────────────────────────────

    const handleAccountChange = (newPk: PublicKey | null) => {
      if (newPk) {
        console.log('[Wallet] Account changed to:', newPk.toBase58());
        setPublicKey(newPk);
        setConnected(true);
        fetchBalance(newPk, connection);
      } else {
        handleDisconnectEvent();
      }
    };

    const handleDisconnectEvent = () => {
      console.log('[Wallet] Disconnected event received.');
      setPublicKey(null);
      setConnected(false);
      setBalance(null);
    };

    phantom.on('accountChanged', handleAccountChange);
    phantom.on('disconnect', handleDisconnectEvent);

    return () => {
      phantom.off('accountChanged', handleAccountChange);
      phantom.off('disconnect', handleDisconnectEvent);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connection, fetchBalance, syncWalletWithBackend]);

  // ─── Refetch balance when network changes ──────────────────────────────────

  useEffect(() => {
    if (publicKey) {
      fetchBalance(publicKey, connection);
    }
  }, [connection, publicKey, fetchBalance]);

  // ─── Connect ───────────────────────────────────────────────────────────────

  const connect = useCallback(async () => {
    console.log('[Wallet] Connect clicked.');
    console.log('[Wallet] Phantom installed:', !!(window as any).solana?.isPhantom);

    const phantom = getPhantom();

    if (!phantom) {
      toast.error('Phantom not installed', {
        description: 'Please install Phantom wallet to continue.',
        action: {
          label: 'Install',
          onClick: () => window.open('https://phantom.app', '_blank'),
        },
      });
      return;
    }

    setConnecting(true);
    try {
      console.log('[Wallet] Calling window.solana.connect()...');
      const resp = await phantom.connect();
      const pk = new PublicKey(resp.publicKey.toString());
      setPublicKey(pk);
      setConnected(true);
      console.log('[Wallet] Connected! Address:', pk.toBase58());
      toast.success('Wallet connected!', { description: pk.toBase58().slice(0, 8) + '...' });
      await fetchBalance(pk, connection);
      await syncWalletWithBackend(pk.toBase58());
    } catch (err: any) {
      console.error('[Wallet] Connect error:', err);
      if (err.code === 4001) {
        toast.error('Connection cancelled', { description: 'You rejected the connection in Phantom.' });
      } else {
        toast.error('Connection failed', { description: err.message || 'Unknown error' });
      }
    } finally {
      setConnecting(false);
    }
  }, [connection, fetchBalance, syncWalletWithBackend]);

  useEffect(() => {
    if (!address || !connected || network !== 'devnet') return;

    const interval = window.setInterval(() => {
      fetch(`${apiBase}/api/wallets/${address}/sync?txLimit=20`, {
        method: 'POST',
      }).catch((err) => {
        console.error('[Wallet] Background sync failed:', err);
      });
    }, 30000);

    return () => window.clearInterval(interval);
  }, [address, connected, apiBase, network]);

  // ─── Disconnect ────────────────────────────────────────────────────────────

  const disconnect = useCallback(async () => {
    const phantom = getPhantom();
    if (phantom) {
      try {
        await phantom.disconnect();
      } catch (err) {
        console.error('[Wallet] Disconnect error:', err);
      }
    }
    setPublicKey(null);
    setConnected(false);
    setBalance(null);
    toast('Wallet disconnected');
    console.log('[Wallet] Disconnected.');
  }, []);

  // ─── Sign message ──────────────────────────────────────────────────────────

  const signMessage = useCallback(async (message: string): Promise<string | null> => {
    const phantom = getPhantom();
    if (!phantom || !connected) {
      toast.error('Wallet not connected');
      return null;
    }

    try {
      const encoded = new TextEncoder().encode(message);
      const { signature } = await phantom.signMessage(encoded, 'utf8');
      // bs58 encode manually using Buffer (polyfilled)
      const bs58 = await import('bs58');
      const sig = bs58.default.encode(signature);
      console.log('[Wallet] Message signed. Signature:', sig);
      return sig;
    } catch (err: any) {
      console.error('[Wallet] Sign error:', err);
      if (err.code === 4001) {
        toast.error('Signature rejected', { description: 'You rejected the signing request.' });
      } else {
        toast.error('Sign failed', { description: err.message });
      }
      return null;
    }
  }, [connected]);

  // ─── Send SOL ──────────────────────────────────────────────────────────────

  const sendSol = useCallback(async (recipient: string, amountSol: number): Promise<string | null> => {
    const phantom = getPhantom();
    if (!phantom || !publicKey) {
      toast.error('Wallet not connected');
      return null;
    }

    try {
      const { Transaction, SystemProgram } = await import('@solana/web3.js');
      const toPubKey = new PublicKey(recipient);
      const lamports = Math.round(amountSol * LAMPORTS_PER_SOL);

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: toPubKey,
          lamports,
        })
      );

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      console.log('[Wallet] Sending transaction...');
      const { signature } = await phantom.signAndSendTransaction(transaction);
      console.log('[Wallet] TX sent! Signature:', signature);

      toast.promise(
        connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }),
        {
          loading: 'Confirming transaction...',
          success: `Confirmed! Sig: ${signature.slice(0, 8)}...`,
          error: 'Transaction failed to confirm',
        }
      );

      // Refresh balance after send
      await fetchBalance(publicKey, connection);
      return signature;
    } catch (err: any) {
      console.error('[Wallet] Send error:', err);
      if (err.code === 4001) {
        toast.error('Transaction rejected', { description: 'You rejected the transaction.' });
      } else if (err.message?.includes('Invalid public key')) {
        toast.error('Invalid recipient address');
      } else {
        toast.error('Network error', { description: err.message || 'Please try again.' });
      }
      return null;
    }
  }, [publicKey, connection, fetchBalance]);

  return (
    <WalletContext.Provider value={{
      connected,
      connecting,
      publicKey,
      address,
      balance,
      network,
      setNetwork,
      connection,
      connect,
      disconnect,
      signMessage,
      sendSol,
    }}>
      {children}
    </WalletContext.Provider>
  );
};
