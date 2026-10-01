/**
 * WalletFeatures.tsx
 * 
 * Wallet info panel, Send SOL form, Sign Message, and Network Switcher.
 * Uses usePhantom() which talks directly to window.solana (Phantom API).
 */

import React, { useState } from 'react';
import { toast } from 'sonner';
import { usePhantom } from './WalletContextProvider';
import { Button } from './UI';
import { truncateAddress } from '../lib/utils';
import { Send, Edit3, Globe, Activity, Copy, ExternalLink, CheckCircle } from 'lucide-react';

export const WalletFeatures = () => {
    const { connected, address, balance, network, setNetwork, sendSol, signMessage } = usePhantom();

    // Send SOL form state
    const [recipient, setRecipient] = useState('');
    const [amount, setAmount] = useState('');
    const [sending, setSending] = useState(false);
    const [lastTxSig, setLastTxSig] = useState<string | null>(null);

    // Sign message state
    const [signing, setSigning] = useState(false);
    const [lastSignature, setLastSignature] = useState<string | null>(null);

    // ─── Not connected state ────────────────────────────────────────────────

    if (!connected || !address) {
        return (
            <div className="p-8 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col items-center justify-center text-center space-y-4 min-h-[200px]">
                <Activity size={32} className="text-text-muted" />
                <div className="text-text-secondary text-sm">
                    Connect your wallet to access these features.
                </div>
                <div className="text-text-muted text-xs">
                    Click the "Connect" button in the top navigation.
                </div>
            </div>
        );
    }

    // ─── Send SOL ────────────────────────────────────────────────────────────

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log('[WalletFeatures] Send SOL to:', recipient, 'amount:', amount);
        setSending(true);
        setLastTxSig(null);
        const sig = await sendSol(recipient, parseFloat(amount));
        if (sig) {
            setLastTxSig(sig);
            setRecipient('');
            setAmount('');
        }
        setSending(false);
    };

    // ─── Sign message ─────────────────────────────────────────────────────────

    const handleSign = async () => {
        console.log('[WalletFeatures] Signing message...');
        setSigning(true);
        setLastSignature(null);
        const sig = await signMessage('I agree to the terms of this site');
        if (sig) {
            setLastSignature(sig);
        }
        setSigning(false);
    };

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="space-y-6">

            {/* ── Wallet Info Panel ───────────────────────────────────────── */}
            <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl space-y-4">
                <div className="flex justify-between items-center">
                    <span className="text-text-muted uppercase tracking-widest text-[10px] font-semibold">Wallet Info</span>
                    <div className="flex items-center gap-2 text-text-secondary text-xs">
                        <Globe size={13} />
                        <select
                            value={network}
                            onChange={(e) => setNetwork(e.target.value as any)}
                            className="bg-transparent border-none outline-none cursor-pointer text-text-primary text-xs"
                        >
                            <option value="mainnet-beta">Mainnet Beta</option>
                            <option value="devnet">Devnet</option>
                            <option value="testnet">Testnet</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-4 bg-black/40 rounded-xl border border-white/5">
                        <span className="text-[11px] text-text-muted uppercase tracking-wider block mb-1">Address</span>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-mono text-text-primary">{truncateAddress(address)}</span>
                            <button
                                onClick={() => { navigator.clipboard.writeText(address); toast.success('Copied!'); }}
                                className="text-text-muted hover:text-accent transition-colors"
                            >
                                <Copy size={13} />
                            </button>
                            <a
                                href={`https://explorer.solana.com/address/${address}?cluster=${network}`}
                                target="_blank" rel="noopener noreferrer"
                                className="text-text-muted hover:text-accent transition-colors"
                            >
                                <ExternalLink size={13} />
                            </a>
                        </div>
                    </div>
                    <div className="p-4 bg-black/40 rounded-xl border border-white/5">
                        <span className="text-[11px] text-text-muted uppercase tracking-wider block mb-1">Balance</span>
                        <span className="text-sm font-mono text-accent">
                            {balance !== null ? `${balance.toFixed(4)} SOL` : 'Loading...'}
                        </span>
                    </div>
                </div>

                <div className="p-3 bg-black/20 rounded-xl border border-white/5">
                    <span className="text-[10px] text-text-muted block mb-1">Full Address</span>
                    <span className="text-[11px] font-mono text-text-secondary break-all">{address}</span>
                </div>
            </div>

            {/* ── Send SOL Form ────────────────────────────────────────────── */}
            <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl space-y-4">
                <span className="text-text-muted uppercase tracking-widest text-[10px] font-semibold">Send SOL</span>
                <form onSubmit={handleSend} className="space-y-3">
                    <input
                        type="text"
                        placeholder="Recipient Solana address"
                        value={recipient}
                        onChange={(e) => setRecipient(e.target.value)}
                        className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-2.5 text-sm font-mono text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none transition-colors"
                        required
                    />
                    <input
                        type="number"
                        step="any"
                        min="0"
                        placeholder="Amount in SOL (e.g. 0.001)"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-2.5 text-sm font-mono text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none transition-colors"
                        required
                    />
                    <Button type="submit" disabled={sending} className="w-full gap-2">
                        <Send size={15} />
                        {sending ? 'Sending...' : 'Send SOL'}
                    </Button>
                </form>

                {lastTxSig && (
                    <div className="p-3 bg-positive/5 border border-positive/20 rounded-xl space-y-1">
                        <div className="flex items-center gap-2 text-positive text-[11px] font-semibold">
                            <CheckCircle size={13} /> Transaction sent!
                        </div>
                        <div className="text-[10px] font-mono text-text-muted break-all">{lastTxSig}</div>
                        <a
                            href={`https://explorer.solana.com/tx/${lastTxSig}?cluster=${network}`}
                            target="_blank" rel="noopener noreferrer"
                            className="text-[10px] text-accent hover:underline flex items-center gap-1"
                        >
                            View on Solana Explorer <ExternalLink size={10} />
                        </a>
                    </div>
                )}
            </div>

            {/* ── Sign Message ─────────────────────────────────────────────── */}
            <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl space-y-4">
                <span className="text-text-muted uppercase tracking-widest text-[10px] font-semibold">Sign Message</span>
                <div className="text-sm text-text-secondary bg-black/40 p-4 rounded-xl border border-white/5 italic">
                    "I agree to the terms of this site"
                </div>
                <Button
                    variant="secondary"
                    disabled={signing}
                    onClick={handleSign}
                    className="w-full gap-2 text-accent bg-accent/10 hover:bg-accent/20 border-accent/20"
                >
                    <Edit3 size={15} />
                    {signing ? 'Waiting for signature...' : 'Sign this message'}
                </Button>

                {lastSignature && (
                    <div className="p-3 bg-accent/5 border border-accent/20 rounded-xl space-y-1">
                        <div className="flex items-center gap-2 text-accent text-[11px] font-semibold">
                            <CheckCircle size={13} /> Message signed!
                        </div>
                        <div className="text-[10px] text-text-muted block mb-1">Base58 Signature:</div>
                        <div className="text-[10px] font-mono text-text-secondary break-all">{lastSignature}</div>
                    </div>
                )}
            </div>
        </div>
    );
};
