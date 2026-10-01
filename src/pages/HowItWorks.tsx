import React from 'react';
import { Card, Button } from '../components/UI';
import { ArrowRight, Activity, Brain, CheckCircle, Zap, Shield } from 'lucide-react';

export default function HowItWorksPage() {
  return (
    <div className="p-8 space-y-12">
      <header>
        <h1 className="text-2xl font-bold text-text-primary">How Solvex Works</h1>
        <p className="text-text-secondary mt-1">Autonomous DeFi asset management explained for everyone.</p>
      </header>

      <section className="space-y-8">
        <div className="prose prose-invert max-w-none">
          <p className="text-lg text-text-secondary leading-relaxed">
            Imagine you hold SOL and USDC in a DeFi vault. SOL crashes 15% in one hour. By the time you wake up, notice, and manually rebalance — you've missed the optimal entry. solvex's AI agent detects the deviation within minutes, reasons about whether it's a buying opportunity or a warning signal, and executes the optimal response autonomously — at any hour, without emotion.
          </p>
        </div>

        <div className="space-y-12">
          <h2 className="text-xl font-bold text-text-primary">The Agent Loop</h2>
          <div className="space-y-8 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-border-subtle">
            {[
              { step: '01', title: 'Data Collection', desc: 'Every 5 minutes, the agent fetches real-time price data from Pyth oracles and historical context from on-chain state.', icon: Activity },
              { step: '02', title: 'AI Reasoning', desc: 'Claude AI receives a structured market snapshot and reasons through the optimal action given the vault\'s risk profile.', icon: Brain },
              { step: '03', title: 'Validation', desc: 'The Decision Engine validates Claude\'s output against safety rules: max drawdown, slippage limits, and balance thresholds.', icon: CheckCircle },
              { step: '04', title: 'Execution', desc: 'The agent signs and broadcasts a Jupiter DEX swap transaction to rebalance the portfolio.', icon: Zap },
              { step: '05', title: 'On-chain Recording', desc: 'The Anchor program writes a DecisionRecord: action type, reasoning hash, and slot number. Permanent and verifiable.', icon: Shield },
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
            <Button variant="outline" size="sm">Get Phantom</Button>
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
