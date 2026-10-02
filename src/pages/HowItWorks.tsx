import React from 'react';
import { Card } from '../components/UI';
import { Activity, Brain, CheckCircle, Zap, Shield, FileCheck } from 'lucide-react';

export default function HowItWorksPage() {
  return (
    <div className="p-8 space-y-12">
      <header>
        <h1 className="text-2xl font-bold text-text-primary">How Solvex Works</h1>
        <p className="text-text-secondary mt-1">A guarded agent loop where the model proposes and deterministic code decides.</p>
      </header>

      <section className="space-y-8">
        <div className="prose prose-invert max-w-none">
          <p className="text-lg text-text-secondary leading-relaxed">
            Solvex separates portfolio analysis from authorization. The model can recommend HOLD, BUY, SELL, or REBALANCE, but it cannot approve its own proposal. Shariah screening, risk limits, simulation, and the on-chain vault independently decide whether execution is allowed.
          </p>
        </div>

        <div className="space-y-12">
          <h2 className="text-xl font-bold text-text-primary">The Agent Loop</h2>
          <div className="space-y-8 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-border-subtle">
            {[
              { step: '01', title: 'Structured Snapshot', desc: 'The backend assembles explicit portfolio, market, and user-risk inputs. Missing evidence is treated as a reason to stop.', icon: Activity },
              { step: '02', title: 'AI Proposal', desc: 'The OpenAI adapter returns one schema-constrained proposal and rationale. The output is untrusted input, not authorization.', icon: Brain },
              { step: '03', title: 'Shariah Firewall', desc: 'Assets, protocol, and transaction mechanics are evaluated as Eligible, Review, or Blocked. Review never auto-executes.', icon: Shield },
              { step: '04', title: 'Risk Validation', desc: 'The deterministic Risk Engine applies the user investment cap, single-trade cap, daily turnover, drawdown, and slippage limits.', icon: CheckCircle },
              { step: '05', title: 'Simulation and Execution', desc: 'Only an eligible proposal may be simulated. Live Jupiter execution stays disabled until deployment and integration checks are complete.', icon: Zap },
              { step: '06', title: 'Decision Log', desc: 'The database records the proposal and every check. A successful swap also emits its decision hash and nonce from the vault program.', icon: FileCheck },
            ].map((item, i) => (
              <div key={i} className="relative pl-12">
                <div className="absolute left-0 top-0 w-8 h-8 rounded-full bg-bg-elevated border border-border-default flex items-center justify-center text-xs font-mono text-accent z-10">
                  {item.step}
                </div>
                <Card className="p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <item.icon size={18} className="text-accent" />
                    <h3 className="text-md font-semibold text-text-primary">{item.title}</h3>
                  </div>
                  <p className="text-sm text-text-secondary leading-relaxed">{item.desc}</p>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-xl font-bold text-text-primary">Setting Up a Wallet</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6 space-y-4">
            <div className="w-8 h-8 rounded-full bg-bg-elevated flex items-center justify-center text-sm font-bold">1</div>
            <h3 className="text-md font-semibold">Install Phantom</h3>
            <p className="text-sm text-text-secondary">Download the Phantom wallet extension for your browser or the mobile app.</p>
            <a href="https://phantom.com/download" target="_blank" rel="noreferrer" className="inline-flex h-9 items-center rounded-md border border-border-default px-3 text-sm font-medium hover:bg-bg-subtle">Get Phantom</a>
          </Card>
          <Card className="p-6 space-y-4">
            <div className="w-8 h-8 rounded-full bg-bg-elevated flex items-center justify-center text-sm font-bold">2</div>
            <h3 className="text-md font-semibold">Switch to Devnet</h3>
            <p className="text-sm text-text-secondary">Open settings in Phantom, go to Developer Settings, and enable Testnet Mode. Select Solana Devnet.</p>
          </Card>
        </div>
      </section>
    </div>
  );
}
