import { useEffect, useMemo, useState } from 'react';
import { Activity, Bot, Shield, Wallet } from 'lucide-react';
import { Badge, Card } from '../components/UI';
import { usePhantom } from '../components/WalletContextProvider';
import { DecisionLogResponse, getDecisionLogs } from '../lib/solvexApi';
import { truncateAddress } from '../lib/utils';
import { useStore } from '../store';
import { Link } from 'react-router-dom';
import { localizeCode, useLanguage } from '../i18n';

export default function Dashboard() {
  const { address, balance, network } = usePhantom();
  const { config } = useStore();
  const { language, locale, tr } = useLanguage();
  const [decisions, setDecisions] = useState<DecisionLogResponse[]>([]);

  useEffect(() => {
    if (!address) {
      setDecisions([]);
      return;
    }
    getDecisionLogs(address, 20).then((response) => setDecisions(response.items)).catch(() => setDecisions([]));
  }, [address]);

  const latest = decisions[0];
  const blocked = useMemo(() => decisions.filter((item) => item.status.startsWith('blocked')).length, [decisions]);

  return (
    <div className="space-y-8 p-4 md:p-8">
      <header className="flex flex-wrap justify-between gap-4 items-end">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{address ? tr(`Vault for ${truncateAddress(address)}`, `Хранилище ${truncateAddress(address)}`) : tr('Solvex Dashboard', 'Панель Solvex')}</h1>
          <p className="text-text-secondary mt-1">{tr('Live wallet state and persisted policy decisions. No demo balances are shown.', 'Актуальное состояние кошелька и сохранённые решения системы. Демонстрационные балансы не используются.')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link to="/agent-config?section=risk" className="inline-flex h-9 items-center rounded-md bg-accent px-4 text-sm font-semibold text-bg-base hover:brightness-110">
            {tr('Set agent limits', 'Настроить лимиты агента')}
          </Link>
          <Badge variant={address ? 'positive' : 'warning'}>{address ? tr(`${network} connected`, `${network} подключена`) : tr('wallet disconnected', 'кошелёк не подключён')}</Badge>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Metric icon={Wallet} label={tr('Wallet balance', 'Баланс кошелька')} value={balance == null ? '—' : `${balance.toFixed(4)} SOL`} note={tr('Read directly from Solana RPC', 'Получен напрямую через Solana RPC')} />
        <Metric icon={Shield} label={tr('Investment cap', 'Лимит инвестиций')} value={`$${config.investmentCapUsd.toLocaleString(locale)}`} note={tr('Deterministic backend limit', 'Жёсткий лимит на сервере')} />
        <Metric icon={Activity} label={tr('Recorded decisions', 'Записано решений')} value={String(decisions.length)} note={tr(`${blocked} stopped by policy or risk`, `${blocked} остановлено политикой или риском`)} />
        <Metric icon={Bot} label={tr('Execution mode', 'Режим исполнения')} value={tr('Fail-closed', 'Запрет при ошибке')} note={tr('Live execution remains disabled until deployment', 'Реальные сделки пока отключены')} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-md font-semibold text-text-primary mb-5">{tr('Latest decision', 'Последнее решение')}</h2>
          {!latest ? (
            <p className="text-sm text-text-muted">{tr('No decisions recorded for this wallet yet.', 'Для этого кошелька пока нет решений.')}</p>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-3">
                <Badge>{localizeCode(latest.proposal.action, language)}</Badge>
                <span className="font-mono text-sm">{latest.proposal.input_asset || '—'} → {latest.proposal.output_asset || '—'}</span>
                <span className="text-xs text-text-muted">{new Date(latest.created_at).toLocaleString(locale)}</span>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed">{latest.proposal.rationale}</p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <StatusBox label={tr('Shariah screen', 'Проверка Шариата')} value={localizeCode(latest.shariah.status, language)} version={latest.shariah.methodology_version} />
                <StatusBox label={tr('Risk screen', 'Проверка риска')} value={localizeCode(latest.risk.status, language)} version={latest.risk.methodology_version} />
              </div>
              <div className="rounded border border-border-subtle bg-bg-elevated p-3 text-xs text-text-secondary">
                {tr('Result:', 'Результат:')} <span className="font-mono text-text-primary">{localizeCode(latest.status, language)}</span>
              </div>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="text-md font-semibold text-text-primary mb-5">{tr('Autonomy boundary', 'Границы автономности')}</h2>
          <div className="space-y-4 text-sm text-text-secondary">
            <BoundaryRow text={tr('AI generates a structured proposal; it cannot approve itself.', 'ИИ формирует предложение, но не может сам его одобрить.')} />
            <BoundaryRow text={tr('Eligible, Review, and Blocked are methodology outcomes—not halal claims.', 'Eligible, Review и Blocked — результаты методологии, а не заявление о халяльности.')} />
            <BoundaryRow text={tr('The owner can pause the vault or revoke the agent at any time.', 'Владелец может в любой момент приостановить хранилище или отозвать права агента.')} />
            <BoundaryRow text={tr('The agent cannot withdraw; Jupiter swaps are limited to configured custody accounts.', 'Агент не может выводить средства; обмены Jupiter ограничены настроенными счетами хранилища.')} />
          </div>
        </Card>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="p-6 border-b border-border-subtle">
          <h2 className="text-md font-semibold text-text-primary">{tr('Recent decisions', 'Последние решения')}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead><tr className="text-[11px] text-text-muted uppercase tracking-wider border-b border-border-subtle"><th className="px-6 py-4">{tr('Time', 'Время')}</th><th className="px-6 py-4">{tr('Action', 'Действие')}</th><th className="px-6 py-4">{tr('Amount', 'Сумма')}</th><th className="px-6 py-4">{tr('Shariah', 'Шариат')}</th><th className="px-6 py-4">{tr('Risk', 'Риск')}</th><th className="px-6 py-4">{tr('Result', 'Результат')}</th></tr></thead>
            <tbody className="divide-y divide-border-subtle">
              {decisions.slice(0, 8).map((row) => (
                <tr key={row.id} className="text-sm">
                  <td className="px-6 py-4 text-text-secondary">{new Date(row.created_at).toLocaleString(locale)}</td>
                  <td className="px-6 py-4 uppercase text-xs font-bold">{localizeCode(row.proposal.action, language)}</td>
                  <td className="px-6 py-4 font-mono">${Number(row.proposal.amount_usd).toLocaleString(locale)}</td>
                  <td className="px-6 py-4">{localizeCode(row.shariah.status, language)}</td>
                  <td className="px-6 py-4">{localizeCode(row.risk.status, language)}</td>
                  <td className="px-6 py-4 font-mono text-xs">{localizeCode(row.status, language)}</td>
                </tr>
              ))}
              {!decisions.length && <tr><td colSpan={6} className="px-6 py-10 text-center text-sm text-text-muted">{tr('Connect a wallet and run an analysis to populate this table.', 'Подключите кошелёк и запустите анализ, чтобы здесь появились решения.')}</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Metric({ icon: Icon, label, value, note }: { icon: typeof Wallet; label: string; value: string; note: string }) {
  return <Card><div className="flex justify-between gap-4"><div><div className="text-xs text-text-muted uppercase tracking-wider">{label}</div><div className="text-2xl font-mono font-bold text-text-primary mt-3">{value}</div><div className="text-[11px] text-text-secondary mt-2">{note}</div></div><Icon size={20} className="text-accent" /></div></Card>;
}

function StatusBox({ label, value, version }: { label: string; value: string; version: string }) {
  return <div className="rounded border border-border-subtle bg-bg-elevated p-3"><div className="text-text-muted">{label}</div><div className="font-mono uppercase text-text-primary mt-1">{value}</div><div className="text-text-muted mt-1">{version}</div></div>;
}

function BoundaryRow({ text }: { text: string }) {
  return <div className="flex gap-3"><span className="mt-1.5 h-2 w-2 rounded-full bg-accent shrink-0" /><span>{text}</span></div>;
}
