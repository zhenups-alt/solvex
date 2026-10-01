import React from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { ArrowUpRight, ArrowDownRight, MoreHorizontal, Copy } from 'lucide-react';
import { Card, Button, Badge } from '../components/UI';
import { useStore } from '../store';
import { cn, formatCurrency, truncateAddress } from '../lib/utils';

const performanceData = [
  { time: '00:00', value: 1100, hodl: 1100 },
  { time: '04:00', value: 1120, hodl: 1110 },
  { time: '08:00', value: 1150, hodl: 1130 },
  { time: '12:00', value: 1140, hodl: 1160 },
  { time: '16:00', value: 1180, hodl: 1150 },
  { time: '20:00', value: 1210, hodl: 1170 },
  { time: '23:59', value: 1240.50, hodl: 1180 },
];

const allocationData = [
  { name: 'SOL', value: 766.31, color: '#14F195' },
  { name: 'USDC', value: 474.19, color: '#3B82F6' },
];

export default function Dashboard() {
  const { walletAddress, decisions } = useStore();
  const latestDecision = decisions[0];

  return (
    <div className="space-y-8 p-8">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Good morning, {walletAddress ? truncateAddress(walletAddress) : 'Guest'}</h1>
          <p className="text-text-secondary mt-1">Your vault is being managed autonomously.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-accent-dim border border-accent-border rounded-md">
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse-accent" />
            <span className="text-xs font-mono text-accent uppercase font-bold">Agent Running</span>
          </div>
          <span className="text-xs text-text-muted">Last decision: {latestDecision ? 'just now' : 'never'}</span>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="text-xs text-text-muted uppercase tracking-wider mb-2">Total Value</div>
          <div className="text-2xl font-mono font-bold text-text-primary">$1,240.50</div>
          <div className="text-[11px] text-text-secondary mt-1">0.872 SOL · 615.20 USDC</div>
          <div className="flex items-center gap-1 mt-3 text-positive">
            <ArrowUpRight size={12} />
            <span className="text-xs font-medium">+8.3% (7d)</span>
          </div>
        </Card>
        <Card>
          <div className="text-xs text-text-muted uppercase tracking-wider mb-2">vs. HODL Strategy</div>
          <div className="text-2xl font-mono font-bold text-positive">+5.2%</div>
          <div className="text-[11px] text-text-secondary mt-1">Outperforming passive hold</div>
          <div className="w-full h-1 bg-bg-elevated rounded-full mt-4 overflow-hidden">
            <div className="h-full bg-positive w-[65%]" />
          </div>
        </Card>
        <Card>
          <div className="text-xs text-text-muted uppercase tracking-wider mb-2">Decisions (24h)</div>
          <div className="text-2xl font-mono font-bold text-text-primary">{decisions.filter(d => new Date(d.timestamp) > new Date(Date.now() - 86400000)).length}</div>
          <div className="text-[11px] text-text-secondary mt-1">
            {decisions.filter(d => d.action === 'BUY_SOL').length} BUY · {decisions.filter(d => d.action === 'SELL_SOL').length} SELL · {decisions.filter(d => d.action === 'HOLD').length} HOLD
          </div>
          <div className="flex gap-1.5 mt-4">
            <div className="w-1.5 h-1.5 rounded-full bg-positive" />
            <div className="w-1.5 h-1.5 rounded-full bg-negative" />
            <div className="w-1.5 h-1.5 rounded-full bg-neutral" />
          </div>
        </Card>
        <Card>
          <div className="text-xs text-text-muted uppercase tracking-wider mb-2">Transaction Fees</div>
          <div className="text-2xl font-mono font-bold text-text-primary">0.0058 SOL</div>
          <div className="text-[11px] text-text-secondary mt-1">~$0.82 this week</div>
          <div className="text-[11px] text-text-muted mt-3">$0.014 per decision</div>
        </Card>
      </div>

      {/* Performance Chart */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-md font-semibold text-text-primary">Portfolio Performance</h2>
          <div className="flex bg-bg-elevated p-1 rounded-md">
            {['1D', '7D', '30D', 'All'].map((t) => (
              <button key={t} className={cn(
                "px-3 py-1 text-[11px] font-medium rounded transition-colors",
                t === '1D' ? "bg-bg-card text-text-primary shadow-sm" : "text-text-muted hover:text-text-secondary"
              )}>{t}</button>
            ))}
          </div>
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={performanceData}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#14F195" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#14F195" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="time" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#52525B', fontSize: 11, fontFamily: 'JetBrains Mono' }} 
                dy={10}
              />
              <YAxis 
                hide 
                domain={['dataMin - 50', 'dataMax + 50']} 
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1C1C22', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                itemStyle={{ color: '#FAFAFA', fontSize: '12px', fontFamily: 'JetBrains Mono' }}
                labelStyle={{ color: '#A1A1AA', fontSize: '11px', marginBottom: '4px' }}
              />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="#14F195" 
                strokeWidth={2} 
                fillOpacity={1} 
                fill="url(#colorValue)" 
                name="Solvex"
              />
              <Area 
                type="monotone" 
                dataKey="hodl" 
                stroke="#71717A" 
                strokeWidth={1} 
                strokeDasharray="4 4"
                fill="transparent" 
                name="HODL"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Allocation */}
        <Card className="p-6">
          <h2 className="text-md font-semibold text-text-primary mb-6">Vault Allocation</h2>
          <div className="flex items-center justify-between">
            <div className="h-[200px] w-[200px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={allocationData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {allocationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                <div className="text-xl font-bold text-text-primary">62%</div>
                <div className="text-[10px] text-text-muted uppercase tracking-wider">SOL</div>
              </div>
            </div>
            <div className="space-y-4 flex-1 ml-8">
              {allocationData.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm text-text-secondary">{item.name}</span>
                  </div>
                  <span className="text-sm font-mono text-text-primary">{formatCurrency(item.value)}</span>
                </div>
              ))}
              <div className="pt-4 border-t border-border-subtle">
                <div className="text-[11px] text-text-muted mb-1">Target Allocation</div>
                <div className="text-xs text-text-secondary">65% SOL / 35% USDC (Balanced)</div>
              </div>
            </div>
          </div>
        </Card>

        {/* Latest Decision */}
        <Card className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-md font-semibold text-text-primary">Latest Decision</h2>
            <Badge variant={latestDecision?.status === 'Confirmed' ? 'positive' : 'warning'}>{latestDecision?.status || 'None'}</Badge>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-[100px,1fr] gap-4 text-xs">
              <span className="text-text-muted uppercase tracking-wider">Action</span>
              <span className={cn(
                "font-bold font-mono",
                latestDecision?.action === 'BUY_SOL' ? "text-positive" : 
                latestDecision?.action === 'SELL_SOL' ? "text-negative" : "text-neutral"
              )}>{latestDecision?.action || '—'}</span>
              <span className="text-text-muted uppercase tracking-wider">Slot</span>
              <span className="text-text-primary font-mono">#{latestDecision?.slot || '—'}</span>
              <span className="text-text-muted uppercase tracking-wider">Confidence</span>
              <span className="text-text-primary font-mono">{latestDecision?.confidence || '—'}%</span>
            </div>
            <div className="border-t border-border-subtle pt-4">
              <p className="text-xs text-text-secondary leading-relaxed italic">
                "{latestDecision?.reasoning || 'No decisions made yet.'}"
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Activity Table */}
      <Card className="p-0 overflow-hidden">
        <div className="p-6 border-b border-border-subtle flex justify-between items-center">
          <h2 className="text-md font-semibold text-text-primary">Recent Decisions</h2>
          <Button variant="ghost" size="sm">View All</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[11px] text-text-muted uppercase tracking-wider border-b border-border-subtle">
                <th className="px-6 py-4 font-medium">Time</th>
                <th className="px-6 py-4 font-medium">Action</th>
                <th className="px-6 py-4 font-medium">Amount</th>
                <th className="px-6 py-4 font-medium">Confidence</th>
                <th className="px-6 py-4 font-medium">TX Hash</th>
                <th className="px-6 py-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {decisions.slice(0, 5).map((row, i) => (
                <tr key={i} className="text-sm hover:bg-bg-subtle transition-colors cursor-pointer group">
                  <td className="px-6 py-4 text-text-secondary">{new Date(row.timestamp).toLocaleTimeString()}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                      row.action === 'BUY_SOL' ? "bg-positive-dim text-positive" : 
                      row.action === 'SELL_SOL' ? "bg-negative-dim text-negative" : "bg-bg-elevated text-text-muted"
                    )}>{row.action}</span>
                  </td>
                  <td className="px-6 py-4 font-mono text-text-primary">{row.amount_pct}%</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-text-primary">{row.confidence}%</span>
                      <div className="w-12 h-1 bg-bg-elevated rounded-full overflow-hidden">
                        <div className="h-full bg-accent" style={{ width: `${row.confidence}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-text-muted group-hover:text-text-secondary">{row.txHash.slice(0, 8)}...</td>
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
    </div>
  );
}
