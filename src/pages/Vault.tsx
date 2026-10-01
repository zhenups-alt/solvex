import React, { useState } from 'react';
import { Wallet, ArrowDown, ArrowUp, History, Copy, ExternalLink } from 'lucide-react';
import { Card, Button, Badge } from '../components/UI';
import { useStore } from '../store';
import { truncateAddress, formatCurrency } from '../lib/utils';

export default function VaultPage() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="p-8 space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-text-primary">Vault Management</h1>
        <p className="text-text-secondary mt-1">Manage your assets and view vault performance.</p>
      </header>

      <div className="flex gap-1 border-b border-border-subtle">
        {['overview', 'manage', 'history'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-6 py-3 text-sm font-medium transition-all border-b-2 capitalize",
              activeTab === tab ? "border-accent text-text-primary" : "border-transparent text-text-muted hover:text-text-secondary"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <Card className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 p-8">
            <div className="space-y-4">
              <div>
                <div className="text-[11px] text-text-muted uppercase tracking-wider mb-1">Vault Address</div>
                <div className="flex items-center gap-2 font-mono text-sm text-text-primary">
                  <span>HN3x8mPQ...2R9s</span>
                  <Copy size={14} className="text-text-muted cursor-pointer hover:text-accent" />
                  <ExternalLink size={14} className="text-text-muted cursor-pointer hover:text-accent" />
                </div>
              </div>
              <div>
                <div className="text-[11px] text-text-muted uppercase tracking-wider mb-1">Risk Profile</div>
                <Badge variant="accent">Balanced</Badge>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <div className="text-[11px] text-text-muted uppercase tracking-wider mb-1">Program ID</div>
                <div className="flex items-center gap-2 font-mono text-sm text-text-primary">
                  <span>SAgnt...Vlt8</span>
                  <Copy size={14} className="text-text-muted cursor-pointer hover:text-accent" />
                </div>
              </div>
              <div>
                <div className="text-[11px] text-text-muted uppercase tracking-wider mb-1">Created</div>
                <span className="text-sm text-text-primary">2026-04-01 09:14 UTC</span>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <div className="text-[11px] text-text-muted uppercase tracking-wider mb-1">Owner</div>
                <span className="text-sm text-text-primary font-mono">5xK9...m3nP</span>
              </div>
              <div>
                <div className="text-[11px] text-text-muted uppercase tracking-wider mb-1">Agent Keypair</div>
                <span className="text-sm text-text-primary font-mono">9mPQ...8Rtt</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'manage' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-positive-dim flex items-center justify-center text-positive">
                <ArrowDown size={20} />
              </div>
              <h2 className="text-lg font-semibold">Deposit</h2>
            </div>
            <div className="space-y-6">
              <div>
                <label className="block text-xs text-text-muted uppercase tracking-wider mb-2">Token</label>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 gap-2 border-accent text-text-primary">
                    <div className="w-5 h-5 rounded-full bg-solana" /> SOL
                  </Button>
                  <Button variant="outline" className="flex-1 gap-2">
                    <div className="w-5 h-5 rounded-full bg-info" /> USDC
                  </Button>
                </div>
              </div>
              <div>
                <label className="block text-xs text-text-muted uppercase tracking-wider mb-2">Amount</label>
                <div className="relative">
                  <input 
                    type="number" 
                    placeholder="0.00"
                    className="w-full bg-bg-elevated border border-border-default rounded-md h-12 px-4 font-mono text-lg focus:outline-none focus:border-accent"
                  />
                  <button className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-accent hover:opacity-80">MAX</button>
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-[11px] text-text-muted">Balance: 1.24 SOL</span>
                  <span className="text-[11px] text-text-muted">~$0.00</span>
                </div>
              </div>
              <Button className="w-full h-12 text-base">Deposit SOL</Button>
            </div>
          </Card>

          <Card className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-negative-dim flex items-center justify-center text-negative">
                <ArrowUp size={20} />
              </div>
              <h2 className="text-lg font-semibold">Withdraw</h2>
            </div>
            <div className="space-y-6">
              <div>
                <label className="block text-xs text-text-muted uppercase tracking-wider mb-2">Amount</label>
                <div className="relative">
                  <input 
                    type="number" 
                    placeholder="0.00"
                    className="w-full bg-bg-elevated border border-border-default rounded-md h-12 px-4 font-mono text-lg focus:outline-none focus:border-accent"
                  />
                </div>
                <div className="grid grid-cols-4 gap-2 mt-3">
                  {['25%', '50%', '75%', '100%'].map(p => (
                    <button key={p} className="h-8 bg-bg-elevated border border-border-default rounded text-[11px] font-medium text-text-secondary hover:text-text-primary hover:border-border-strong transition-all">{p}</button>
                  ))}
                </div>
              </div>
              <div className="p-4 bg-warning-dim/10 border border-warning-dim rounded-md">
                <p className="text-xs text-warning leading-relaxed">
                  Agent is currently executing. Withdrawal will be processed after current cycle (approx. 4m 46s).
                </p>
              </div>
              <Button variant="outline" className="w-full h-12 text-base border-negative text-negative hover:bg-negative-dim">Withdraw Assets</Button>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'history' && (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[11px] text-text-muted uppercase tracking-wider border-b border-border-subtle">
                  <th className="px-6 py-4 font-medium">Date/Time</th>
                  <th className="px-6 py-4 font-medium">Type</th>
                  <th className="px-6 py-4 font-medium">Amount</th>
                  <th className="px-6 py-4 font-medium">Token</th>
                  <th className="px-6 py-4 font-medium">TX Hash</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {[
                  { date: '2026-04-02 14:32', type: 'Rebalance (Buy)', amount: '0.085', token: 'SOL', hash: '5xK9...nP3Q', status: 'Confirmed' },
                  { date: '2026-04-02 12:15', type: 'Deposit', amount: '0.500', token: 'SOL', hash: 'HN3x...2PqR', status: 'Confirmed' },
                  { date: '2026-04-01 18:44', type: 'Rebalance (Sell)', amount: '120.50', token: 'USDC', hash: 'SAgn...Vlt8', status: 'Confirmed' },
                ].map((row, i) => (
                  <tr key={i} className="text-sm hover:bg-bg-subtle transition-colors">
                    <td className="px-6 py-4 text-text-secondary font-mono">{row.date}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "text-[10px] font-bold uppercase",
                        row.type.includes('Buy') || row.type === 'Deposit' ? "text-positive" : "text-negative"
                      )}>{row.type}</span>
                    </td>
                    <td className="px-6 py-4 font-mono text-text-primary">{row.amount}</td>
                    <td className="px-6 py-4 text-text-secondary">{row.token}</td>
                    <td className="px-6 py-4 font-mono text-text-muted">{row.hash}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-text-secondary">
                        <div className="w-1.5 h-1.5 rounded-full bg-positive" />
                        {row.status}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
