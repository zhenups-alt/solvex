import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { RefreshCw } from 'lucide-react';
import { Card, Button } from '../components/UI';
import { usePhantom } from '../components/WalletContextProvider';
import { DecisionLogResponse, getDecisionLogs } from '../lib/solvexApi';

const ACTION_COLORS: Record<string, string> = {
  buy: '#14F195',
  sell: '#EF4444',
  rebalance: '#8B5CF6',
  hold: '#71717A',
};

export default function AnalyticsPage() {
  const { address } = usePhantom();
  const [decisions, setDecisions] = useState<DecisionLogResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!address) {
      setDecisions([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await getDecisionLogs(address, 100);
      setDecisions(response.items);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load analytics');
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    void load();
  }, [load]);

  const actionData = useMemo(() => {
    const counts = decisions.reduce<Record<string, number>>((result, item) => {
      result[item.proposal.action] = (result[item.proposal.action] || 0) + 1;
      return result;
    }, {});
    return Object.entries(counts).map(([name, value]) => ({
      name: name.toUpperCase(),
      value,
      color: ACTION_COLORS[name] || '#F59E0B',
    }));
  }, [decisions]);

  const confidenceData = useMemo(() => {
    const buckets = [
      { bucket: '0–49%', min: 0, max: 0.5, count: 0 },
      { bucket: '50–69%', min: 0.5, max: 0.7, count: 0 },
      { bucket: '70–84%', min: 0.7, max: 0.85, count: 0 },
      { bucket: '85–100%', min: 0.85, max: 1.01, count: 0 },
    ];
    decisions.forEach((item) => {
      const match = buckets.find((bucket) => item.proposal.confidence >= bucket.min && item.proposal.confidence < bucket.max);
      if (match) match.count += 1;
    });
    return buckets;
  }, [decisions]);

  const summary = useMemo(() => ({
    total: decisions.length,
    executable: decisions.filter((item) => item.execution_allowed).length,
    stopped: decisions.filter((item) => !item.execution_allowed).length,
    executed: decisions.filter((item) => item.status === 'executed').length,
  }), [decisions]);

  return (
    <div className="p-8 space-y-8">
      <header className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Decision Analytics</h1>
          <p className="text-text-secondary mt-1">Aggregates only persisted decisions for the connected wallet. No synthetic performance data.</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" disabled={!address || loading} onClick={() => void load()}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </Button>
      </header>

      {!address && <Card className="p-8 text-center text-sm text-text-secondary">Connect Phantom to load wallet-specific analytics.</Card>}
      {error && <Card className="p-6 border-negative/40 text-sm text-negative">{error}</Card>}

      {address && !error && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Recorded decisions', value: summary.total },
              { label: 'Passed both engines', value: summary.executable },
              { label: 'Stopped before execution', value: summary.stopped },
              { label: 'Confirmed executions', value: summary.executed },
            ].map((stat) => (
              <Card key={stat.label}>
                <div className="text-xs text-text-muted uppercase tracking-wider mb-2">{stat.label}</div>
                <div className="text-2xl font-mono font-bold text-text-primary">{stat.value}</div>
              </Card>
            ))}
          </div>

          {decisions.length === 0 ? (
            <Card className="p-12 text-center text-sm text-text-muted">No decisions have been recorded for this wallet yet.</Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <h2 className="text-md font-semibold text-text-primary mb-8">Action distribution</h2>
                <div className="flex flex-col sm:flex-row items-center justify-between gap-8">
                  <div className="h-[220px] w-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={actionData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={5} dataKey="value">
                          {actionData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#1C1C22', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-4 flex-1 w-full">
                    {actionData.map((item) => (
                      <div key={item.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-sm text-text-secondary">{item.name}</span>
                        </div>
                        <span className="text-sm font-mono text-text-primary">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h2 className="text-md font-semibold text-text-primary mb-8">Proposal confidence</h2>
                <div className="h-[220px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={confidenceData}>
                      <XAxis dataKey="bucket" axisLine={false} tickLine={false} tick={{ fill: '#71717A', fontSize: 11 }} />
                      <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#71717A', fontSize: 11 }} />
                      <Tooltip contentStyle={{ backgroundColor: '#1C1C22', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                      <Bar dataKey="count" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-[11px] text-text-muted text-center mt-4">Confidence is model metadata, not a guarantee of performance or correctness.</p>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
