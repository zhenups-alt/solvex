import React from 'react';
import { Code, ArrowRight } from 'lucide-react';
import { Card } from '../components/UI';
import { useLanguage } from '../i18n';

export default function ArchitecturePage() {
  const { tr } = useLanguage();
  return (
    <div className="p-4 md:p-8 space-y-12">
      <header>
        <h1 className="text-2xl font-bold text-text-primary">{tr('System Architecture', 'Архитектура системы')}</h1>
        <p className="text-text-secondary mt-1">{tr('How untrusted AI proposals pass through deterministic policy and risk controls before Solana execution.', 'Как недоверенные предложения ИИ проходят детерминированные проверки политик и риска перед исполнением в Solana.')}</p>
      </header>

      {/* System Diagram */}
      <section className="space-y-6">
        <div className="grid grid-cols-1 gap-4">
          {[
            { layer: tr('Client', 'Клиент'), border: 'border-info', items: ['React + Vite', tr('Phantom Wallet', 'Кошелёк Phantom'), tr('Risk Configuration', 'Настройка риска'), tr('Decision Log', 'Журнал решений')] },
            { layer: tr('Backend', 'Сервер'), border: 'border-accent', items: ['FastAPI', tr('Gemini Proposal Adapter', 'Адаптер предложений Gemini'), 'Shariah Policy Engine', 'Risk Engine'] },
            { layer: tr('Execution Boundary', 'Контур исполнения'), border: 'border-solana', items: [tr('Simulation Gate', 'Шлюз симуляции'), 'Jupiter v6 CPI', tr('Agent Signer', 'Подпись агента'), tr('Fail-Closed Status', 'Запрет при ошибке')] },
            { layer: tr('Persistence + Chain', 'Хранение + блокчейн'), border: 'border-info', items: ['PostgreSQL / SQLAlchemy', tr('Per-User Vault PDA', 'PDA хранилища пользователя'), tr('SPL Token Custody', 'Хранение SPL-токенов'), tr('Decision Hash Event', 'Событие хеша решения')] },
          ].map((row, i) => (
            <div key={i} className="relative">
              <Card className={cn("border-l-4 p-6", row.border)}>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold uppercase tracking-widest text-text-muted">{row.layer}</span>
                </div>
                <div className="flex flex-wrap gap-3">
                  {row.items.map(item => (
                    <div key={item} className="px-4 py-2 bg-bg-elevated border border-border-default rounded text-sm text-text-primary font-medium">
                      {item}
                    </div>
                  ))}
                </div>
              </Card>
              {i < 3 && (
                <div className="flex justify-center py-2">
                  <ArrowRight size={16} className="rotate-90 text-border-strong" />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Smart Contract */}
      <section className="space-y-6">
        <h2 className="text-lg font-semibold text-text-primary">{tr('Anchor Program Structure', 'Структура Anchor-программы')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              fn: 'initialize_vault',
              code: 'pub fn initialize_vault(\n    ctx: Context<InitializeVault>,\n    agent: Pubkey,\n    limits: VaultLimits,\n) -> Result<()>',
              desc: tr('Creates a per-owner vault PDA and its base/quote custody accounts. Every new vault starts paused.', 'Создаёт PDA хранилища владельца и счета базового/котируемого токена. Новое хранилище всегда запускается на паузе.')
            },
            {
              fn: 'execute_jupiter_swap',
              code: 'pub fn execute_jupiter_swap(\n    ctx: Context<ExecuteJupiterSwap>,\n    args: SwapArgs,\n    instruction_data: Vec<u8>,\n) -> Result<()>',
              desc: tr('Allows only the configured agent, canonical Jupiter v6 program, configured pair, fresh quote, and trades inside hard limits.', 'Разрешает только настроенного агента, каноническую программу Jupiter v6, заданную пару, актуальную котировку и сделки в жёстких лимитах.')
            },
            {
              fn: 'withdraw_base / withdraw_quote',
              code: 'pub fn withdraw_base(\n    ctx: Context<WithdrawBase>,\n    amount: u64,\n) -> Result<()>',
              desc: tr('Only the vault owner can withdraw. The delegated agent is intentionally unable to transfer assets to arbitrary recipients.', 'Вывод доступен только владельцу. Агент намеренно не может переводить активы произвольным получателям.')
            }
          ].map((item, i) => (
            <Card key={i} className="space-y-4">
              <div className="flex items-center gap-2 text-accent">
                <Code size={16} />
                <span className="text-xs font-mono font-bold">{item.fn}</span>
              </div>
              <pre className="bg-bg-base p-3 rounded border border-border-subtle text-[11px] font-mono text-text-secondary leading-relaxed overflow-x-auto">
                {item.code}
              </pre>
              <p className="text-xs text-text-secondary leading-relaxed">{item.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Tech Stack */}
      <section className="space-y-6">
        <h2 className="text-lg font-semibold text-text-primary">{tr('Technology Stack', 'Технологический стек')}</h2>
        <Card className="p-0 overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[11px] text-text-muted uppercase tracking-wider border-b border-border-subtle">
                <th className="px-6 py-4 font-medium">{tr('Layer', 'Слой')}</th>
                <th className="px-6 py-4 font-medium">{tr('Technology', 'Технология')}</th>
                <th className="px-6 py-4 font-medium">{tr('Role', 'Роль')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {[
                { layer: tr('Smart Contract', 'Смарт-контракт'), tech: 'Anchor 0.31.1 / Rust', role: tr('Vault custody and on-chain execution constraints', 'Хранение активов и ончейн-ограничения исполнения') },
                { layer: tr('AI Adapter', 'ИИ-адаптер'), tech: 'Google Gen AI SDK', role: tr('Schema-constrained portfolio proposals', 'Предложения портфеля по строгой схеме') },
                { layer: tr('Backend', 'Сервер'), tech: 'Python / FastAPI / SQLAlchemy', role: tr('Policy, risk, orchestration, and audit trail', 'Политики, риск, оркестрация и журнал аудита') },
                { layer: tr('Database', 'База данных'), tech: 'PostgreSQL', role: tr('Profiles and explainable decision records', 'Профили и прозрачные записи решений') },
                { layer: tr('DEX Boundary', 'Контур DEX'), tech: 'Jupiter v6 CPI', role: tr('Constrained base/quote spot swap execution', 'Ограниченное исполнение спотовых обменов') },
              ].map((row, i) => (
                <tr key={i} className="text-sm">
                  <td className="px-6 py-4 text-text-primary font-medium">{row.layer}</td>
                  <td className="px-6 py-4 text-text-secondary">{row.tech}</td>
                  <td className="px-6 py-4 text-text-muted">{row.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
