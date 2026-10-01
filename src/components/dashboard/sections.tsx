import React, { useEffect, useState } from 'react';
import {
  AreaChart,
  Area,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { motion } from 'framer-motion';
import {
  RefreshCw, AlertTriangle, ArrowUpRight, ArrowDownRight,
  Globe, Key, Bot, CandlestickChart, ChevronRight, Save, Settings2, Send,
} from 'lucide-react';
import { usePhantom } from '../WalletContextProvider';
import {
  BOTS,
  CHART_DATA,
  DEFAULT_OPENCLOW_CONFIG,
  EXCHANGES,
  OpenClawConfig,
  STATS,
  Tab,
  Trade,
  WalletSnapshot,
} from './data';

const cardStyle: React.CSSProperties = { background: '#161616', border: '1px solid #2A2A2A', borderRadius: 12 };
const inputStyle: React.CSSProperties = { background: '#111', border: '1px solid #2A2A2A', color: '#fff', borderRadius: 8, padding: '8px 10px', fontSize: 12, width: '100%' };

const Card = ({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ ...cardStyle, ...style }}>{children}</div>
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    <span style={{ fontSize: 11, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{label}</span>
    {children}
  </label>
);

export const StatusDot = ({ status }: { status: string }) => {
  const map: Record<string, { bg: string; glow: string }> = {
    connected: { bg: '#22c55e', glow: '0 0 6px #22c55e88' },
    running: { bg: '#3B82F6', glow: '0 0 8px #3B82F688' },
    error: { bg: '#f59e0b', glow: '0 0 6px #f59e0b88' },
    paused: { bg: '#f59e0b', glow: 'none' },
    disconnected: { bg: '#3f3f46', glow: 'none' },
  };
  const s = map[status] ?? map.disconnected;
  return <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: s.bg, boxShadow: s.glow, flexShrink: 0 }} />;
};

export function DashboardHeader() {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
      <div>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: '#FFFFFF', margin: 0, letterSpacing: '-0.4px' }}>Dashboard</h1>
        <p style={{ fontSize: 12, color: '#6B6B6B', margin: '4px 0 0' }}>Monitor your portfolio, bots, and connected exchanges in one place.</p>
      </div>
      <button style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#3B82F6', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', boxShadow: '0 0 20px rgba(59,130,246,0.35)' }}>
        <RefreshCw size={12} /> Sync All
      </button>
    </div>
  );
}

