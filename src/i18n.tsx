import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';

export type Language = 'en' | 'ru';

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  tr: (english: string, russian: string) => string;
  locale: string;
}

const STORAGE_KEY = 'solvex-language';

const LanguageContext = createContext<LanguageContextValue | null>(null);

function getInitialLanguage(): Language {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'en' || saved === 'ru') return saved;
  return navigator.language.toLowerCase().startsWith('ru') ? 'ru' : 'en';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage);

  const setLanguage = (nextLanguage: Language) => {
    localStorage.setItem(STORAGE_KEY, nextLanguage);
    setLanguageState(nextLanguage);
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo<LanguageContextValue>(() => ({
    language,
    setLanguage,
    tr: (english, russian) => language === 'ru' ? russian : english,
    locale: language === 'ru' ? 'ru-RU' : 'en-US',
  }), [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used inside LanguageProvider');
  return context;
}

const CODE_RU: Record<string, string> = {
  buy: 'покупка',
  sell: 'продажа',
  hold: 'удержание',
  rebalance: 'ребалансировка',
  eligible: 'допущено',
  review: 'на проверке',
  blocked: 'заблокировано',
  pass: 'пройдено',
  fail: 'не пройдено',
  warn: 'предупреждение',
  executed: 'исполнено',
  ready_for_execution: 'готово к исполнению',
  simulation_failed: 'ошибка симуляции',
  blocked_by_shariah: 'отклонено Shariah Firewall',
  blocked_by_risk: 'отклонено Risk Engine',
  recorded: 'записано',
};

export function localizeCode(value: string, language: Language) {
  if (language !== 'ru') return value.replaceAll('_', ' ');
  return CODE_RU[value.toLowerCase()] || value.replaceAll('_', ' ');
}
