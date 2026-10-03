import { request, RiskProfileResponse, DecisionLogResponse } from './solvexApi';

export interface PaperAccount {
  mode: 'paper';
  status: 'running' | 'paused';
  version: number;
  next_run_at: string;
  strategy: string;
  live_execution_allowed: false;
  state: {
    profile: RiskProfileResponse;
    initial_usd: string;
    cash_usd: string;
    sol_quantity: string;
    fees_usd: string;
    daily_turnover_usd: string;
    interval_seconds: number;
    last_price_usd: string | null;
    last_mark_at: string | null;
    last_cycle_at: string | null;
    cycle_count: number;
    trade_count: number;
    last_error: string | null;
    decision_source: 'allocation' | 'gemini';
  };
  metrics: {
    equity_usd: string;
    total_pnl_usd: string;
    return_pct: string;
    realized_pnl_usd: string;
    unrealized_pnl_usd: string;
    sol_allocation_pct: string;
    target_sol_pct: string;
    drawdown_pct: string;
  };
}

export interface PaperEvent {
  id: string;
  version: number;
  kind: string;
  status: string;
  at: string;
  message?: string;
  decision?: DecisionLogResponse;
  fill?: {
    quantity_sol: string; price_usd: string; notional_usd: string; fees_usd: string;
    source: string; price_at: string; transaction_signature: null;
  } | null;
  metrics?: PaperAccount['metrics'];
}

const path = (wallet: string) => `/api/v1/paper/${encodeURIComponent(wallet)}`;
export const getPaperAccount = (wallet: string) => request<{ account: PaperAccount | null }>(path(wallet), undefined, wallet);
export const getPaperEvents = (wallet: string) => request<{ items: PaperEvent[] }>(`${path(wallet)}/events`, undefined, wallet);
export const startPaper = (wallet: string, initial: number, interval: number, decisionSource: 'allocation' | 'gemini', language: 'en' | 'ru') => request<{ account: PaperAccount }>(`${path(wallet)}/start`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ initial_usd: initial, interval_seconds: interval, acknowledge_virtual: true, decision_source: decisionSource, language }),
}, wallet);
export const controlPaper = (wallet: string, action: 'pause' | 'resume' | 'run-now') => request<{ processed?: boolean }>(`${path(wallet)}/${action}`, { method: 'POST', signal: AbortSignal.timeout(40_000) }, wallet);
