import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ActionType = 'BUY_SOL' | 'SELL_SOL' | 'HOLD';

export interface Decision {
  id: string;
  timestamp: string;
  action: ActionType;
  amount_pct: number;
  confidence: number;
  reasoning: string;
  key_signals: string[];
  risk_flags: string[];
  txHash: string;
  vaultTxHash: string;
  slot: number;
  status: 'Confirmed' | 'Pending';
}

export interface AgentConfig {
  profile: 'Conservative' | 'Balanced' | 'Growth';
  investmentCapUsd: number;
  maxSingleTradeUsd: number;
  maxDailyTurnoverUsd: number;
  maxDrawdownPct: number;
  maxSolAllocation: number;
  minUsdcReserve: number;
  maxSingleRebalance: number;
  cycleFrequency: string;
  cooldown: string;
  slippageTolerance: number;
  minLiquidity: string;
  deviationTrigger: number;
  model: string;
  reasoningDepth: number;
  temperature: number;
}

export const SAMPLE_DEMO_DECISIONS: Decision[] = [
  {
    id: 'demo-01-sol',
    timestamp: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
    action: 'BUY_SOL',
    amount_pct: 12,
    confidence: 89,
    reasoning: 'Momentum indicator crossover + 1.8% discount to EMA. Target asset SOL is verified Eligible under Shariah policy v0.1.',
    key_signals: ['RSI-38', 'EMA-20-CROSS', 'SOL-ELIGIBLE'],
    risk_flags: [],
    txHash: 'sim_5KtZ2xM7...491v',
    vaultTxHash: 'sim_8YpL9qB2...302a',
    slot: 284412100,
    status: 'Confirmed',
  },
  {
    id: 'demo-02-hold',
    timestamp: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    action: 'HOLD',
    amount_pct: 0,
    confidence: 94,
    reasoning: 'Macro volatility within 1σ band and target asset allocation is optimal. Deliberate risk-management hold preserves capital.',
    key_signals: ['LOW-VOLATILITY', 'TARGET-BALANCED', 'NO-REBALANCE-NEEDED'],
    risk_flags: [],
    txHash: 'sim_hold_882b...199a',
    vaultTxHash: 'sim_hold_882b...199a',
    slot: 284411950,
    status: 'Confirmed',
  },
  {
    id: 'demo-03-blocked',
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    action: 'HOLD',
    amount_pct: 0,
    confidence: 76,
    reasoning: 'AI agent suggested hedging via Jupiter Perpetuals (synthetic margin). Shariah Firewall blocked execution: Rule SH-02 strictly forbids leverage and derivatives. Switched to protective HOLD.',
    key_signals: ['SH-02-VIOLATION', 'LEVERAGE-PROHIBITED', 'FAIL-CLOSED'],
    risk_flags: ['SH-02: Leverage/perpetual derivative detected', 'FAIL-CLOSED: Execution rejected'],
    txHash: 'sim_blocked_sh02',
    vaultTxHash: 'sim_blocked_sh02',
    slot: 284411800,
    status: 'Confirmed',
  },
  {
    id: 'demo-04-review',
    timestamp: new Date(Date.now() - 1000 * 60 * 85).toISOString(),
    action: 'HOLD',
    amount_pct: 0,
    confidence: 82,
    reasoning: 'Candidate trade route contained unvetted program ID. Rule SH-05 / SH-06 enforces fail-closed: unknown programs cannot execute.',
    key_signals: ['SH-05-UNVETTED-ROUTE', 'SH-06-UNCERTAINTY'],
    risk_flags: ['SH-05: Route program missing allowlist proof'],
    txHash: 'sim_blocked_sh05',
    vaultTxHash: 'sim_blocked_sh05',
    slot: 284411620,
    status: 'Confirmed',
  },
];

interface AppState {
  isDemoMode: boolean;
  setDemoMode: (val: boolean) => void;
  resetDemoData: () => void;
  decisions: Decision[];
  config: AgentConfig;
  updateConfig: (newConfig: Partial<AgentConfig>) => void;
  addDecision: (decision: Decision) => void;
}

const DEFAULT_CONFIG: AgentConfig = {
  profile: 'Balanced',
  investmentCapUsd: 1000,
  maxSingleTradeUsd: 100,
  maxDailyTurnoverUsd: 300,
  maxDrawdownPct: 10,
  maxSolAllocation: 80,
  minUsdcReserve: 20,
  maxSingleRebalance: 15,
  cycleFrequency: '5 min',
  cooldown: '1 hour',
  slippageTolerance: 0.5,
  minLiquidity: '$50k+',
  deviationTrigger: 2,
  model: 'gemini-3.5-flash-lite',
  reasoningDepth: 50,
  temperature: 0.3,
};

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      isDemoMode: false,
      setDemoMode: (val) => set((state) => ({ 
        isDemoMode: val,
        decisions: val && state.decisions.length === 0 ? SAMPLE_DEMO_DECISIONS : state.decisions
      })),
      resetDemoData: () => set({ decisions: SAMPLE_DEMO_DECISIONS }),
      decisions: [],
      config: DEFAULT_CONFIG,
      updateConfig: (newConfig) => set((state) => ({ config: { ...state.config, ...newConfig } })),
      addDecision: (decision) => set((state) => ({ decisions: [decision, ...state.decisions] })),
    }),
    {
      name: 'solvex-storage',
      merge: (persisted, current) => {
        const saved = persisted as Partial<AppState> | undefined;
        return {
          ...current,
          ...saved,
          isDemoMode: false,
          config: { ...DEFAULT_CONFIG, ...saved?.config },
        };
      },
    }
  )
);
