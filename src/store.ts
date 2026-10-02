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

interface AppState {
  isDemoMode: boolean;
  setDemoMode: (val: boolean) => void;
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
  model: 'gpt-6-astra',
  reasoningDepth: 50,
  temperature: 0.3,
};

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      isDemoMode: false,
      setDemoMode: (val) => set({ isDemoMode: val }),
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
