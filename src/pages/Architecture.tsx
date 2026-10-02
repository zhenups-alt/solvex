import React from 'react';
import { Code, ArrowRight } from 'lucide-react';
import { Card } from '../components/UI';

export default function ArchitecturePage() {
  return (
    <div className="p-8 space-y-12">
      <header>
        <h1 className="text-2xl font-bold text-text-primary">System Architecture</h1>
        <p className="text-text-secondary mt-1">How untrusted AI proposals pass through deterministic policy and risk controls before Solana execution.</p>
      </header>

      {/* System Diagram */}
      <section className="space-y-6">
        <div className="grid grid-cols-1 gap-4">
          {[
            { layer: 'Client', border: 'border-info', items: ['React + Vite', 'Phantom Wallet', 'Risk Configuration', 'Decision Log'] },
            { layer: 'Backend', border: 'border-accent', items: ['FastAPI', 'Gemini Proposal Adapter', 'Shariah Policy Engine', 'Risk Engine'] },
            { layer: 'Execution Boundary', border: 'border-solana', items: ['Simulation Gate', 'Jupiter v6 CPI', 'Agent Signer', 'Fail-Closed Status'] },
            { layer: 'Persistence + Chain', border: 'border-info', items: ['PostgreSQL / SQLAlchemy', 'Per-User Vault PDA', 'SPL Token Custody', 'Decision Hash Event'] },
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
              code: 'pub fn initialize_vault(\n    ctx: Context<InitializeVault>,\n    agent: Pubkey,\n    limits: VaultLimits,\n) -> Result<()>',
              desc: 'Creates a per-owner vault PDA and its base/quote custody accounts. Every new vault starts paused.'
            },
            {
              fn: 'execute_jupiter_swap',
              code: 'pub fn execute_jupiter_swap(\n    ctx: Context<ExecuteJupiterSwap>,\n    args: SwapArgs,\n    instruction_data: Vec<u8>,\n) -> Result<()>',
              desc: 'Allows only the configured agent, canonical Jupiter v6 program, configured pair, fresh quote, and trades inside hard limits.'
            },
            {
              fn: 'withdraw_base / withdraw_quote',
              code: 'pub fn withdraw_base(\n    ctx: Context<WithdrawBase>,\n    amount: u64,\n) -> Result<()>',
              desc: 'Only the vault owner can withdraw. The delegated agent is intentionally unable to transfer assets to arbitrary recipients.'
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
                { layer: 'Smart Contract', tech: 'Anchor 0.31.1 / Rust', role: 'Vault custody and on-chain execution constraints' },
                { layer: 'AI Adapter', tech: 'Google Gen AI SDK', role: 'Schema-constrained portfolio proposals' },
                { layer: 'Backend', tech: 'Python / FastAPI / SQLAlchemy', role: 'Policy, risk, orchestration, and audit trail' },
                { layer: 'Database', tech: 'PostgreSQL', role: 'Profiles and explainable decision records' },
                { layer: 'DEX Boundary', tech: 'Jupiter v6 CPI', role: 'Constrained base/quote spot swap execution' },
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
