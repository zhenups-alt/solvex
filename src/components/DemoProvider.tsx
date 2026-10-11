import React, { useEffect } from 'react';
import { useStore, Decision, SAMPLE_DEMO_DECISIONS } from '../store';

export const DemoProvider = ({ children }: { children: React.ReactNode }) => {
  const { isDemoMode, addDecision, decisions } = useStore();

  useEffect(() => {
    if (!isDemoMode) return;

    // Initial data if empty
    if (decisions.length === 0) {
      SAMPLE_DEMO_DECISIONS.forEach(d => addDecision(d));
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
