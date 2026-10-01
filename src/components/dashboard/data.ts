import { DollarSign, Layers, Shield, TrendingUp } from 'lucide-react';

export type Tab = 'all' | 'open' | 'closed';
export type ExchangeStatus = 'connected' | 'running' | 'error' | 'paused' | 'disconnected';
export type Trade = {
  pair: string;
  type: string;
  entry: string;
  exit: string;
  pnl: string;
  up: boolean;
  time: string;
  exchange: string;
  status: string;
};

export type WalletTx = {
  signature: string;
  slot: number;
  err: unknown | null;
  confirmationStatus: string | null;
  blockTime: string | null;
  memo: string | null;
  feeLamports: number | null;
  feeSol: number | null;
};

export type WalletSnapshot = {
  address: string;
  network: string;
  endpoint: string;
  createdAt: string;
  updatedAt: string;
  lastSyncedAt: string | null;
  balanceSol: number | null;
  balanceLamports: number | null;
  transactions: WalletTx[];
};

export type OpenClawConfig = {
  profileName: string;
  enabled: boolean;
  mode: 'paper' | 'live';
  baseAsset: string;
  quoteAsset: string;
  symbols: string;
  strategy: 'grid' | 'momentum' | 'dca' | 'mean-reversion';
  timeframe: '1m' | '5m' | '15m' | '1h' | '4h';
  maxConcurrentTrades: number;
  riskPerTradePct: number;
  dailyLossLimitPct: number;
  maxDrawdownPct: number;
  stopLossPct: number;
  takeProfitPct: number;
  trailingStopPct: number;
  slippagePct: number;
  leverage: number;
  orderType: 'market' | 'limit';
  cooldownSec: number;
  rebalanceMinutes: number;
  emailAlerts: boolean;
  pushAlerts: boolean;
  telegramAlerts: boolean;
  criticalOnly: boolean;
  autoPauseOnError: boolean;
  circuitBreaker: boolean;
  requireManualApproval: boolean;
  apiReadOnlyMode: boolean;
};

export const DEFAULT_OPENCLOW_CONFIG: OpenClawConfig = {
  profileName: 'OpenClaw Main',
  enabled: true,
  mode: 'paper',
  baseAsset: 'BTC',
  quoteAsset: 'USDT',
  symbols: 'BTC/USDT, ETH/USDT, SOL/USDT',
  strategy: 'grid',
  timeframe: '15m',
  maxConcurrentTrades: 4,
  riskPerTradePct: 1.2,
  dailyLossLimitPct: 5,
  maxDrawdownPct: 12,
  stopLossPct: 2.5,
  takeProfitPct: 4.8,
  trailingStopPct: 1.3,
  slippagePct: 0.4,
  leverage: 2,
  orderType: 'limit',
  cooldownSec: 40,
  rebalanceMinutes: 30,
  emailAlerts: true,
  pushAlerts: true,
  telegramAlerts: false,
  criticalOnly: false,
  autoPauseOnError: true,
  circuitBreaker: true,
  requireManualApproval: false,
  apiReadOnlyMode: true,
};

export const STATS = [
  { label: 'Total Balance', value: '$84,291.50', change: '+$1,204.00', up: true, Icon: DollarSign },
  { label: '24h P&L', value: '+$3,842.00', change: '+4.78%', up: true, Icon: TrendingUp },
  { label: 'Open Positions', value: '12', change: '3 new today', up: true, Icon: Layers },
  { label: 'Win Rate', value: '68.4%', change: '↑ 2.1%', up: true, Icon: Shield },
] as const;

export const EXCHANGES = [
  { name: 'Binance', status: 'connected', balance: '$42,100.00', assets: 8, lastSync: '2s ago', color: '#F0B90B', error: null },
  { name: 'Coinbase', status: 'error', balance: '$18,440.00', assets: 5, lastSync: '–', color: '#0052FF', error: 'API key expired. Please update.' },
  { name: 'Kraken', status: 'connected', balance: '$14,751.50', assets: 4, lastSync: '14s ago', color: '#5741D9', error: null },
  { name: 'OKX', status: 'disconnected', balance: '–', assets: 0, lastSync: '–', color: '#00b4d8', error: null },
  { name: 'Bybit', status: 'disconnected', balance: '–', assets: 0, lastSync: '–', color: '#F7A600', error: null },
  { name: 'Phantom', status: 'connected', balance: '$9,000.00', assets: 12, lastSync: '4s ago', color: '#AB9FF2', error: null },
] as const;

export const BOTS = [
  { name: 'Grid Bot – BTC', status: 'running', profit: '+$420.00', trades: 38, risk: 'Low' },
  { name: 'DCA – ETH', status: 'running', profit: '+$188.00', trades: 12, risk: 'Low' },
  { name: 'Momentum – SOL', status: 'paused', profit: '-$24.00', trades: 5, risk: 'High' },
] as const;

export const TRADES: Trade[] = [
  { pair: 'BTC/USDT', type: 'Long', entry: '$61,240', exit: '$62,880', pnl: '+$1,640', up: true, time: '2h ago', exchange: 'Binance', status: 'Closed' },
  { pair: 'ETH/USDT', type: 'Short', entry: '$2,980', exit: '$2,891', pnl: '+$890', up: true, time: '4h ago', exchange: 'Kraken', status: 'Closed' },
  { pair: 'SOL/USDT', type: 'Long', entry: '$142.40', exit: '–', pnl: '-$240', up: false, time: '1h ago', exchange: 'Phantom', status: 'Open' },
  { pair: 'MATIC/USDT', type: 'Long', entry: '$0.842', exit: '$0.798', pnl: '-$440', up: false, time: '6h ago', exchange: 'Binance', status: 'Closed' },
  { pair: 'ARB/USDT', type: 'Long', entry: '$1.12', exit: '$1.19', pnl: '+$700', up: true, time: '8h ago', exchange: 'OKX', status: 'Closed' },
] as const;

export const CHART_DATA = [
  { name: '08:00', value: 82400 },
  { name: '10:00', value: 83100 },
  { name: '12:00', value: 82900 },
  { name: '14:00', value: 84200 },
  { name: '16:00', value: 83800 },
  { name: '18:00', value: 84600 },
  { name: '20:00', value: 84291 },
];
