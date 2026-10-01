import React from 'react';
import { Card } from '../components/UI';
import { Book, Code, Shield, Info } from 'lucide-react';

export default function DocsPage() {
  return (
    <div className="p-8 grid grid-cols-[240px,1fr] gap-12">
      <aside className="space-y-8">
        <div className="space-y-1">
          <h3 className="text-[10px] uppercase tracking-widest text-text-muted font-bold mb-4">Documentation</h3>
          {['Getting Started', 'Architecture', 'Smart Contract', 'Agent Config', 'Security Model', 'FAQ'].map(item => (
            <button key={item} className="w-full text-left px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-subtle rounded-md transition-all">
              {item}
            </button>
          ))}
        </div>
      </aside>

      <div className="max-w-3xl space-y-12">
        <section className="space-y-6">
          <h1 className="text-3xl font-bold text-text-primary">Getting Started</h1>
          <p className="text-text-secondary leading-relaxed">
            Solvex allows you to deploy an autonomous AI agent that manages your Solana assets. This guide will help you set up your first vault.
          </p>
          
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-text-primary">Prerequisites</h2>
            <ul className="list-disc list-inside text-sm text-text-secondary space-y-2 ml-4">
              <li>A Solana wallet (Phantom, Backpack, or Solflare)</li>
              <li>Solana Devnet SOL (get some from a faucet)</li>
              <li>Basic understanding of DeFi vaults</li>
            </ul>
          </div>

          <Card className="p-6 bg-bg-elevated/50 border-info-dim/20">
            <div className="flex gap-3">
              <Info className="text-info shrink-0" size={18} />
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-text-primary">Note on Devnet</h4>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Solvex is currently live on Solana Devnet. No real funds are used. This is for demonstration and testing purposes only.
                </p>
              </div>
            </div>
          </Card>
        </section>

        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-text-primary">Security Model</h2>
          <p className="text-text-secondary leading-relaxed">
            Solvex uses a multi-layered security approach to ensure your funds are safe while allowing the AI agent to act autonomously.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-4 space-y-2">
              <div className="flex items-center gap-2 text-accent">
                <Shield size={16} />
                <h4 className="text-sm font-semibold">Non-Custodial</h4>
              </div>
              <p className="text-xs text-text-secondary">The agent can only execute trades within the vault. It cannot transfer funds to external addresses.</p>
            </Card>
            <Card className="p-4 space-y-2">
              <div className="flex items-center gap-2 text-accent">
                <Code size={16} />
                <h4 className="text-sm font-semibold">Program-Level Rules</h4>
              </div>
              <p className="text-xs text-text-secondary">The Anchor program enforces risk parameters on-chain, preventing the agent from exceeding limits.</p>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}
