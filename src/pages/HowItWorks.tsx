import React from 'react';
import { Card } from '../components/UI';
import { Activity, Brain, CheckCircle, Zap, Shield, FileCheck } from 'lucide-react';
import { useLanguage } from '../i18n';

export default function HowItWorksPage() {
  const { tr } = useLanguage();
  return (
    <div className="p-4 md:p-8 space-y-12">
      <header>
        <h1 className="text-2xl font-bold text-text-primary">{tr('How Solvex Works', 'Как работает Solvex')}</h1>
        <p className="text-text-secondary mt-1">{tr('A guarded agent loop where the model proposes and deterministic code decides.', 'Защищённый цикл агента: модель предлагает, а детерминированный код принимает решение.')}</p>
      </header>

      <section className="space-y-8">
        <div className="prose prose-invert max-w-none">
          <p className="text-lg text-text-secondary leading-relaxed">
            {tr('Solvex separates portfolio analysis from authorization. The model can recommend HOLD, BUY, SELL, or REBALANCE, but it cannot approve its own proposal. Shariah screening, risk limits, simulation, and the on-chain vault independently decide whether execution is allowed.', 'Solvex отделяет анализ портфеля от разрешения на операцию. Модель может предложить HOLD, BUY, SELL или REBALANCE, но не может сама себя одобрить. Shariah-проверка, лимиты риска, симуляция и ончейн-хранилище независимо решают, допустимо ли исполнение.')}
          </p>
        </div>

        <div className="space-y-12">
          <h2 className="text-xl font-bold text-text-primary">{tr('The Agent Loop', 'Цикл работы агента')}</h2>
          <div className="space-y-8 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-border-subtle">
            {[
              { step: '01', title: tr('Structured Snapshot', 'Структурированный снимок'), desc: tr('The backend assembles explicit portfolio, market, and user-risk inputs. Missing evidence is treated as a reason to stop.', 'Сервер собирает данные портфеля, рынка и риск-профиля. Отсутствие данных считается причиной остановиться.'), icon: Activity },
              { step: '02', title: tr('AI Proposal', 'Предложение ИИ'), desc: tr('The Gemini adapter returns one schema-constrained proposal and rationale. The output is untrusted input, not authorization.', 'Адаптер Gemini возвращает одно предложение и обоснование по строгой схеме. Ответ считается недоверенным вводом, а не разрешением.'), icon: Brain },
              { step: '03', title: 'Shariah Firewall', desc: tr('Assets, protocol, and transaction mechanics are evaluated as Eligible, Review, or Blocked. Review never auto-executes.', 'Активы, протокол и механика транзакции получают статус Eligible, Review или Blocked. Review никогда не исполняется автоматически.'), icon: Shield },
              { step: '04', title: tr('Risk Validation', 'Проверка риска'), desc: tr('The deterministic Risk Engine applies the user investment cap, single-trade cap, daily turnover, drawdown, and slippage limits.', 'Детерминированный Risk Engine применяет лимиты инвестиций, одной сделки, дневного оборота, просадки и проскальзывания.'), icon: CheckCircle },
              { step: '05', title: tr('Simulation and Execution', 'Симуляция и исполнение'), desc: tr('Only an eligible proposal may be simulated. Live Jupiter execution stays disabled until deployment and integration checks are complete.', 'Симулировать можно только допущенное предложение. Реальное исполнение Jupiter отключено до завершения развёртывания и интеграционных проверок.'), icon: Zap },
              { step: '06', title: tr('Decision Log', 'Журнал решений'), desc: tr('The database records the proposal and every check. A successful swap also emits its decision hash and nonce from the vault program.', 'База данных сохраняет предложение и все проверки. При успешном обмене программа хранилища также публикует хеш решения и nonce.'), icon: FileCheck },
            ].map((item, i) => (
              <div key={i} className="relative pl-12">
                <div className="absolute left-0 top-0 w-8 h-8 rounded-full bg-bg-elevated border border-border-default flex items-center justify-center text-xs font-mono text-accent z-10">
                  {item.step}
                </div>
                <Card className="p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <item.icon size={18} className="text-accent" />
                    <h3 className="text-md font-semibold text-text-primary">{item.title}</h3>
                  </div>
                  <p className="text-sm text-text-secondary leading-relaxed">{item.desc}</p>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-xl font-bold text-text-primary">{tr('Setting Up a Wallet', 'Настройка кошелька')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6 space-y-4">
            <div className="w-8 h-8 rounded-full bg-bg-elevated flex items-center justify-center text-sm font-bold">1</div>
            <h3 className="text-md font-semibold">{tr('Install Phantom', 'Установите Phantom')}</h3>
            <p className="text-sm text-text-secondary">{tr('Download the Phantom wallet extension for your browser or the mobile app.', 'Установите расширение Phantom для браузера или мобильное приложение.')}</p>
            <a href="https://phantom.com/download" target="_blank" rel="noreferrer" className="inline-flex h-9 items-center rounded-md border border-border-default px-3 text-sm font-medium hover:bg-bg-subtle">{tr('Get Phantom', 'Скачать Phantom')}</a>
          </Card>
          <Card className="p-6 space-y-4">
            <div className="w-8 h-8 rounded-full bg-bg-elevated flex items-center justify-center text-sm font-bold">2</div>
            <h3 className="text-md font-semibold">{tr('Switch to Devnet', 'Переключитесь на Devnet')}</h3>
            <p className="text-sm text-text-secondary">{tr('Open settings in Phantom, go to Developer Settings, and enable Testnet Mode. Select Solana Devnet.', 'Откройте настройки Phantom, перейдите в Developer Settings, включите Testnet Mode и выберите Solana Devnet.')}</p>
          </Card>
        </div>
      </section>
    </div>
  );
}
