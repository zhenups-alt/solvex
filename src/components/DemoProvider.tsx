import React, { useEffect } from 'react';
import { useStore, Decision } from '../store';

export const DemoProvider = ({ children }: { children: React.ReactNode }) => {
  const { isDemoMode, addDecision, decisions } = useStore();

  useEffect(() => {
    if (!isDemoMode) return;

    // Initial data if empty
    if (decisions.length === 0) {
      const initialDecisions: Decision[] = Array.from({ length: 50 }, (_, i) => {
        const actions: ('BUY_SOL' | 'SELL_SOL' | 'HOLD')[] = ['BUY_SOL', 'SELL_SOL', 'HOLD', 'HOLD', 'HOLD'];
        const action = actions[Math.floor(Math.random() * actions.length)];
        return {
          id: Math.random().toString(36).substr(2, 9),
          timestamp: new Date(Date.now() - i * 1000 * 60 * 15).toISOString(),
          action,
          amount_pct: action === 'HOLD' ? 0 : Math.floor(Math.random() * 15) + 1,
          confidence: Math.floor(Math.random() * 30) + 70,
          reasoning: `Simulated reasoning for ${action} based on market conditions.`,
          key_signals: ['RSI', 'MACD', 'VOL'],
          risk_flags: [],
          txHash: Math.random().toString(36).substr(2, 12),
          vaultTxHash: Math.random().toString(36).substr(2, 12),
          slot: 284411000 + i,
          status: 'Confirmed'
        };
      });
      initialDecisions.forEach(d => addDecision(d));
    }

    // Interval for new HOLD decisions (90s)
    const holdInterval = setInterval(() => {
      addDecision({
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
        action: 'HOLD',
        amount_pct: 0,
        confidence: Math.floor(Math.random() * 20) + 80,
        reasoning: 'Market volatility remains within 1σ bounds. No action required.',
        key_signals: ['Low deviation'],
        risk_flags: [],
        txHash: Math.random().toString(36).substr(2, 12),
        vaultTxHash: Math.random().toString(36).substr(2, 12),
        slot: 284411823 + decisions.length,
        status: 'Confirmed'
      });
    }, 90000);

    // Interval for new BUY/SELL decisions (8-12m)
    const tradeInterval = setInterval(() => {
      const action = Math.random() > 0.5 ? 'BUY_SOL' : 'SELL_SOL';
      addDecision({
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
        action,
        amount_pct: Math.floor(Math.random() * 10) + 5,
        confidence: Math.floor(Math.random() * 15) + 75,
        reasoning: `Automated ${action} triggered by technical indicator crossover.`,
        key_signals: ['RSI', 'Trend'],
        risk_flags: [],
        txHash: Math.random().toString(36).substr(2, 12),
        vaultTxHash: Math.random().toString(36).substr(2, 12),
        slot: 284411823 + decisions.length,
        status: 'Confirmed'
      });
    }, (Math.floor(Math.random() * 4) + 8) * 60000);

    return () => {
      clearInterval(holdInterval);
      clearInterval(tradeInterval);
    };
  }, [isDemoMode, addDecision, decisions.length]);

  return <>{children}</>;
};
