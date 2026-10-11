import React from 'react';
import { AlertCircle, RotateCcw, X } from 'lucide-react';
import { useStore } from '../store';
import { useLanguage } from '../i18n';

export const DemoBanner = () => {
  const { isDemoMode, setDemoMode, resetDemoData } = useStore();
  const { tr } = useLanguage();

  if (!isDemoMode) return null;

  return (
    <div className="sticky top-0 z-50 w-full bg-amber-500/15 border-b border-amber-500/30 backdrop-blur-md px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-3 text-amber-200">
      <div className="flex items-center gap-2 font-mono">
        <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
        <span className="font-bold tracking-wider uppercase text-amber-300">
          {tr('DEMO MODE — SIMULATED DATA', 'ДЕМО-РЕЖИМ — ИМИТАЦИЯ ДАННЫХ')}
        </span>
        <span className="hidden sm:inline text-amber-300/70">
          | {tr('No real funds or private keys required. Testing safety invariants.', 'Не требуются реальные средства. Проверка защитных инвариантов.')}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => resetDemoData()}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-200 font-semibold transition-colors"
        >
          <RotateCcw size={12} />
          {tr('Reset Sample Data', 'Сбросить данные')}
        </button>
        <button
          type="button"
          onClick={() => setDemoMode(false)}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-black/30 hover:bg-black/50 border border-white/10 text-white/80 hover:text-white font-medium transition-colors"
        >
          <X size={12} />
          {tr('Exit Demo', 'Выйти')}
        </button>
      </div>
    </div>
  );
};
