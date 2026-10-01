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
  profile: 'Conservative' | 'Balanced' | 'Aggressive';
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
  walletAddress: string | null;
  setWalletAddress: (addr: string | null) => void;
  vaultBalance: { sol: number; usdc: number };
  decisions: Decision[];
  config: AgentConfig;
  updateConfig: (newConfig: Partial<AgentConfig>) => void;
  addDecision: (decision: Decision) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      isDemoMode: true,
      setDemoMode: (val) => set({ isDemoMode: val }),
      walletAddress: null,
      setWalletAddress: (addr) => set({ walletAddress: addr }),
      vaultBalance: { sol: 0.872, usdc: 615.20 },
      decisions: [],
      config: {
        profile: 'Balanced',
        maxSolAllocation: 80,
        minUsdcReserve: 20,
        maxSingleRebalance: 15,
        cycleFrequency: '5 min',
        cooldown: '1 hour',
        slippageTolerance: 0.5,
        minLiquidity: '$50k+',
        deviationTrigger: 2,
        model: 'claude-sonnet-4-20250514',
        reasoningDepth: 50,
        temperature: 0.3,
      },
      updateConfig: (newConfig) => set((state) => ({ config: { ...state.config, ...newConfig } })),
      addDecision: (decision) => set((state) => ({ decisions: [decision, ...state.decisions] })),
    }),
    {
      name: 'solvex-storage',
    }
  )
);
