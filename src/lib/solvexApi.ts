import type { AgentConfig } from '../store';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export interface RiskProfileResponse {
  id: string;
  wallet_address: string;
  risk_level: 'conservative' | 'balanced' | 'growth';
  investment_cap_usd: string;
  max_single_trade_usd: string;
  max_daily_turnover_usd: string;
  max_slippage_bps: number;
  max_drawdown_pct: string;
  enabled: boolean;
}

export interface PolicyCheckResponse {
  code: string;
  outcome: 'pass' | 'review' | 'fail';
  message: string;
  evidence: string[];
}

export interface DecisionLogResponse {
  id: string;
  wallet_address: string;
  status: string;
  proposal: {
    action: 'buy' | 'sell' | 'hold' | 'rebalance';
    transaction_kind: string;
    input_asset: string;
    output_asset: string;
    protocol_id: string;
    amount_usd: string;
    slippage_bps: number;
    confidence: number;
    rationale: string;
    key_signals: string[];
  };
  shariah: {
    status: 'eligible' | 'review' | 'blocked';
    approved: boolean;
    methodology_version: string;
    checks: PolicyCheckResponse[];
  };
  risk: {
    status: 'eligible' | 'review' | 'blocked';
    approved: boolean;
    methodology_version: string;
    checks: PolicyCheckResponse[];
  };
  execution_allowed: boolean;
  simulation: Record<string, unknown> | null;
  execution: Record<string, unknown> | null;
  created_at: string;
}

export interface SolMarketDataResponse {
  symbol: 'SOL';
  price_usd: string;
  change_24h_pct: string;
  source: string;
  captured_at: string;
}

export interface PortfolioSnapshotInput {
  vault_principal_usd: number;
  vault_market_value_usd: number;
  daily_turnover_usd: number;
  current_drawdown_pct: number;
  captured_at: string;
}

const profileToApi = (profile: AgentConfig['profile']): RiskProfileResponse['risk_level'] =>
  profile.toLowerCase() as RiskProfileResponse['risk_level'];

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

const sessionKey = (wallet: string) => `solvex-session:${wallet}`;

function walletToken(wallet: string): string | null {
  try {
    const saved = JSON.parse(sessionStorage.getItem(sessionKey(wallet)) || 'null');
    if (saved && Date.parse(saved.expires_at) > Date.now() + 30_000) return saved.token;
  } catch { /* An invalid or absent session requires a new signature. */ }
  return null;
}

export const hasWalletSession = (wallet: string) => Boolean(walletToken(wallet));
export const clearWalletSessions = () => {
  for (const key of Object.keys(sessionStorage)) {
    if (key.startsWith('solvex-session:')) sessionStorage.removeItem(key);
  }
};

export const request = async <T>(path: string, init?: RequestInit, wallet?: string): Promise<T> => {
  const headers = new Headers(init?.headers);
  const token = wallet ? walletToken(wallet) : null;
  if (token) headers.set('Authorization', `Bearer ${token}`);
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, { ...init, headers, signal: init?.signal ?? AbortSignal.timeout(30_000) });
  } catch {
    throw new ApiError('Solvex API is unavailable. Check that the backend is running and retry.', 0);
  }
  if (!response.ok) {
    if (response.status === 401 && wallet) sessionStorage.removeItem(sessionKey(wallet));
    const body = await response.json().catch(() => ({}));
    const detail = typeof body.detail === 'string' ? body.detail : Array.isArray(body.detail)
      ? body.detail.map((item: { msg: string }) => item.msg).join('; ') : `Solvex API request failed (${response.status})`;
    throw new ApiError(detail, response.status);
  }
  return response.json() as Promise<T>;
};

export const ensureWalletSession = async (wallet: string, signMessage: (message: string) => Promise<string | null>) => {
  if (walletToken(wallet)) return;
  const challenge = await request<{ message: string }>('/api/v1/auth/challenge', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ wallet_address: wallet }),
  });
  const signature = await signMessage(challenge.message);
  if (!signature) throw new Error('Wallet sign-in was cancelled. No funds were moved.');
  const session = await request<{ token: string; expires_at: string }>('/api/v1/auth/verify', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ wallet_address: wallet, signature }),
  });
  sessionStorage.setItem(sessionKey(wallet), JSON.stringify(session));
};

export const getRiskProfile = (walletAddress: string) =>
  request<RiskProfileResponse>(`/api/v1/profiles/${walletAddress}`);

export const saveRiskProfile = (walletAddress: string, config: AgentConfig) =>
  request<RiskProfileResponse>(`/api/v1/profiles/${walletAddress}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      wallet_address: walletAddress,
      risk_level: profileToApi(config.profile),
      investment_cap_usd: config.investmentCapUsd,
      max_single_trade_usd: config.maxSingleTradeUsd,
      max_daily_turnover_usd: config.maxDailyTurnoverUsd,
      max_slippage_bps: Math.round(config.slippageTolerance * 100),
      max_drawdown_pct: config.maxDrawdownPct,
      enabled: true,
    }),
  }, walletAddress);

export const getDecisionLogs = (walletAddress: string, limit = 50) =>
  request<{ items: DecisionLogResponse[] }>(
    `/api/v1/decisions/${encodeURIComponent(walletAddress)}?limit=${limit}`,
  );

export const getSolMarketData = () => request<SolMarketDataResponse>('/api/v1/market/sol');

export const analyzePortfolio = (
  walletAddress: string,
  snapshot: PortfolioSnapshotInput,
  marketContext: Record<string, unknown>,
  language: 'en' | 'ru',
) => request<DecisionLogResponse>('/api/v1/agent/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    wallet_address: walletAddress,
    snapshot,
    market_context: marketContext,
    language,
  }),
}, walletAddress);

export const simulateDecision = (decisionId: string, walletAddress: string) =>
  request<{ decision_id: string; simulation: Record<string, unknown> }>(
    `/api/v1/decisions/${decisionId}/simulate`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet_address: walletAddress }),
    }, walletAddress,
  );
