import { useEffect, useMemo, useState } from 'react';
import { Activity, Bot, Shield, Wallet } from 'lucide-react';
import { Badge, Card } from '../components/UI';
import { usePhantom } from '../components/WalletContextProvider';
import { DecisionLogResponse, getDecisionLogs } from '../lib/solvexApi';
import { truncateAddress } from '../lib/utils';
import { useStore } from '../store';

export default function Dashboard() {
  const { address, balance, network } = usePhantom();
  const { config } = useStore();
  const [decisions, setDecisions] = useState<DecisionLogResponse[]>([]);

  useEffect(() => {
    if (!address) {
      setDecisions([]);
      return;
    }
    getDecisionLogs(address, 20).then((response) => setDecisions(response.items)).catch(() => setDecisions([]));
  }, [address]);

  const latest = decisions[0];
  const blocked = useMemo(() => decisions.filter((item) => item.status.startsWith('blocked')).length, [decisions]);

  return (
    <div className="space-y-8 p-8">
      <header className="flex flex-wrap justify-between gap-4 items-end">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{address ? `Vault for ${truncateAddress(address)}` : 'Solvex Dashboard'}</h1>
          <p className="text-text-secondary mt-1">Live wallet state and persisted policy decisions. No demo balances are shown.</p>
        </div>
        <Badge variant={address ? 'positive' : 'warning'}>{address ? `${network} connected` : 'wallet disconnected'}</Badge>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Metric icon={Wallet} label="Wallet balance" value={balance == null ? '—' : `${balance.toFixed(4)} SOL`} note="Read directly from Solana RPC" />
        <Metric icon={Shield} label="Investment cap" value={`$${config.investmentCapUsd.toLocaleString()}`} note="Deterministic backend limit" />
        <Metric icon={Activity} label="Recorded decisions" value={String(decisions.length)} note={`${blocked} stopped by policy or risk`} />
        <Metric icon={Bot} label="Execution mode" value="Fail-closed" note="Live execution remains disabled until deployment" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-md font-semibold text-text-primary mb-5">Latest decision</h2>
          {!latest ? (
            <p className="text-sm text-text-muted">No decisions recorded for this wallet yet.</p>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-3">
                <Badge>{latest.proposal.action}</Badge>
                <span className="font-mono text-sm">{latest.proposal.input_asset || '—'} → {latest.proposal.output_asset || '—'}</span>
                <span className="text-xs text-text-muted">{new Date(latest.created_at).toLocaleString()}</span>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed">{latest.proposal.rationale}</p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <StatusBox label="Shariah screen" value={latest.shariah.status} version={latest.shariah.methodology_version} />
                <StatusBox label="Risk screen" value={latest.risk.status} version={latest.risk.methodology_version} />
              </div>
              <div className="rounded border border-border-subtle bg-bg-elevated p-3 text-xs text-text-secondary">
                Result: <span className="font-mono text-text-primary">{latest.status.replaceAll('_', ' ')}</span>
              </div>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="text-md font-semibold text-text-primary mb-5">Autonomy boundary</h2>
          <div className="space-y-4 text-sm text-text-secondary">
            <BoundaryRow text="AI generates a structured proposal; it cannot approve itself." />
            <BoundaryRow text="Eligible, Review, and Blocked are methodology outcomes—not halal claims." />
            <BoundaryRow text="The owner can pause the vault or revoke the agent at any time." />
            <BoundaryRow text="The agent cannot withdraw; Jupiter swaps are limited to configured custody accounts." />
          </div>
        </Card>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="p-6 border-b border-border-subtle">
          <h2 className="text-md font-semibold text-text-primary">Recent decisions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead><tr className="text-[11px] text-text-muted uppercase tracking-wider border-b border-border-subtle"><th className="px-6 py-4">Time</th><th className="px-6 py-4">Action</th><th className="px-6 py-4">Amount</th><th className="px-6 py-4">Shariah</th><th className="px-6 py-4">Risk</th><th className="px-6 py-4">Result</th></tr></thead>
            <tbody className="divide-y divide-border-subtle">
              {decisions.slice(0, 8).map((row) => (
                <tr key={row.id} className="text-sm">
                  <td className="px-6 py-4 text-text-secondary">{new Date(row.created_at).toLocaleString()}</td>
                  <td className="px-6 py-4 uppercase text-xs font-bold">{row.proposal.action}</td>
                  <td className="px-6 py-4 font-mono">${Number(row.proposal.amount_usd).toLocaleString()}</td>
                  <td className="px-6 py-4">{row.shariah.status}</td>
                  <td className="px-6 py-4">{row.risk.status}</td>
                  <td className="px-6 py-4 font-mono text-xs">{row.status.replaceAll('_', ' ')}</td>
                </tr>
              ))}
              {!decisions.length && <tr><td colSpan={6} className="px-6 py-10 text-center text-sm text-text-muted">Connect a wallet and run an analysis to populate this table.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Metric({ icon: Icon, label, value, note }: { icon: typeof Wallet; label: string; value: string; note: string }) {
  return <Card><div className="flex justify-between gap-4"><div><div className="text-xs text-text-muted uppercase tracking-wider">{label}</div><div className="text-2xl font-mono font-bold text-text-primary mt-3">{value}</div><div className="text-[11px] text-text-secondary mt-2">{note}</div></div><Icon size={20} className="text-accent" /></div></Card>;
}

function StatusBox({ label, value, version }: { label: string; value: string; version: string }) {
  return <div className="rounded border border-border-subtle bg-bg-elevated p-3"><div className="text-text-muted">{label}</div><div className="font-mono uppercase text-text-primary mt-1">{value}</div><div className="text-text-muted mt-1">{version}</div></div>;
}

function BoundaryRow({ text }: { text: string }) {
  return <div className="flex gap-3"><span className="mt-1.5 h-2 w-2 rounded-full bg-accent shrink-0" /><span>{text}</span></div>;
}
