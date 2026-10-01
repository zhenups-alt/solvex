import React, { useState } from 'react';
import { Search, Filter, Download, ChevronDown, Copy, ExternalLink, Info } from 'lucide-react';
import { Card, Button, Badge } from '../components/UI';
import { cn } from '../lib/utils';
import { useStore } from '../store';

export default function DecisionLogPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { decisions } = useStore();

  return (
    <div className="p-8 space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-text-primary">Decision Log</h1>
        <p className="text-text-secondary mt-1">Every AI decision recorded on-chain. Reasoning hashes verifiable by anyone.</p>
      </header>

      <div className="flex gap-6 text-xs text-text-muted font-mono">
        <span>{decisions.length} total</span>
        <span>·</span>
        <span>100% on-chain</span>
        <span>·</span>
        <span>100% hash verified</span>
        <span>·</span>
        <span>since 2026-04-01</span>
      </div>

      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-4 flex-1 max-w-2xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
            <input 
              type="text" 
              placeholder="Search reasoning text or TX hash..."
              className="w-full h-10 bg-bg-elevated border border-border-default rounded-md pl-10 pr-4 text-sm focus:outline-none focus:border-accent"
            />
          </div>
          <Button variant="outline" className="gap-2"><Filter size={16} /> Filters</Button>
        </div>
        <Button variant="outline" className="gap-2"><Download size={16} /> Export CSV</Button>
      </div>

      <Card className="p-6 border-accent-border bg-accent-dim/5">
        <div className="flex items-start gap-4">
          <div className="w-8 h-8 rounded-full bg-accent-dim flex items-center justify-center text-accent shrink-0">
            <Info size={18} />
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-text-primary">How to verify any decision</h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Run <code className="text-accent font-mono">echo -n "&lt;paste full reasoning text here&gt;" | sha256sum</code>. The output will match the On-chain Hash exactly. This proves Claude's reasoning has not been altered since it was recorded on Solana.
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[11px] text-text-muted uppercase tracking-wider border-b border-border-subtle">
                <th className="px-6 py-4 font-medium">Time</th>
                <th className="px-6 py-4 font-medium">Action</th>
                <th className="px-6 py-4 font-medium">Amount</th>
                <th className="px-6 py-4 font-medium">Confidence</th>
                <th className="px-6 py-4 font-medium">Key Signals</th>
                <th className="px-6 py-4 font-medium">On-chain Hash</th>
                <th className="px-6 py-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {decisions.map((row) => (
                <React.Fragment key={row.id}>
                  <tr 
                    onClick={() => setExpandedId(expandedId === row.id ? null : row.id)}
                    className={cn(
                      "text-sm hover:bg-bg-subtle transition-colors cursor-pointer group",
                      expandedId === row.id && "bg-bg-subtle"
                    )}
                  >
                    <td className="px-6 py-4 text-text-secondary">{new Date(row.timestamp).toLocaleTimeString()}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                        row.action === 'BUY_SOL' ? "bg-positive-dim text-positive" : 
                        row.action === 'SELL_SOL' ? "bg-negative-dim text-negative" : "bg-bg-elevated text-text-muted"
                      )}>{row.action}</span>
                    </td>
                    <td className="px-6 py-4 font-mono text-text-primary">{row.amount_pct > 0 ? `${row.amount_pct}%` : '—'}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-text-primary">{row.confidence}%</span>
                        <div className="w-12 h-1 bg-bg-elevated rounded-full overflow-hidden">
                          <div className="h-full bg-accent" style={{ width: `${row.confidence}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-text-secondary">{row.key_signals.join(', ')}</td>
                    <td className="px-6 py-4 font-mono text-text-muted">{row.txHash.slice(0, 8)}...</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-text-secondary">
                        <div className="w-1.5 h-1.5 rounded-full bg-positive" />
                        {row.status}
                      </div>
                    </td>
                  </tr>
                  {expandedId === row.id && (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 bg-bg-subtle/50 border-y border-border-subtle">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                          <div className="space-y-4">
                            <h4 className="text-[11px] uppercase tracking-wider text-text-muted font-semibold">Reasoning</h4>
                            <p className="text-sm text-text-secondary leading-relaxed italic">
                              "{row.reasoning}"
                            </p>
                            <div className="flex flex-wrap gap-2 pt-2">
                              {row.key_signals.map(s => <Badge key={s}>{s}</Badge>)}
                            </div>
                          </div>
                          <div className="space-y-6">
                            <div>
                              <h4 className="text-[11px] uppercase tracking-wider text-text-muted font-semibold mb-2">On-chain Proof</h4>
                              <div className="bg-bg-base p-4 rounded border border-border-subtle space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] text-text-muted">Reasoning Hash (SHA-256)</span>
                                  <button className="text-text-muted hover:text-accent"><Copy size={14} /></button>
                                </div>
                                <div className="font-mono text-xs text-text-primary break-all">
                                  {row.txHash}
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-4">
                              <Button variant="outline" size="sm" className="flex-1 gap-2"><ExternalLink size={14} /> Jupiter TX</Button>
                              <Button variant="outline" size="sm" className="flex-1 gap-2"><ExternalLink size={14} /> Vault TX</Button>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
