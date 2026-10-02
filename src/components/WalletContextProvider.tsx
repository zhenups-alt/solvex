/**
 * WalletContextProvider.tsx
 * 
 * Uses window.solana (Phantom's direct API) instead of @solana/wallet-adapter-react.
 * This is the most reliable approach for Phantom wallet integration.
 */

import React, { FC, ReactNode, createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Connection, PublicKey, SystemProgram, Transaction, clusterApiUrl, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { toast } from 'sonner';
import { useLanguage } from '../i18n';

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
  const { tr } = useLanguage();
  const [network, setNetworkState] = useState<SolanaNetwork>('devnet');
  const [connection, setConnection] = useState<Connection>(
    new Connection(clusterApiUrl('devnet'), 'confirmed')
  );
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [publicKey, setPublicKey] = useState<PublicKey | null>(null);
  const [balance, setBalance] = useState<number | null>(null);

  const address = publicKey?.toBase58() ?? null;

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
  }, [connection, fetchBalance]);

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
      toast.error(tr('Phantom not installed', 'Phantom не установлен'), {
        description: tr('Please install Phantom wallet to continue.', 'Установите кошелёк Phantom, чтобы продолжить.'),
        action: {
          label: tr('Install', 'Установить'),
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
      toast.success(tr('Wallet connected!', 'Кошелёк подключён!'), { description: pk.toBase58().slice(0, 8) + '...' });
      await fetchBalance(pk, connection);
    } catch (err: any) {
      console.error('[Wallet] Connect error:', err);
      if (err.code === 4001) {
        toast.error(tr('Connection cancelled', 'Подключение отменено'), { description: tr('You rejected the connection in Phantom.', 'Вы отклонили подключение в Phantom.') });
      } else {
        toast.error(tr('Connection failed', 'Ошибка подключения'), { description: err.message || tr('Unknown error', 'Неизвестная ошибка') });
      }
    } finally {
      setConnecting(false);
    }
  }, [connection, fetchBalance, tr]);

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
    toast(tr('Wallet disconnected', 'Кошелёк отключён'));
    console.log('[Wallet] Disconnected.');
  }, [tr]);

  // ─── Sign message ──────────────────────────────────────────────────────────

  const signMessage = useCallback(async (message: string): Promise<string | null> => {
    const phantom = getPhantom();
    if (!phantom || !connected) {
      toast.error(tr('Wallet not connected', 'Кошелёк не подключён'));
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
        toast.error(tr('Signature rejected', 'Подпись отклонена'), { description: tr('You rejected the signing request.', 'Вы отклонили запрос подписи.') });
      } else {
        toast.error(tr('Sign failed', 'Ошибка подписи'), { description: err.message });
      }
      return null;
    }
  }, [connected, tr]);

  // ─── Send SOL ──────────────────────────────────────────────────────────────

  const sendSol = useCallback(async (recipient: string, amountSol: number): Promise<string | null> => {
    const phantom = getPhantom();
    if (!phantom || !publicKey) {
      toast.error(tr('Wallet not connected', 'Кошелёк не подключён'));
      return null;
    }

    try {
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
          loading: tr('Confirming transaction...', 'Подтверждение транзакции...'),
          success: tr(`Confirmed! Sig: ${signature.slice(0, 8)}...`, `Подтверждено! Подпись: ${signature.slice(0, 8)}...`),
          error: tr('Transaction failed to confirm', 'Не удалось подтвердить транзакцию'),
        }
      );

      // Refresh balance after send
      await fetchBalance(publicKey, connection);
      return signature;
    } catch (err: any) {
      console.error('[Wallet] Send error:', err);
      if (err.code === 4001) {
        toast.error(tr('Transaction rejected', 'Транзакция отклонена'), { description: tr('You rejected the transaction.', 'Вы отклонили транзакцию.') });
      } else if (err.message?.includes('Invalid public key')) {
        toast.error(tr('Invalid recipient address', 'Некорректный адрес получателя'));
      } else {
        toast.error(tr('Network error', 'Ошибка сети'), { description: err.message || tr('Please try again.', 'Попробуйте ещё раз.') });
      }
      return null;
    }
  }, [publicKey, connection, fetchBalance, tr]);

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
