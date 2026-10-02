import React from 'react';
import { Card, Button, Badge } from '../components/UI';
import { Monitor, Globe, Languages, Trash2 } from 'lucide-react';
import { usePhantom } from '../components/WalletContextProvider';
import { useLanguage } from '../i18n';

export default function SettingsPage() {
  const { network } = usePhantom();
  const { language, setLanguage, tr } = useLanguage();

  return (
    <div className="p-4 md:p-8 max-w-4xl space-y-12">
      <header>
        <h1 className="text-2xl font-bold text-text-primary">{tr('Settings', 'Настройки')}</h1>
        <p className="text-text-secondary mt-1">{tr('Manage your account and application preferences.', 'Управляйте настройками аккаунта и приложения.')}</p>
      </header>

      <div className="space-y-8">
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-text-muted">{tr('Appearance', 'Интерфейс')}</h2>
          <Card className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Monitor className="text-text-muted" size={20} />
              <div>
                <div className="text-sm font-medium">{tr('Theme', 'Тема')}</div>
                <div className="text-xs text-text-muted">{tr('Dark mode is the default for Solvex.', 'Тёмная тема используется в Solvex по умолчанию.')}</div>
              </div>
            </div>
            <Badge>{tr('Dark Only', 'Только тёмная')}</Badge>
          </Card>
          <Card className="p-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Languages className="text-text-muted" size={20} />
              <div>
                <div className="text-sm font-medium">{tr('Interface language', 'Язык интерфейса')}</div>
                <div className="text-xs text-text-muted">{tr('The choice is saved in this browser.', 'Выбор сохраняется в этом браузере.')}</div>
              </div>
            </div>
            <div className="flex rounded-md border border-border-default p-1">
              <button onClick={() => setLanguage('ru')} className={`rounded px-3 py-1 text-xs font-bold ${language === 'ru' ? 'bg-accent text-bg-base' : 'text-text-muted'}`}>RU</button>
              <button onClick={() => setLanguage('en')} className={`rounded px-3 py-1 text-xs font-bold ${language === 'en' ? 'bg-accent text-bg-base' : 'text-text-muted'}`}>EN</button>
            </div>
          </Card>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-text-muted">{tr('Network', 'Сеть')}</h2>
          <Card className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Globe className="text-text-muted" size={20} />
                <div>
                  <div className="text-sm font-medium">{tr('Cluster', 'Кластер')}</div>
                  <div className="text-xs text-text-muted">{tr(`Currently connected to Solana ${network}.`, `Сейчас подключена сеть Solana ${network}.`)}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-accent-dim border border-accent-border rounded-md">
                <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                <span className="text-[11px] font-mono text-accent uppercase font-bold">{network}</span>
              </div>
            </div>
            <div className="pt-4 border-t border-border-subtle">
              <label className="block text-xs text-text-muted uppercase tracking-wider mb-2">{tr('Custom RPC Endpoint', 'Собственный RPC-адрес')}</label>
              <input 
                type="text" 
                placeholder="https://api.devnet.solana.com"
                className="w-full bg-bg-elevated border border-border-default rounded-md h-10 px-4 text-sm font-mono focus:outline-none focus:border-accent"
              />
            </div>
          </Card>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-negative">{tr('Danger Zone', 'Опасная зона')}</h2>
          <Card className="p-6 border-negative/20 bg-negative-dim/5 space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-sm font-medium text-text-primary">{tr('Pause Agent', 'Приостановить агента')}</div>
                <div className="text-xs text-text-secondary">{tr('Stop all future rebalancing cycles immediately.', 'Немедленно остановить все будущие циклы ребалансировки.')}</div>
              </div>
              <Button variant="outline" size="sm" className="border-negative text-negative hover:bg-negative-dim">{tr('Pause Agent', 'Приостановить')}</Button>
            </div>
            <div className="flex items-center justify-between pt-6 border-t border-negative/10">
              <div className="space-y-1">
                <div className="text-sm font-medium text-text-primary">{tr('Close Vault', 'Закрыть хранилище')}</div>
                <div className="text-xs text-text-secondary">{tr('Withdraw all funds and close the vault account.', 'Вывести все средства и закрыть аккаунт хранилища.')}</div>
              </div>
              <Button variant="outline" size="sm" className="border-negative text-negative hover:bg-negative-dim gap-2">
                <Trash2 size={14} /> {tr('Close Vault', 'Закрыть хранилище')}
              </Button>
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
}
