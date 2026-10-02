import React, { useEffect, useState } from 'react';
import { 
  Shield, 
  Cpu, 
  Activity, 
  Brain, 
  Zap, 
  Bell, 
  Key, 
  Settings2,
  ChevronRight,
  Info,
  Save
} from 'lucide-react';
import { Card, Button, Badge } from '../components/UI';
import { AgentConfig, useStore } from '../store';
import { cn } from '../lib/utils';
import { usePhantom } from '../components/WalletContextProvider';
import { getRiskProfile, saveRiskProfile } from '../lib/solvexApi';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';
import { useLanguage } from '../i18n';

export default function AgentConfigPage() {
  const [searchParams] = useSearchParams();
  const [activeSection, setActiveSection] = useState(searchParams.get('section') || 'risk');
  const [saving, setSaving] = useState(false);
  const { config, updateConfig } = useStore();
  const { address } = usePhantom();
  const { tr } = useLanguage();

  useEffect(() => {
    if (!address) return;
    getRiskProfile(address)
      .then((profile) => {
        const profileName = `${profile.risk_level[0].toUpperCase()}${profile.risk_level.slice(1)}` as AgentConfig['profile'];
        updateConfig({
          profile: profileName,
          investmentCapUsd: Number(profile.investment_cap_usd),
          maxSingleTradeUsd: Number(profile.max_single_trade_usd),
          maxDailyTurnoverUsd: Number(profile.max_daily_turnover_usd),
          slippageTolerance: profile.max_slippage_bps / 100,
          maxDrawdownPct: Number(profile.max_drawdown_pct),
        });
      })
      .catch((error) => {
        if (!error.message.includes('profile not found')) {
          toast.error(tr('Could not load risk profile', 'Не удалось загрузить профиль риска'), { description: error.message });
        }
      });
  }, [address, updateConfig]);

  const handleSaveRisk = async () => {
    if (!address) {
      toast.error(tr('Connect your wallet before saving limits', 'Подключите кошелёк перед сохранением лимитов'));
      return;
    }
    if (config.maxSingleTradeUsd > config.investmentCapUsd) {
      toast.error(tr('Per-trade limit cannot exceed the investment cap', 'Лимит одной сделки не может превышать общий лимит инвестиций'));
      return;
    }
    setSaving(true);
    try {
      await saveRiskProfile(address, config);
      toast.success(tr('Risk limits saved', 'Лимиты сохранены'), {
        description: tr(
          `The agent cannot manage more than $${config.investmentCapUsd.toLocaleString()}.`,
          `Агент не сможет управлять суммой больше $${config.investmentCapUsd.toLocaleString()}.`,
        ),
      });
    } catch (error) {
      toast.error(tr('Could not save risk limits', 'Не удалось сохранить лимиты'), {
        description: error instanceof Error ? error.message : tr('Unknown API error', 'Неизвестная ошибка API'),
      });
    } finally {
      setSaving(false);
    }
  };

  const sections = [
    { id: 'risk', name: tr('Investment limits', 'Лимиты инвестиций'), icon: Shield },
    { id: 'strategy', name: tr('Strategy Profile', 'Профиль стратегии'), icon: Activity },
    { id: 'model', name: tr('AI Model Settings', 'Настройки ИИ-модели'), icon: Brain },
    { id: 'data', name: tr('Market Data Sources', 'Источники данных'), icon: Cpu },
    { id: 'prompt', name: tr('AI Proposal Policy', 'Политика ИИ-предложений'), icon: Settings2 },
    { id: 'execution', name: tr('Execution Rules', 'Правила исполнения'), icon: Zap },
    { id: 'notifications', name: tr('Notifications', 'Уведомления'), icon: Bell },
    { id: 'keypair', name: tr('Agent Keypair', 'Ключ агента'), icon: Key },
  ];

  return (
    <div className="p-4 md:p-8 space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-text-primary">{tr('Agent limits and settings', 'Лимиты и настройки агента')}</h1>
        <p className="text-text-secondary mt-1">{tr('Set how much money the AI may manage. These limits cannot be overridden by the model.', 'Задайте, какой суммой может управлять ИИ. Модель не может обойти эти ограничения.')}</p>
      </header>

      <Card className="border-accent/30 bg-accent/5 p-5">
        <div className="flex items-start gap-3">
          <Info size={18} className="mt-0.5 shrink-0 text-accent" />
          <div>
            <div className="text-sm font-semibold text-text-primary">{tr('How to configure the agent', 'Как настроить агента')}</div>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">
              {tr('1. Connect Phantom. 2. Enter the four limits below. 3. Click “Save enforced limits”. The settings are linked to your wallet address.', '1. Подключите Phantom. 2. Укажите четыре лимита ниже. 3. Нажмите «Сохранить лимиты». Настройки будут привязаны к адресу вашего кошелька.')}
            </p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-[240px,1fr] gap-8">
        {/* Sidebar Nav */}
        <div className="space-y-1">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 rounded-md text-sm font-medium transition-all group",
                activeSection === section.id 
                  ? "bg-bg-elevated text-text-primary" 
                  : "text-text-secondary hover:text-text-primary hover:bg-bg-subtle"
              )}
            >
              <div className="flex items-center gap-3">
                <section.icon size={16} className={cn(activeSection === section.id ? "text-accent" : "text-text-muted group-hover:text-text-secondary")} />
                {section.name}
              </div>
              <ChevronRight size={14} className={cn("transition-transform", activeSection === section.id ? "rotate-90 text-accent" : "text-text-muted")} />
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="space-y-8">
          {activeSection === 'strategy' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div>
                <h2 className="text-lg font-semibold text-text-primary">{tr('Strategy Profile', 'Профиль стратегии')}</h2>
                <p className="text-sm text-text-secondary mt-1">{tr('Choose how aggressively the AI agent manages your vault.', 'Выберите, насколько активно ИИ-агент будет управлять хранилищем.')}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { id: 'Conservative', name: tr('Conservative', 'Консервативный'), label: tr('Low Activity', 'Низкая активность'), trigger: '3σ', max: '5%', desc: tr('Capital preservation with minimal fees.', 'Сохранение капитала при минимальных комиссиях.') },
                  { id: 'Balanced', name: tr('Balanced', 'Сбалансированный'), label: tr('Recommended', 'Рекомендуется'), trigger: '2σ', max: '15%', desc: tr('Balanced between responsiveness and stability.', 'Баланс между реакцией на рынок и стабильностью.') },
                  { id: 'Growth', name: tr('Growth', 'Рост'), label: tr('High Activity', 'Высокая активность'), trigger: '1σ', max: '30%', desc: tr('Higher activity while remaining inside hard policy limits.', 'Более высокая активность в пределах жёстких лимитов.') },
                ].map((profile) => (
                  <button
                    key={profile.id}
                    onClick={() => updateConfig({ profile: profile.id as any })}
                    className={cn(
                      "text-left p-6 rounded-lg border transition-all",
                      config.profile === profile.id 
                        ? "bg-accent-dim/10 border-accent ring-1 ring-accent" 
                        : "bg-bg-card border-border-subtle hover:border-border-default"
                    )}
                  >
                    <Badge variant={config.profile === profile.id ? 'accent' : 'default'} className="mb-4">{profile.label}</Badge>
                    <div className="text-md font-bold mb-2">{profile.name}</div>
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-xs">
                        <span className="text-text-muted">{tr('Trigger:', 'Триггер:')}</span>
                        <span className="text-text-primary font-mono">{profile.trigger}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-text-muted">{tr('Max Rebalance:', 'Макс. ребалансировка:')}</span>
                        <span className="text-text-primary font-mono">{profile.max}</span>
                      </div>
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed">{profile.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'risk' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div>
                <h2 className="text-lg font-semibold text-text-primary">{tr('Investment and risk limits', 'Лимиты инвестиций и риска')}</h2>
                <p className="text-sm text-text-secondary mt-1">{tr('These values define exactly how much the autonomous agent is allowed to manage and trade.', 'Эти значения точно определяют, какой суммой автономный агент может управлять и торговать.')}</p>
              </div>

              <Card className="p-8 space-y-8">
                <div className="space-y-6">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-text-muted">{tr('Hard Agent Limits', 'Жёсткие лимиты агента')}</h3>
                  <p className="text-xs text-text-muted">{tr('The deterministic Risk Engine checks these limits. The AI model cannot change or bypass them.', 'Эти лимиты проверяет детерминированный Risk Engine. ИИ-модель не может их изменить или обойти.')}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {([
                      { key: 'investmentCapUsd', label: tr('Total investment cap', 'Общий лимит инвестиций'), help: tr('Maximum amount the AI may manage in total.', 'Максимальная общая сумма, которой может управлять ИИ.') },
                      { key: 'maxSingleTradeUsd', label: tr('Maximum single trade', 'Максимум на одну сделку'), help: tr('Maximum USD value of one rebalance operation.', 'Максимальная сумма одной операции в долларах.') },
                      { key: 'maxDailyTurnoverUsd', label: tr('Daily turnover cap', 'Дневной лимит оборота'), help: tr('Maximum total traded value during 24 hours.', 'Максимальная сумма всех сделок за 24 часа.') },
                      { key: 'maxDrawdownPct', label: tr('Maximum drawdown', 'Максимальная просадка'), help: tr('New buys stop after this drawdown; de-risking sells remain available.', 'После такой просадки новые покупки останавливаются; защитные продажи остаются доступны.') },
                    ] as const).map((field) => (
                      <label key={field.key} className="space-y-2 rounded-lg border border-border-subtle bg-bg-elevated/50 p-4">
                        <span className="text-sm font-medium">{field.label}</span>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">{field.key === 'maxDrawdownPct' ? '%' : '$'}</span>
                          <input
                            type="number"
                            min="1"
                            value={config[field.key]}
                            onChange={(event) => updateConfig({ [field.key]: Number(event.target.value) } as Partial<AgentConfig>)}
                            className="w-full h-11 rounded-md border border-border-default bg-bg-base pl-8 pr-3 font-mono text-sm focus:outline-none focus:border-accent"
                          />
                        </div>
                        <span className="block text-xs text-text-muted">{field.help}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="pt-8 border-t border-border-subtle">
                  <Button disabled={saving || !address} onClick={handleSaveRisk} className="gap-2">
                    <Save size={16} /> {saving ? tr('Saving…', 'Сохранение…') : tr('Save enforced limits', 'Сохранить лимиты')}
                  </Button>
                  {!address && <p className="text-xs text-warning mt-3">{tr('Connect Phantom to bind these limits to your vault profile.', 'Подключите Phantom, чтобы привязать лимиты к вашему профилю хранилища.')}</p>}
                  {address && <p className="text-xs text-positive mt-3">{tr('Wallet connected. You can save the limits now.', 'Кошелёк подключён. Теперь можно сохранить лимиты.')}</p>}
                </div>
              </Card>
            </div>
          )}

          {activeSection === 'prompt' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div>
                <h2 className="text-lg font-semibold text-text-primary">{tr('AI Proposal Policy', 'Политика ИИ-предложений')}</h2>
                <p className="text-sm text-text-secondary mt-1">{tr('The model may propose actions, but deterministic engines make every approval decision.', 'Модель может предлагать действия, но решение о допуске всегда принимают детерминированные модули.')}</p>
              </div>

              <Card className="p-0 overflow-hidden">
                <textarea 
                  className="w-full h-[400px] bg-bg-elevated p-6 font-mono text-sm text-text-secondary focus:outline-none focus:text-text-primary leading-relaxed resize-none"
                  readOnly
                  value={tr(`You are the Solvex portfolio analysis component running on Solana.

Your role is to analyze market data and produce one structured portfolio proposal.
You do not approve Shariah compliance, risk, simulation, or execution.
Never claim that an asset is halal. Prefer HOLD when evidence is incomplete.

DECISION FRAMEWORK:
1. Analyze the provided market data (price, volatility, volume, liquidity)
2. Consider the vault's current allocation and target allocation
3. Evaluate whether current conditions warrant a rebalance
4. Produce a structured proposal with explicit leverage, derivative, and interest flags
5. Allow the deterministic Shariah and Risk engines to accept or reject it`, `Вы — компонент анализа портфеля Solvex в сети Solana.

Ваша задача — анализировать рыночные данные и формировать одно структурированное предложение по портфелю.
Вы не подтверждаете соответствие нормам Шариата, риски, симуляцию или исполнение.
Никогда не заявляйте, что актив является халяльным. При неполных данных выбирайте HOLD.

ПОРЯДОК ПРИНЯТИЯ РЕШЕНИЯ:
1. Проанализировать рыночные данные
2. Учесть текущее и целевое распределение хранилища
3. Определить, нужна ли ребалансировка
4. Сформировать структурированное предложение с флагами leverage, derivatives и interest
5. Передать предложение Shariah и Risk Engine для принятия или отклонения`)}
                />
                <div className="p-4 border-t border-border-subtle flex justify-between items-center bg-bg-card">
                  <span className="text-xs text-text-muted">{tr('Enforced server-side · version controlled', 'Применяется на сервере · контролируется по версиям')}</span>
                  <Badge variant="accent">gemini-3.5-flash-lite</Badge>
                </div>
              </Card>
              
              <div className="flex items-start gap-3 p-4 bg-info-dim/10 border border-info-dim rounded-md">
                <Info size={16} className="text-info mt-0.5 shrink-0" />
                <p className="text-xs text-info leading-relaxed">
                  {tr('The model output is constrained by a JSON schema. It is always treated as an untrusted proposal and cannot bypass the Shariah Firewall or Risk Engine.', 'Ответ модели ограничен JSON-схемой и всегда считается недоверенным предложением. Он не может обойти Shariah Firewall или Risk Engine.')}
                </p>
              </div>
            </div>
          )}

          {/* Other sections would follow similar patterns */}
          {['model', 'data', 'execution', 'notifications', 'keypair'].includes(activeSection) && (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-bg-elevated flex items-center justify-center text-text-muted">
                <Settings2 size={24} />
              </div>
              <div>
                <h3 className="text-md font-semibold text-text-primary">{sections.find(s => s.id === activeSection)?.name}</h3>
                <p className="text-sm text-text-secondary mt-1">{tr('This section is available in the full version.', 'Этот раздел будет доступен в полной версии.')}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setActiveSection('risk')}>{tr('Return to investment limits', 'Вернуться к лимитам')}</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