export function StatsGrid({ wallet }: { wallet: WalletSnapshot | null }) {
  const txCount = wallet?.transactions?.length ?? 0;
  const balance = wallet?.balanceSol ?? 0;
  const stats = [
    { label: 'Total Balance', value: `${balance.toFixed(4)} SOL`, change: wallet?.lastSyncedAt ? 'Live synced' : 'Waiting sync', up: true, Icon: STATS[0].Icon },
    { label: '24h P&L', value: 'Real data only', change: 'No fake metrics', up: true, Icon: STATS[1].Icon },
    { label: 'Transactions', value: String(txCount), change: txCount > 0 ? 'Recent on-chain' : 'No history yet', up: txCount > 0, Icon: STATS[2].Icon },
    { label: 'Network', value: wallet?.network || 'devnet', change: wallet?.endpoint ? 'RPC connected' : 'No RPC', up: Boolean(wallet?.endpoint), Icon: STATS[3].Icon },
  ] as const;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
      {stats.map(({ label, value, change, up, Icon }) => (
        <motion.div whileHover={{ y: -2 }} key={label} style={cardStyle}>
          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 10, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: '#1E1E1E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon size={12} color="#94A3B8" /></div>
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.5px', lineHeight: 1 }}>{value}</div>
              <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                {up ? <ArrowUpRight size={13} color="#22c55e" /> : <ArrowDownRight size={13} color="#ef4444" />}
                <span style={{ fontSize: 12, color: up ? '#22c55e' : '#ef4444', fontWeight: 600 }}>{change}</span>
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export function PerformanceChart({ wallet }: { wallet: WalletSnapshot | null }) {
  const points = Array.from({ length: 7 }).map((_, idx) => ({
    name: `${(idx + 1) * 4}:00`,
    value: wallet?.balanceSol ?? CHART_DATA[idx]?.value ?? 0,
  }));
  return (
    <Card style={{ marginBottom: 20, padding: '16px' }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: 8 }}>
          Asset Value Managed (24h)
          <span style={{ fontSize: 11, color: '#22c55e', background: 'rgba(34,197,94,0.1)', padding: '2px 6px', borderRadius: 4 }}>+4.7%</span>
        </div>
      </div>
      <div style={{ height: 180, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points}>
            <defs>
              <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Tooltip contentStyle={{ background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 8, fontSize: 12, color: '#FFF' }} itemStyle={{ color: '#3B82F6' }} />
            <Area type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#colorVal)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export function ExchangePanel({ wallet }: { wallet: WalletSnapshot | null }) {
  const syncedSeconds = wallet?.lastSyncedAt
    ? Math.max(1, Math.round((Date.now() - new Date(wallet.lastSyncedAt).getTime()) / 1000))
    : null;
  const dynamicExchanges = EXCHANGES.map((ex) => {
    if (ex.name !== 'Phantom') return ex;
    return {
      ...ex,
      status: wallet ? 'connected' : 'disconnected',
      balance: wallet?.balanceSol != null ? `${wallet.balanceSol.toFixed(4)} SOL` : '–',
      assets: wallet?.transactions?.length ?? 0,
      lastSync: syncedSeconds ? `${syncedSeconds}s ago` : '–',
    };
  });
  return (
    <Card>
      <div style={{ padding: '10px 16px', borderBottom: '1px solid #2A2A2A', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Globe size={16} color="#6B6B6B" />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#FFFFFF' }}>Connected Exchanges</span>
        </div>
        <span style={{ fontSize: 12, color: '#6B6B6B', background: '#1E1E1E', border: '1px solid #2A2A2A', borderRadius: 6, padding: '2px 8px', fontWeight: 500 }}>{dynamicExchanges.filter((e) => e.status === 'connected').length}/{dynamicExchanges.length} active</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)' }}>
        {dynamicExchanges.map((ex, i) => {
          const isLast = i >= dynamicExchanges.length - 3;
          const isRight = (i + 1) % 3 !== 0;
          return (
            <div key={ex.name} style={{ padding: '14px 16px', borderBottom: isLast ? 'none' : '1px solid #2A2A2A', borderRight: isRight ? '1px solid #2A2A2A' : 'none' }}>
              {ex.error && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 7, padding: '8px 10px', marginBottom: 10 }}>
                  <AlertTriangle size={13} color="#f59e0b" style={{ flexShrink: 0, marginTop: 1 }} />
                  <span style={{ fontSize: 11, color: '#f59e0b', lineHeight: 1.4 }}>{ex.error}</span>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: `${ex.color}18`, border: `1px solid ${ex.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: ex.color, flexShrink: 0 }}>{ex.name[0]}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#FFFFFF' }}>{ex.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}><StatusDot status={ex.status} /><span style={{ fontSize: 11, color: '#6B6B6B', textTransform: 'capitalize' }}>{ex.status}</span></div>
                </div>
              </div>
              {ex.status !== 'disconnected' && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#FFFFFF' }}>{ex.balance}</div>
                  <div style={{ fontSize: 11, color: '#6B6B6B', marginTop: 2 }}>{ex.assets} assets · synced {ex.lastSync}</div>
                </div>
              )}
              {ex.status === 'disconnected' ? (
                <button style={{ width: '100%', background: 'transparent', color: '#FFFFFF', border: '1px solid #2A2A2A', borderRadius: 7, padding: '7px 0', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Connect</button>
              ) : ex.error ? (
                <button style={{ width: '100%', background: '#3B82F6', color: '#fff', border: 'none', borderRadius: 7, padding: '7px 0', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, boxShadow: '0 0 16px rgba(59,130,246,0.3)' }}><Key size={12} /> Update API Key</button>
              ) : (
                <button style={{ width: '100%', background: 'transparent', color: '#6B6B6B', border: '1px solid #2A2A2A', borderRadius: 7, padding: '7px 0', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>Manage</button>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

type OpenClawModalProps = {
  open: boolean;
  config: OpenClawConfig;
  onClose: () => void;
  onSave: (config: OpenClawConfig) => void;
};

export function OpenClawConfigModal({ open, config, onClose, onSave }: OpenClawModalProps) {
  const [draft, setDraft] = useState<OpenClawConfig>(config);
  useEffect(() => setDraft(config), [config, open]);
  if (!open) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 60, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <div style={{ ...cardStyle, width: 'min(980px, 95vw)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ position: 'sticky', top: 0, zIndex: 2, padding: '14px 18px', borderBottom: '1px solid #2A2A2A', background: '#161616', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>OpenClaw Configuration</div>
            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>Tune trading behavior, safeguards, and alerting preferences.</div>
          </div>
          <button onClick={onClose} style={{ border: '1px solid #2A2A2A', background: 'transparent', color: '#9CA3AF', borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}>Close</button>
        </div>

        <div style={{ padding: 18, display: 'grid', gap: 16 }}>
          <Card style={{ padding: 14 }}>
            <div style={{ fontSize: 13, color: '#fff', fontWeight: 600, marginBottom: 10 }}>General</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
              <Field label="Profile Name"><input value={draft.profileName} onChange={(e) => setDraft({ ...draft, profileName: e.target.value })} style={inputStyle} /></Field>
              <Field label="Mode"><select value={draft.mode} onChange={(e) => setDraft({ ...draft, mode: e.target.value as OpenClawConfig['mode'] })} style={inputStyle}><option value="paper">Paper</option><option value="live">Live</option></select></Field>
              <Field label="Enabled"><select value={String(draft.enabled)} onChange={(e) => setDraft({ ...draft, enabled: e.target.value === 'true' })} style={inputStyle}><option value="true">Enabled</option><option value="false">Disabled</option></select></Field>
              <Field label="Base Asset"><input value={draft.baseAsset} onChange={(e) => setDraft({ ...draft, baseAsset: e.target.value })} style={inputStyle} /></Field>
              <Field label="Quote Asset"><input value={draft.quoteAsset} onChange={(e) => setDraft({ ...draft, quoteAsset: e.target.value })} style={inputStyle} /></Field>
              <Field label="Symbols"><input value={draft.symbols} onChange={(e) => setDraft({ ...draft, symbols: e.target.value })} style={inputStyle} /></Field>
            </div>
          </Card>

          <Card style={{ padding: 14 }}>
            <div style={{ fontSize: 13, color: '#fff', fontWeight: 600, marginBottom: 10 }}>Strategy & Execution</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
              <Field label="Strategy"><select value={draft.strategy} onChange={(e) => setDraft({ ...draft, strategy: e.target.value as OpenClawConfig['strategy'] })} style={inputStyle}><option value="grid">Grid</option><option value="momentum">Momentum</option><option value="dca">DCA</option><option value="mean-reversion">Mean Reversion</option></select></Field>
              <Field label="Timeframe"><select value={draft.timeframe} onChange={(e) => setDraft({ ...draft, timeframe: e.target.value as OpenClawConfig['timeframe'] })} style={inputStyle}><option value="1m">1m</option><option value="5m">5m</option><option value="15m">15m</option><option value="1h">1h</option><option value="4h">4h</option></select></Field>
              <Field label="Order Type"><select value={draft.orderType} onChange={(e) => setDraft({ ...draft, orderType: e.target.value as OpenClawConfig['orderType'] })} style={inputStyle}><option value="market">Market</option><option value="limit">Limit</option></select></Field>
              <Field label="Leverage"><input type="number" value={draft.leverage} onChange={(e) => setDraft({ ...draft, leverage: Number(e.target.value) || 1 })} style={inputStyle} /></Field>
              <Field label="Max Concurrent"><input type="number" value={draft.maxConcurrentTrades} onChange={(e) => setDraft({ ...draft, maxConcurrentTrades: Number(e.target.value) || 1 })} style={inputStyle} /></Field>
              <Field label="Slippage %"><input type="number" step="0.1" value={draft.slippagePct} onChange={(e) => setDraft({ ...draft, slippagePct: Number(e.target.value) || 0 })} style={inputStyle} /></Field>
              <Field label="Cooldown (sec)"><input type="number" value={draft.cooldownSec} onChange={(e) => setDraft({ ...draft, cooldownSec: Number(e.target.value) || 0 })} style={inputStyle} /></Field>
              <Field label="Rebalance (min)"><input type="number" value={draft.rebalanceMinutes} onChange={(e) => setDraft({ ...draft, rebalanceMinutes: Number(e.target.value) || 0 })} style={inputStyle} /></Field>
            </div>
          </Card>

          <Card style={{ padding: 14 }}>
            <div style={{ fontSize: 13, color: '#fff', fontWeight: 600, marginBottom: 10 }}>Risk Controls</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12 }}>
              <Field label="Risk/Trade %"><input type="number" step="0.1" value={draft.riskPerTradePct} onChange={(e) => setDraft({ ...draft, riskPerTradePct: Number(e.target.value) || 0 })} style={inputStyle} /></Field>
              <Field label="Daily Loss %"><input type="number" step="0.1" value={draft.dailyLossLimitPct} onChange={(e) => setDraft({ ...draft, dailyLossLimitPct: Number(e.target.value) || 0 })} style={inputStyle} /></Field>
              <Field label="Max Drawdown %"><input type="number" step="0.1" value={draft.maxDrawdownPct} onChange={(e) => setDraft({ ...draft, maxDrawdownPct: Number(e.target.value) || 0 })} style={inputStyle} /></Field>
              <Field label="Stop Loss %"><input type="number" step="0.1" value={draft.stopLossPct} onChange={(e) => setDraft({ ...draft, stopLossPct: Number(e.target.value) || 0 })} style={inputStyle} /></Field>
              <Field label="Take Profit %"><input type="number" step="0.1" value={draft.takeProfitPct} onChange={(e) => setDraft({ ...draft, takeProfitPct: Number(e.target.value) || 0 })} style={inputStyle} /></Field>
            </div>
            <div style={{ marginTop: 12, width: 220 }}>
              <Field label="Trailing Stop %"><input type="number" step="0.1" value={draft.trailingStopPct} onChange={(e) => setDraft({ ...draft, trailingStopPct: Number(e.target.value) || 0 })} style={inputStyle} /></Field>
            </div>
          </Card>

          <Card style={{ padding: 14 }}>
            <div style={{ fontSize: 13, color: '#fff', fontWeight: 600, marginBottom: 10 }}>Safety & Notifications</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
              {[
                ['emailAlerts', 'Email alerts'],
                ['pushAlerts', 'Push alerts'],
                ['telegramAlerts', 'Telegram alerts'],
                ['criticalOnly', 'Critical alerts only'],
                ['autoPauseOnError', 'Auto pause on error'],
                ['circuitBreaker', 'Circuit breaker'],
                ['requireManualApproval', 'Require manual approval'],
                ['apiReadOnlyMode', 'API read-only mode'],
              ].map(([key, label]) => (
                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#E5E7EB', fontSize: 13 }}>
                  <input type="checkbox" checked={Boolean(draft[key as keyof OpenClawConfig])} onChange={(e) => setDraft({ ...draft, [key]: e.target.checked })} />
                  {label}
                </label>
              ))}
            </div>
          </Card>
        </div>

        <div style={{ borderTop: '1px solid #2A2A2A', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={() => setDraft(DEFAULT_OPENCLOW_CONFIG)} style={{ border: '1px solid #2A2A2A', background: 'transparent', color: '#9CA3AF', borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }}>Reset Defaults</button>
          <button onClick={() => onSave(draft)} style={{ display: 'flex', alignItems: 'center', gap: 6, border: 'none', background: '#3B82F6', color: '#fff', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontWeight: 600 }}><Save size={14} /> Save OpenClaw Settings</button>
        </div>
      </div>
    </div>
  );
}

export function SmartBotPanel({ onOpenOpenClaw }: { onOpenOpenClaw: () => void }) {
  const { connected, address, balance } = usePhantom();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card>
        <div style={{ padding: '10px 16px', borderBottom: '1px solid #2A2A2A', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 14px rgba(59,130,246,0.25)' }}><Bot size={12} color="#3B82F6" /></div>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#FFFFFF' }}>Smart Bot</span>
          </div>
          <button onClick={onOpenOpenClaw} style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1px solid #2A2A2A', background: '#1A1A1A', color: '#E5E7EB', borderRadius: 8, padding: '5px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
            <Settings2 size={12} /> OpenClaw Config
          </button>
        </div>
        <div style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {BOTS.map((bot) => (
            <div key={bot.name} style={{ background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 9, padding: '10px 12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}><StatusDot status={bot.status} /><span style={{ fontSize: 13, fontWeight: 600, color: '#FFFFFF' }}>{bot.name}</span></div>
                <span style={{ fontSize: 13, color: bot.profit.startsWith('+') ? '#22c55e' : '#ef4444', fontWeight: 700, fontFamily: 'monospace' }}>{bot.profit}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, color: '#6B6B6B' }}>{bot.trades} trades</span>
                <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4, background: bot.risk === 'Low' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: bot.risk === 'Low' ? '#22c55e' : '#ef4444', border: bot.risk === 'Low' ? '1px solid rgba(34,197,94,0.2)' : '1px solid rgba(239,68,68,0.2)' }}>{bot.risk} Risk</span>
              </div>
            </div>
          ))}
          <button style={{ width: '100%', background: 'transparent', color: '#3B82F6', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 8, padding: '9px 0', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginTop: 2 }}>+ Add Strategy</button>
        </div>
      </Card>

      {connected && (
        <Card>
          <div style={{ padding: '10px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}><span style={{ fontSize: 10, color: '#6B6B6B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Phantom Wallet</span><StatusDot status="connected" /></div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.4px' }}>{balance !== null ? `${balance.toFixed(4)} SOL` : '–'}</div>
            <div style={{ fontSize: 12, color: '#6B6B6B', marginTop: 4, fontFamily: 'monospace' }}>{address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '–'}</div>
          </div>
        </Card>
      )}
    </div>
  );
}

export function TradesTable({ tab, setTab, trades }: { tab: Tab; setTab: (tab: Tab) => void; trades: Trade[] }) {
  return (
    <Card>
      <div style={{ padding: '10px 16px', borderBottom: '1px solid #2A2A2A', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><CandlestickChart size={16} color="#6B6B6B" /><span style={{ fontSize: 13, fontWeight: 600, color: '#FFFFFF' }}>Recent Trades</span></div>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['all', 'open', 'closed'] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{ background: tab === t ? '#1E1E1E' : 'transparent', color: tab === t ? '#FFFFFF' : '#6B6B6B', border: tab === t ? '1px solid #2A2A2A' : '1px solid transparent', borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 500, cursor: 'pointer', textTransform: 'capitalize' }}>{t}</button>
          ))}
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ borderBottom: '1px solid #1E1E1E' }}>{['Pair', 'Type', 'Entry', 'Exit', 'P&L', 'Exchange', 'Status', 'Time'].map((h) => <th key={h} style={{ textAlign: 'left', padding: '8px 16px', fontSize: 10, color: '#4B4B4B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>)}</tr></thead>
          <tbody>
            {trades.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '20px 16px', fontSize: 12, color: '#6B6B6B' }}>
                  No real wallet transactions found yet. Connect Phantom and sync.
                </td>
              </tr>
            ) : trades.map((t, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #1A1A1A', cursor: 'default' }} onMouseEnter={(e) => (e.currentTarget.style.background = '#191919')} onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                <td style={{ padding: '10px 16px', fontSize: 12, fontWeight: 700, color: '#FFFFFF', whiteSpace: 'nowrap' }}>{t.pair}</td>
                <td style={{ padding: '10px 16px' }}><span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 5, background: t.type === 'Long' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: t.type === 'Long' ? '#22c55e' : '#ef4444', border: t.type === 'Long' ? '1px solid rgba(34,197,94,0.2)' : '1px solid rgba(239,68,68,0.2)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t.type}</span></td>
                <td style={{ padding: '10px 16px', fontSize: 12, color: '#AAAAAA', fontFamily: 'monospace' }}>{t.entry}</td>
                <td style={{ padding: '10px 16px', fontSize: 12, color: '#AAAAAA', fontFamily: 'monospace' }}>{t.exit}</td>
                <td style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}><div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>{t.up ? <ArrowUpRight size={13} color="#22c55e" /> : <ArrowDownRight size={13} color="#ef4444" />}<span style={{ fontSize: 12, fontWeight: 700, color: t.up ? '#22c55e' : '#ef4444', fontFamily: 'monospace' }}>{t.pnl}</span></div></td>
                <td style={{ padding: '10px 16px', fontSize: 12, color: '#6B6B6B' }}>{t.exchange}</td>
                <td style={{ padding: '10px 16px' }}><span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 5, background: t.status === 'Open' ? 'rgba(59,130,246,0.1)' : '#1E1E1E', color: t.status === 'Open' ? '#3B82F6' : '#6B6B6B', border: t.status === 'Open' ? '1px solid rgba(59,130,246,0.25)' : '1px solid #2A2A2A', boxShadow: t.status === 'Open' ? '0 0 8px rgba(59,130,246,0.1)' : 'none', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t.status}</span></td>
                <td style={{ padding: '10px 16px', fontSize: 12, color: '#4B4B4B' }}>{t.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ padding: '12px 20px', borderTop: '1px solid #1A1A1A', display: 'flex', justifyContent: 'flex-end' }}><button style={{ background: 'transparent', color: '#3B82F6', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>View full history <ChevronRight size={12} /></button></div>
    </Card>
  );
}

type OpenClawAgentSectionProps = {
  config: OpenClawConfig;
  onApplyConfig: (next: OpenClawConfig) => void;
  onOpenConfigWindow: () => void;
};

type AgentMessage = { id: string; sender: 'user' | 'agent'; text: string };

export function OpenClawAgentSection({ config, onApplyConfig, onOpenConfigWindow }: OpenClawAgentSectionProps) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<AgentMessage[]>([
    { id: 'm1', sender: 'agent', text: 'OpenClaw online. Ask me to tune risk, leverage, strategy, or notifications.' },
  ]);

  const handleQuickAction = (next: OpenClawConfig, summary: string) => {
    onApplyConfig(next);
    setMessages((prev) => [
      ...prev,
      { id: `${Date.now()}-a`, sender: 'agent', text: summary },
    ]);
  };

  const handleSend = () => {
    const command = input.trim();
    if (!command) return;
    setMessages((prev) => [...prev, { id: `${Date.now()}-u`, sender: 'user', text: command }]);
    const lower = command.toLowerCase();
    setInput('');

    if (lower.includes('open settings') || lower.includes('open config') || lower.includes('edit settings')) {
      onOpenConfigWindow();
      setMessages((prev) => [...prev, { id: `${Date.now()}-r`, sender: 'agent', text: 'Opening OpenClaw configuration window now.' }]);
      return;
    }

    if (lower.includes('paper mode')) {
      handleQuickAction({ ...config, mode: 'paper' }, 'Mode switched to paper trading.');
      return;
    }

    if (lower.includes('live mode')) {
      handleQuickAction({ ...config, mode: 'live' }, 'Mode switched to live trading.');
      return;
    }

    if (lower.includes('reduce risk')) {
      const nextRisk = Math.max(0.2, Number((config.riskPerTradePct - 0.4).toFixed(1)));
      handleQuickAction({ ...config, riskPerTradePct: nextRisk }, `Risk per trade reduced to ${nextRisk}%.`);
      return;
    }

    if (lower.includes('increase risk')) {
      const nextRisk = Number((config.riskPerTradePct + 0.4).toFixed(1));
      handleQuickAction({ ...config, riskPerTradePct: nextRisk }, `Risk per trade increased to ${nextRisk}%.`);
      return;
    }

    if (lower.includes('enable alerts')) {
      handleQuickAction({ ...config, emailAlerts: true, pushAlerts: true }, 'Email and push alerts enabled.');
      return;
    }

    if (lower.includes('conservative')) {
      const next = { ...config, strategy: 'mean-reversion' as const, leverage: 1, riskPerTradePct: 0.8, maxConcurrentTrades: 2 };
      handleQuickAction(next, 'Applied conservative profile: mean reversion, 1x leverage, 0.8% risk, 2 max concurrent trades.');
      return;
    }

    setMessages((prev) => [
      ...prev,
      {
        id: `${Date.now()}-r`,
        sender: 'agent',
        text: 'I can handle commands like: "paper mode", "live mode", "reduce risk", "enable alerts", or "open settings".',
      },
    ]);
  };

  return (
    <Card style={{ marginBottom: 24 }}>
      <div style={{ padding: '10px 16px', borderBottom: '1px solid #2A2A2A', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Bot size={15} color="#3B82F6" />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#FFFFFF' }}>OpenClaw Agent</span>
        </div>
        <button onClick={onOpenConfigWindow} style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1px solid #2A2A2A', background: '#1A1A1A', color: '#E5E7EB', borderRadius: 8, padding: '5px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
          <Settings2 size={12} /> Full Settings
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, padding: 16 }}>
        <div style={{ border: '1px solid #2A2A2A', borderRadius: 10, background: '#111', minHeight: 230, maxHeight: 300, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {messages.map((m) => (
            <div key={m.id} style={{ alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start', maxWidth: '80%', background: m.sender === 'user' ? 'rgba(59,130,246,0.18)' : '#1A1A1A', border: '1px solid #2A2A2A', color: '#E5E7EB', borderRadius: 8, padding: '8px 10px', fontSize: 12, lineHeight: 1.45 }}>
              {m.text}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ color: '#9CA3AF', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Quick Commands</div>
          <button onClick={() => handleQuickAction({ ...config, mode: 'paper' }, 'Mode switched to paper trading.')} style={{ ...inputStyle, textAlign: 'left', cursor: 'pointer' }}>Switch to paper mode</button>
          <button onClick={() => handleQuickAction({ ...config, riskPerTradePct: Math.max(0.2, Number((config.riskPerTradePct - 0.4).toFixed(1))) }, `Risk per trade updated to ${Math.max(0.2, Number((config.riskPerTradePct - 0.4).toFixed(1)))}%.`)} style={{ ...inputStyle, textAlign: 'left', cursor: 'pointer' }}>Reduce risk</button>
          <button onClick={() => handleQuickAction({ ...config, emailAlerts: true, pushAlerts: true }, 'Email and push alerts enabled.')} style={{ ...inputStyle, textAlign: 'left', cursor: 'pointer' }}>Enable alerts</button>
          <button onClick={onOpenConfigWindow} style={{ ...inputStyle, textAlign: 'left', cursor: 'pointer' }}>Open full settings window</button>
        </div>
      </div>

      <div style={{ borderTop: '1px solid #2A2A2A', padding: '12px 16px', display: 'flex', gap: 8 }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder='Try: "reduce risk" or "open settings"' style={inputStyle} />
        <button onClick={handleSend} style={{ minWidth: 44, border: 'none', borderRadius: 8, background: '#3B82F6', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Send size={14} />
        </button>
      </div>
    </Card>
  );
}
