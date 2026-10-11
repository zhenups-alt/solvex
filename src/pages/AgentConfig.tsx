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
  Save,
  CheckCircle,
  Lock,
  ExternalLink,
  Database,
  AlertTriangle
} from 'lucide-react';
import { Card, Button, Badge } from '../components/UI';
import { AgentConfig, useStore } from '../store';
import { cn } from '../lib/utils';
import { usePhantom } from '../components/WalletContextProvider';
import { ensureWalletSession, getRiskProfile, saveRiskProfile } from '../lib/solvexApi';
import { SOLVEX_AGENT, VAULT_PROGRAM_ID } from '../lib/vaultClient';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';
import { useLanguage } from '../i18n';

export default function AgentConfigPage() {
  const [searchParams] = useSearchParams();
  const [activeSection, setActiveSection] = useState(searchParams.get('section') || 'risk');
  const [saving, setSaving] = useState(false);
  const { config, updateConfig } = useStore();
  const { address, signMessage } = usePhantom();
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
      await ensureWalletSession(address, signMessage);
      await saveRiskProfile(address, config);
      toast.success(tr('Risk limits saved', 'Лимиты сохранены'), {
        description: tr(
          `Cap: $${config.investmentCapUsd.toLocaleString()}. If Autopilot was running, resume it to apply these limits.`,
          `Лимит: $${config.investmentCapUsd.toLocaleString()}. Если автопилот работал, возобновите его для применения лимитов.`,
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

          {activeSection === 'model' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div>
                <h2 className="text-lg font-semibold text-text-primary">{tr('AI Model Settings', 'Настройки ИИ-модели')}</h2>
                <p className="text-sm text-text-secondary mt-1">{tr('Configuration of the Gemini agent that produces structured trade proposals.', 'Конфигурация агента Gemini, формирующего структурированные торговые предложения.')}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">{tr('Active Model', 'Активная модель')}</span>
                    <Badge variant="accent">gemini-3.5-flash-lite</Badge>
                  </div>
                  <div>
                    <div className="text-base font-bold text-text-primary">Google Gemini 3.5 Flash Lite</div>
                    <p className="text-xs text-text-secondary mt-1">
                      {tr('Configured via server environment (SOLVEX_GEMINI_MODEL). Produces structured proposals constrained by Pydantic schema.', 'Настроено через переменную окружения сервера (SOLVEX_GEMINI_MODEL). Выдаёт строго структурированные предложения по схеме Pydantic.')}
                    </p>
                  </div>
                  <div className="pt-3 border-t border-border-subtle flex justify-between text-xs">
                    <span className="text-text-muted">{tr('Output mode', 'Формат вывода')}</span>
                    <span className="font-mono text-text-primary">JSON Schema (Strict)</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-text-muted">{tr('Temperature', 'Температура')}</span>
                    <span className="font-mono text-text-primary">0.1 ({tr('Deterministic', 'Детерминированный')})</span>
                  </div>
                </Card>

                <Card className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">{tr('Fallback Mode', 'Резервный режим')}</span>
                    <Badge variant="positive">{tr('Allocation v1 Rules', 'Правила Allocation v1')}</Badge>
                  </div>
                  <div>
                    <div className="text-base font-bold text-text-primary">{tr('Fail-Closed Fallback', 'Защитное переключение')}</div>
                    <p className="text-xs text-text-secondary mt-1">
                      {tr('If the Gemini API key is unset or errors out, Solvex automatically falls back to rule-based allocation or HOLD. Execution never proceeds without verification.', 'Если ключ Gemini отсутствует или возвращает ошибку, Solvex автоматически переключается на правила Allocation v1 или HOLD. Исполнение никогда не происходит без проверки.')}
                    </p>
                  </div>
                  <div className="pt-3 border-t border-border-subtle flex justify-between text-xs">
                    <span className="text-text-muted">{tr('Default behavior on error', 'Поведение при ошибке')}</span>
                    <span className="font-mono text-warning">HOLD (No trade)</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-text-muted">{tr('Authority', 'Полномочия')}</span>
                    <span className="text-text-primary">{tr('Advisor only (No execution rights)', 'Только советник (без прав исполнения)')}</span>
                  </div>
                </Card>
              </div>

              <Card className="p-6 space-y-3 bg-bg-card border-border-subtle">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-muted">
                  <Info size={14} className="text-accent" />
                  {tr('Architecture Note: Server-Managed LLM', 'Архитектура: серверное управление LLM')}
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {tr('The Gemini API key is held securely in the backend environment and is never exposed to the client. Model parameters are version-controlled with the policy pipeline to maintain reproducibility across audit logs.', 'Ключ Gemini API хранится на бэкенде и никогда не передаётся в браузер. Параметры модели версионируются вместе с политиками для воспроизводимости журналов аудита.')}
                </p>
              </Card>
            </div>
          )}

          {activeSection === 'data' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div>
                <h2 className="text-lg font-semibold text-text-primary">{tr('Market Data Sources', 'Источники рыночных данных')}</h2>
                <p className="text-sm text-text-secondary mt-1">{tr('How pricing and volatility data are ingested, validated, and cached.', 'Как цены и данные о волатильности поступают, валидируются и кэшируются.')}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">{tr('Primary Provider', 'Основной провайдер')}</span>
                    <Badge variant="accent">CoinGecko API v3</Badge>
                  </div>
                  <div>
                    <div className="text-base font-bold text-text-primary">SOL/USD Live Feed</div>
                    <p className="text-xs text-text-secondary mt-1">
                      {tr('Queries CoinGecko simple price endpoint with 24h change and last updated timestamp.', 'Запрашивает котировки CoinGecko с 24-часовым изменением цены и меткой времени обновления.')}
                    </p>
                  </div>
                  <div className="pt-3 border-t border-border-subtle space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-text-muted">{tr('Cache TTL', 'Время кэша')}</span>
                      <span className="font-mono text-text-primary">60 {tr('seconds', 'секунд')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">{tr('Max data staleness', 'Макс. устаревание данных')}</span>
                      <span className="font-mono text-text-primary">180 {tr('seconds', 'секунд')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">{tr('Cooldown on failure', 'Пауза при ошибке')}</span>
                      <span className="font-mono text-text-primary">15 {tr('seconds', 'секунд')}</span>
                    </div>
                  </div>
                </Card>

                <Card className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">{tr('Data Integrity', 'Целостность данных')}</span>
                    <Badge variant="positive">{tr('Fail-Closed Gate', 'Запрет при ошибке')}</Badge>
                  </div>
                  <div>
                    <div className="text-base font-bold text-text-primary">{tr('Sanity & Freshness Checks', 'Проверки корректности')}</div>
                    <p className="text-xs text-text-secondary mt-1">
                      {tr('Before market data is accepted, the backend validates price positivity, finite values, and timestamp bounds.', 'Перед принятием рыночных данных сервер проверяет положительность цены, корректность чисел и диапазон времени.')}
                    </p>
                  </div>
                  <div className="pt-3 border-t border-border-subtle space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-text-muted">{tr('Stale data action', 'Действие при устаревании')}</span>
                      <span className="text-negative font-mono">MarketDataUnavailable</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">{tr('Pipeline reaction', 'Реакция пайплайна')}</span>
                      <span className="text-warning font-mono">Automatic HOLD</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">{tr('Endpoint', 'Эндпоинт')}</span>
                      <span className="font-mono text-accent">/api/v1/market/sol</span>
                    </div>
                  </div>
                </Card>
              </div>

              <Card className="p-6 space-y-3 bg-bg-card border-border-subtle">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-muted">
                  <Database size={14} className="text-accent" />
                  {tr('Oracle Roadmap', 'План по оракулам')}
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {tr('Currently, market data is ingested via an off-chain gateway to maintain high rate limits on Devnet. Pyth on-chain oracle feeds are supported by the Solana runtime and are scheduled for Mainnet deployment.', 'В Devnet котировки опрашиваются через серверный шлюз. Ончейн-оракулы Pyth запланированы для запуска в Mainnet.')}
                </p>
              </Card>
            </div>
          )}

          {activeSection === 'execution' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div>
                <h2 className="text-lg font-semibold text-text-primary">{tr('Execution Rules & Enforced Limits', 'Правила исполнения и лимиты')}</h2>
                <p className="text-sm text-text-secondary mt-1">{tr('Deterministic policy checks executed before any transaction is signed or simulated.', 'Детерминированные проверки политик перед любой подписью или симуляцией.')}</p>
              </div>

              <div className="space-y-4">
                <Card className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">{tr('Shariah Firewall (Version solvex-shariah-v0.1.0)', 'Shariah Firewall (Версия solvex-shariah-v0.1.0)')}</span>
                    <Badge variant="accent">3 Checks</Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 rounded-lg bg-bg-base border border-border-subtle space-y-1">
                      <div className="font-mono text-accent font-bold">SH-01-INTEREST</div>
                      <div className="text-text-primary font-medium">{tr('Zero Interest (Riba)', 'Запрет процентов (Риба)')}</div>
                      <div className="text-text-muted">{tr('Strict ban on lending pools and yield tokens earning interest.', 'Строгий запрет лендинг-пулов и доходных токенов.')}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-bg-base border border-border-subtle space-y-1">
                      <div className="font-mono text-accent font-bold">SH-02-LEVERAGE</div>
                      <div className="text-text-primary font-medium">{tr('Zero Leverage (Gharar)', 'Запрет плеча (Гарар)')}</div>
                      <div className="text-text-muted">{tr('Prohibits margin trading, borrowed capital, and perpetual contracts.', 'Запрет маржинальной торговли и бессрочных фьючерсов.')}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-bg-base border border-border-subtle space-y-1">
                      <div className="font-mono text-accent font-bold">SH-03-DERIVATIVE</div>
                      <div className="text-text-primary font-medium">{tr('Zero Derivatives (Maysir)', 'Запрет деривативов (Майсир)')}</div>
                      <div className="text-text-muted">{tr('Spot-only exchange; options, synthetic assets, and futures fail closed.', 'Только спот-обмен; опционы и синтетические активы запрещены.')}</div>
                    </div>
                  </div>
                </Card>

                <Card className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">{tr('Risk Engine (Version solvex-risk-v0.1.0)', 'Risk Engine (Версия solvex-risk-v0.1.0)')}</span>
                    <Badge variant="accent">7 Checks</Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 rounded-lg bg-bg-base border border-border-subtle space-y-1">
                      <div className="font-mono text-text-muted font-bold">RK-01</div>
                      <div className="text-text-primary font-medium">{tr('Agent Enabled', 'Агент активен')}</div>
                      <div className="text-text-muted">{tr('Blocks if agent paused.', 'Блокирует при паузе.')}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-bg-base border border-border-subtle space-y-1">
                      <div className="font-mono text-text-muted font-bold">RK-02</div>
                      <div className="text-text-primary font-medium">{tr('Principal Cap', 'Лимит депозита')}</div>
                      <div className="text-text-muted">{tr('Enforces total cap.', 'Проверяет общий лимит.')}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-bg-base border border-border-subtle space-y-1">
                      <div className="font-mono text-text-muted font-bold">RK-04</div>
                      <div className="text-text-primary font-medium">{tr('Single Trade', 'Лимит сделки')}</div>
                      <div className="text-text-muted">{tr('Max USD per order.', 'Макс. USD на ордер.')}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-bg-base border border-border-subtle space-y-1">
                      <div className="font-mono text-text-muted font-bold">RK-05</div>
                      <div className="text-text-primary font-medium">{tr('Daily Turnover', 'Дневной оборот')}</div>
                      <div className="text-text-muted">{tr('24h volume limit.', 'Лимит объёма за 24ч.')}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 rounded-lg bg-bg-base border border-border-subtle space-y-1">
                      <div className="font-mono text-text-muted font-bold">RK-03</div>
                      <div className="text-text-primary font-medium">{tr('Available Value', 'Доступный объём')}</div>
                      <div className="text-text-muted">{tr('Trade amount cannot exceed vault equity.', 'Размер сделки не может превышать стоимость хранилища.')}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-bg-base border border-border-subtle space-y-1">
                      <div className="font-mono text-text-muted font-bold">RK-06</div>
                      <div className="text-text-primary font-medium">{tr('Max Slippage BPS', 'Макс. проскальзывание')}</div>
                      <div className="text-text-muted">{tr('Enforces basis-point limits against price impact.', 'Ограничивает допустимое отклонение цены.')}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-bg-base border border-border-subtle space-y-1">
                      <div className="font-mono text-text-muted font-bold">RK-07</div>
                      <div className="text-text-primary font-medium">{tr('Drawdown Guard', 'Защита от просадки')}</div>
                      <div className="text-text-muted">{tr('Halts buys on drawdown; allows de-risking sells.', 'Блокирует покупки при просадке; разрешает защитные продажи.')}</div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {activeSection === 'notifications' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div>
                <h2 className="text-lg font-semibold text-text-primary">{tr('Notifications & Alerts', 'Уведомления и оповещения')}</h2>
                <p className="text-sm text-text-secondary mt-1">{tr('How you receive updates regarding rebalancing events, policy blocks, and errors.', 'Как вы получаете информацию о ребалансировках, блокировках и ошибках.')}</p>
              </div>

              <div className="space-y-4">
                <Card className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-positive/10 text-positive flex items-center justify-center">
                        <CheckCircle size={18} />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-text-primary">{tr('In-App Toast Notifications', 'Всплывающие уведомления в приложении')}</div>
                        <div className="text-xs text-text-secondary">{tr('Real-time feedback via Sonner toast manager.', 'Мгновенные уведомления о статусе через Sonner.')}</div>
                      </div>
                    </div>
                    <Badge variant="positive">{tr('Active', 'Активно')}</Badge>
                  </div>
                  <p className="text-xs text-text-secondary">
                    {tr('All transaction lifecycle events (wallet challenge sign-in, limit updates, pause states, virtual fills, and errors) deliver immediate visual toasts on the top right of the terminal.', 'Все события (вход по подписи, сохранение лимитов, смена паузы, сделки и ошибки) отображаются в реальном времени в правом верхнем углу интерфейса.')}
                  </p>
                </Card>

                <Card className="p-6 space-y-4 opacity-75">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-bg-elevated text-text-muted flex items-center justify-center">
                        <Bell size={18} />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-text-primary">{tr('Telegram & Webhook Alerts', 'Оповещения в Telegram и Webhook')}</div>
                        <div className="text-xs text-text-secondary">{tr('External notification delivery for autonomous events.', 'Внешняя доставка уведомлений об автономных событиях.')}</div>
                      </div>
                    </div>
                    <Badge variant="default">{tr('Roadmap (Post-Hackathon)', 'В разработке')}</Badge>
                  </div>
                  <p className="text-xs text-text-secondary">
                    {tr('External notification delivery via Telegram bots and custom webhooks is scheduled for the mainnet release. In the current Devnet release, all decision events are logged in the immutable Decision Log and Autopilot Journal.', 'Внешние уведомления через Telegram и вебхуки запланированы в релизе для Mainnet. В текущей версии для Devnet все события аудита фиксируются в Журнале решений и журнале Автопилота.')}
                  </p>
                </Card>
              </div>
            </div>
          )}

          {activeSection === 'keypair' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div>
                <h2 className="text-lg font-semibold text-text-primary">{tr('Agent Keypair & Signing Architecture', 'Ключ агента и архитектура подписи')}</h2>
                <p className="text-sm text-text-secondary mt-1">{tr('How cryptographic authorization is partitioned between vault owner and autonomous agent.', 'Как разделены криптографические права между владельцем хранилища и агентом.')}</p>
              </div>

              <div className="space-y-4">
                <Card className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">{tr('Designated Agent Public Key', 'Публичный ключ назначенного агента')}</span>
                    <Badge variant="solana">Solana Devnet</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-bg-base border border-border-subtle font-mono text-xs text-text-primary">
                    <span className="truncate mr-2">{SOLVEX_AGENT.toBase58()}</span>
                    <a
                      href={`https://explorer.solana.com/address/${SOLVEX_AGENT.toBase58()}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent hover:underline flex items-center gap-1 shrink-0"
                    >
                      {tr('Explorer', 'Explorer')} <ExternalLink size={12} />
                    </a>
                  </div>
                  <p className="text-xs text-text-secondary">
                    {tr('This public key is the designated agent authority configured in each on-chain vault PDA. It has restricted privileges: it can only propose swaps up to the owner-configured limit.', 'Этот публичный ключ является доверенным агентом в ончейн-программе Vault. Его полномочия ограничены: он может только инициировать обмен в пределах лимитов, заданных владельцем.')}
                  </p>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="p-6 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                      <Lock size={16} className="text-positive" />
                      {tr('Owner Authority (Your Wallet)', 'Полномочия владельца (Ваш кошелёк)')}
                    </div>
                    <ul className="space-y-2 text-xs text-text-secondary list-disc pl-4">
                      <li>{tr('Deposit & withdraw principal at any time', 'Внесение и вывод депозита в любой момент')}</li>
                      <li>{tr('Pause and unpause vault execution instantly', 'Мгновенная постановка и снятие хранилища с паузы')}</li>
                      <li>{tr('Configure maximum drawdown, trade size, and turnover', 'Настройка лимитов просадки, сделки и оборота')}</li>
                      <li>{tr('Replace or revoke the agent public key', 'Смена или полный отзыв ключа агента')}</li>
                    </ul>
                  </Card>

                  <Card className="p-6 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                      <Shield size={16} className="text-accent" />
                      {tr('Agent Limitations (Non-Custodial)', 'Ограничения агента (Некастодиально)')}
                    </div>
                    <ul className="space-y-2 text-xs text-text-secondary list-disc pl-4">
                      <li>{tr('CANNOT withdraw funds or change recipient accounts', 'НЕ МОЖЕТ выводить средства или менять получателя')}</li>
                      <li>{tr('CANNOT exceed single-trade or daily limits', 'НЕ МОЖЕТ превышать лимиты одной сделки и оборота')}</li>
                      <li>{tr('CANNOT trade when the vault is paused by owner', 'НЕ МОЖЕТ торговать, если хранилище на паузе')}</li>
                      <li>{tr('Private keys are stored in encrypted server HSM/env', 'Приватные ключи агента хранятся на сервере и недоступны в вебе')}</li>
                    </ul>
                  </Card>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
