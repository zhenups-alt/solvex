import React from 'react';
import { Card } from '../components/UI';
import { Code, Shield, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n';

export default function DocsPage() {
  const { tr } = useLanguage();
  return (
    <div className="p-4 md:p-8 grid grid-cols-1 lg:grid-cols-[240px,1fr] gap-12">
      <aside className="space-y-8">
        <div className="space-y-1">
          <h3 className="text-[10px] uppercase tracking-widest text-text-muted font-bold mb-4">{tr('Documentation', 'Документация')}</h3>
          {[
            [tr('Getting Started', 'Быстрый старт'), '/docs'],
            [tr('Architecture', 'Архитектура'), '/architecture'],
            [tr('Vault Program', 'Программа хранилища'), '/vault'],
            [tr('Agent limits', 'Лимиты агента'), '/agent-config?section=risk'],
            [tr('Decision Log', 'Журнал решений'), '/decisions'],
          ].map(([item, path]) => (
            <Link key={item} to={path} className="block w-full text-left px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-subtle rounded-md transition-all">
              {item}
            </Link>
          ))}
        </div>
      </aside>

      <div className="max-w-3xl space-y-12">
        <section className="space-y-6">
          <h1 className="text-3xl font-bold text-text-primary">{tr('Getting Started', 'Быстрый старт')}</h1>
          <p className="text-text-secondary leading-relaxed">
            {tr('Solvex is a devnet-stage implementation of a policy-constrained Solana asset manager. The current app supports wallet connection, persisted risk profiles, deterministic Shariah and risk checks, an explainable decision log, and a deployed per-user vault program. Live swaps remain disabled pending mainnet readiness and end-to-end simulation checks.', 'Solvex — Devnet-версия управляющего активами в Solana с жёсткими политиками. Приложение поддерживает подключение кошелька, сохранение риск-профилей, детерминированные Shariah- и риск-проверки, прозрачный журнал решений и развёрнутую программу персонального хранилища. Реальные обмены отключены до готовности Mainnet и завершения сквозных симуляционных проверок.')}
          </p>
          
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-text-primary">{tr('Prerequisites', 'Что потребуется')}</h2>
            <ul className="list-disc list-inside text-sm text-text-secondary space-y-2 ml-4">
              <li>{tr('A Phantom wallet (the connector currently implemented by this client)', 'Кошелёк Phantom — сейчас клиент поддерживает именно его')}</li>
              <li>{tr('Solana Devnet SOL (get some from a faucet)', 'Тестовые SOL в Solana Devnet')}</li>
              <li>{tr('Basic understanding of DeFi vaults', 'Базовое понимание DeFi-хранилищ')}</li>
            </ul>
          </div>

          <Card className="p-6 bg-bg-elevated/50 border-info-dim/20">
            <div className="flex gap-3">
              <Info className="text-info shrink-0" size={18} />
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-text-primary">{tr('Note on Devnet', 'Важно о Devnet')}</h4>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {tr('The vault program is deployed to Devnet at 8oi1…AkP8. New vaults start paused. Canonical Jupiter v6 is not available as a Devnet SBF program, so the UI keeps swap execution locked and must not be used with real funds.', 'Программа хранилища развёрнута в Devnet по адресу 8oi1…AkP8. Новые хранилища запускаются на паузе. Каноническая Jupiter v6 недоступна как SBF-программа в Devnet, поэтому интерфейс блокирует обмены. Не используйте реальные средства.')}
                </p>
              </div>
            </div>
          </Card>
        </section>

        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-text-primary">{tr('Security Model', 'Модель безопасности')}</h2>
          <p className="text-text-secondary leading-relaxed">
            {tr('Solvex uses layered controls, but this development build has not received an independent security audit and must not be used with real funds.', 'Solvex использует многоуровневый контроль, но эта версия ещё не проходила независимый аудит безопасности и не должна использоваться с реальными средствами.')}
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-4 space-y-2">
              <div className="flex items-center gap-2 text-accent">
                <Shield size={16} />
                <h4 className="text-sm font-semibold">{tr('Non-Custodial', 'Некастодиальная модель')}</h4>
              </div>
              <p className="text-xs text-text-secondary">{tr('The agent can only execute trades within the vault. It cannot transfer funds to external addresses.', 'Агент может совершать сделки только внутри хранилища и не может переводить средства на внешние адреса.')}</p>
            </Card>
            <Card className="p-4 space-y-2">
              <div className="flex items-center gap-2 text-accent">
                <Code size={16} />
                <h4 className="text-sm font-semibold">{tr('Program-Level Rules', 'Правила на уровне программы')}</h4>
              </div>
              <p className="text-xs text-text-secondary">{tr('The Anchor program enforces principal, per-trade, daily, pair, quote-expiry, and minimum-output constraints in token atomic units.', 'Anchor-программа применяет ограничения общей суммы, сделки, дневного оборота, пары, срока котировки и минимального выхода в атомарных единицах токена.')}</p>
            </Card>
          </div>
          <Card className="p-4 border-warning/30">
            <h4 className="text-sm font-semibold text-warning">{tr('Shariah methodology status', 'Статус Shariah-методологии')}</h4>
            <p className="text-xs text-text-secondary mt-2">{tr('Eligible means the configured methodology checks passed; it is not a universal halal certification. Review and Blocked results never auto-execute. Independent scholarly review is still required.', 'Eligible означает, что настроенные проверки методологии пройдены; это не универсальный сертификат халяльности. Результаты Review и Blocked никогда не исполняются автоматически. По-прежнему требуется независимая проверка квалифицированными специалистами.')}</p>
          </Card>
        </section>
      </div>
    </div>
  );
}
