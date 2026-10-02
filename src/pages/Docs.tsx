import React from 'react';
import { Card } from '../components/UI';
import { Code, Shield, Info } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function DocsPage() {
  return (
    <div className="p-8 grid grid-cols-1 lg:grid-cols-[240px,1fr] gap-12">
      <aside className="space-y-8">
        <div className="space-y-1">
          <h3 className="text-[10px] uppercase tracking-widest text-text-muted font-bold mb-4">Documentation</h3>
          {[
            ['Getting Started', '/docs'],
            ['Architecture', '/architecture'],
            ['Vault Program', '/vault'],
            ['Agent Config', '/agent-config'],
            ['Decision Log', '/decisions'],
          ].map(([item, path]) => (
            <Link key={item} to={path} className="block w-full text-left px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-subtle rounded-md transition-all">
              {item}
            </Link>
          ))}
        </div>
      </aside>

      <div className="max-w-3xl space-y-12">
        <section className="space-y-6">
          <h1 className="text-3xl font-bold text-text-primary">Getting Started</h1>
          <p className="text-text-secondary leading-relaxed">
            Solvex is a devnet-stage implementation of a policy-constrained Solana asset manager. The current app supports wallet connection, persisted risk profiles, deterministic Shariah and risk checks, an explainable decision log, and a deployed per-user vault program. Live swaps remain disabled pending mainnet readiness and end-to-end simulation checks.
          </p>
          
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-text-primary">Prerequisites</h2>
            <ul className="list-disc list-inside text-sm text-text-secondary space-y-2 ml-4">
              <li>A Phantom wallet (the connector currently implemented by this client)</li>
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
                  The vault program is deployed to Devnet at 8oi1…AkP8. New vaults start paused. Canonical Jupiter v6 is not available as a Devnet SBF program, so the UI keeps swap execution locked and must not be used with real funds.
                </p>
              </div>
            </div>
          </Card>
        </section>

        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-text-primary">Security Model</h2>
          <p className="text-text-secondary leading-relaxed">
            Solvex uses layered controls, but this development build has not received an independent security audit and must not be used with real funds.
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
              <p className="text-xs text-text-secondary">The Anchor program enforces principal, per-trade, daily, pair, quote-expiry, and minimum-output constraints in token atomic units.</p>
            </Card>
          </div>
          <Card className="p-4 border-warning/30">
            <h4 className="text-sm font-semibold text-warning">Shariah methodology status</h4>
            <p className="text-xs text-text-secondary mt-2">Eligible means the configured methodology checks passed; it is not a universal halal certification. Review and Blocked results never auto-execute. Independent scholarly review is still required.</p>
          </Card>
        </section>
      </div>
    </div>
  );
}
