import React from 'react';
import { Cpu, Code, Database, Shield, ArrowRight, Layers } from 'lucide-react';
import { Card, Badge } from '../components/UI';

export default function ArchitecturePage() {
  return (
    <div className="p-8 space-y-12">
      <header>
        <h1 className="text-2xl font-bold text-text-primary">System Architecture</h1>
        <p className="text-text-secondary mt-1">How Claude AI and Solana work together to create an autonomous DeFi vault.</p>
      </header>

      {/* System Diagram */}
      <section className="space-y-6">
        <div className="grid grid-cols-1 gap-4">
          {[
            { layer: 'Frontend', border: 'border-info', items: ['Next.js Dashboard', 'Strategy Builder', 'Decision Log', 'Analytics'] },
            { layer: 'AI Agent Layer', border: 'border-accent', items: ['Claude Agent (OpenClaw MCP)', 'Decision Engine', 'Transaction Builder'] },
            { layer: 'Solana Programs', border: 'border-solana', items: ['Vault Anchor Program', 'DecisionRecord Store', 'Jupiter DEX (CPI)'] },
            { layer: 'Data Layer', border: 'border-info', items: ['Pyth Oracle', 'On-chain State', 'CoinGecko API', 'DeFiLlama'] },
          ].map((row, i) => (
            <div key={i} className="relative">
              <Card className={cn("border-l-4 p-6", row.border)}>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold uppercase tracking-widest text-text-muted">{row.layer}</span>
                </div>
                <div className="flex flex-wrap gap-3">
                  {row.items.map(item => (
                    <div key={item} className="px-4 py-2 bg-bg-elevated border border-border-default rounded text-sm text-text-primary font-medium">
                      {item}
                    </div>
                  ))}
                </div>
              </Card>
              {i < 3 && (
                <div className="flex justify-center py-2">
                  <ArrowRight size={16} className="rotate-90 text-border-strong" />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Smart Contract */}
      <section className="space-y-6">
        <h2 className="text-lg font-semibold text-text-primary">Anchor Program Structure</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              fn: 'initialize_vault',
              code: 'pub fn initialize_vault(\n    ctx: Context<InitializeVault>,\n    risk_profile: RiskProfile,\n    agent_key: Pubkey,\n) -> Result<()>',
              desc: 'Creates the vault PDA. Stores owner, agent keypair, risk profile, initial balances.'
            },
            {
              fn: 'execute_rebalance',
              code: 'pub fn execute_rebalance(\n    ctx: Context<ExecuteRebalance>,\n    reasoning_hash: [u8; 32],\n    action: ActionType,\n    amount_bps: u64,\n) -> Result<()>',
              desc: 'Core on-chain AI action. Only callable by the registered agent keypair. Validates parameters and appends a DecisionRecord.'
            },
            {
              fn: 'withdraw',
              code: 'pub fn withdraw(\n    ctx: Context<Withdraw>,\n    amount: u64,\n    token: TokenType,\n) -> Result<()>',
              desc: 'Vault owner can withdraw SOL or USDC. Includes a check that the agent is not mid-execution.'
            }
          ].map((item, i) => (
            <Card key={i} className="space-y-4">
              <div className="flex items-center gap-2 text-accent">
                <Code size={16} />
                <span className="text-xs font-mono font-bold">{item.fn}</span>
              </div>
              <pre className="bg-bg-base p-3 rounded border border-border-subtle text-[11px] font-mono text-text-secondary leading-relaxed overflow-x-auto">
                {item.code}
              </pre>
              <p className="text-xs text-text-secondary leading-relaxed">{item.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Tech Stack */}
      <section className="space-y-6">
        <h2 className="text-lg font-semibold text-text-primary">Technology Stack</h2>
        <Card className="p-0 overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[11px] text-text-muted uppercase tracking-wider border-b border-border-subtle">
                <th className="px-6 py-4 font-medium">Layer</th>
                <th className="px-6 py-4 font-medium">Technology</th>
                <th className="px-6 py-4 font-medium">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {[
                { layer: 'Smart Contract', tech: 'Anchor (Rust) on Solana', role: 'Vault state + decision recording' },
                { layer: 'AI Model', tech: 'Claude Sonnet via Anthropic API', role: 'Market reasoning and action selection' },
                { layer: 'Agent Framework', tech: 'OpenClaw MCP', role: 'Tool orchestration for Claude' },
                { layer: 'DEX Integration', tech: 'Jupiter Aggregator v6', role: 'Best-execution swap routing' },
                { layer: 'Price Oracle', tech: 'Pyth Network', role: 'Real-time SOL/USDC feeds' },
              ].map((row, i) => (
                <tr key={i} className="text-sm">
                  <td className="px-6 py-4 text-text-primary font-medium">{row.layer}</td>
                  <td className="px-6 py-4 text-text-secondary">{row.tech}</td>
                  <td className="px-6 py-4 text-text-muted">{row.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
