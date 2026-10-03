import React, { useEffect, useMemo, useState } from 'react';
import { Copy, Download, Info, RefreshCw, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Badge, Button, Card } from '../components/UI';
import { usePhantom } from '../components/WalletContextProvider';
import { DecisionLogResponse, getDecisionLogs } from '../lib/solvexApi';
import { cn } from '../lib/utils';
import { localizeCode, useLanguage } from '../i18n';
import { Link } from 'react-router-dom';

const statusTone = (status: string) => {
  if (status === 'executed' || status === 'ready_for_execution') return 'text-positive';
  if (status.startsWith('blocked') || status === 'simulation_failed') return 'text-negative';
  return 'text-warning';
};

export default function DecisionLogPage() {
  const { address } = usePhantom();
  const { language, locale, tr } = useLanguage();
  const [items, setItems] = useState<DecisionLogResponse[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!address) {
      setItems([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await getDecisionLogs(address);
      setItems(response.items);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : tr('Could not load decisions', 'Не удалось загрузить решения'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) =>
      [
        item.id,
        item.status,
        item.proposal.action,
        item.proposal.input_asset,
        item.proposal.output_asset,
        item.proposal.rationale,
        ...item.proposal.key_signals,
      ].some((value) => value.toLowerCase().includes(query)),
    );
  }, [items, search]);

  const exportCsv = () => {
    if (!filtered.length) return;
    const escape = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
    const rows = [
      ['created_at', 'id', 'status', 'action', 'pair', 'amount_usd', 'shariah', 'risk'],
      ...filtered.map((item) => [
        item.created_at,
        item.id,
        item.status,
        item.proposal.action,
        `${item.proposal.input_asset}/${item.proposal.output_asset}`,
        item.proposal.amount_usd,
        item.shariah.status,
        item.risk.status,
      ]),
    ];
    const blob = new Blob([rows.map((row) => row.map(escape).join(',')).join('\n')], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `solvex-decisions-${address}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 md:p-8 space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-text-primary">{tr('Decision Log', 'Журнал решений')}</h1>
        <p className="text-text-secondary mt-1">{tr('Every proposal, policy check, simulation, and execution result in one audit trail.', 'Все предложения, проверки политик, симуляции и результаты исполнения собраны в едином журнале аудита.')}</p>
      </header>

      <Link to="/autopilot" className="block text-sm text-accent underline">{tr('Autopilot virtual trades have a separate journal →', 'Виртуальные сделки автопилота записываются в отдельный журнал →')}</Link>

      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="relative flex-1 max-w-2xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={tr('Search rationale, asset, status, or decision ID...', 'Поиск по обоснованию, активу, статусу или ID...')}
            className="w-full h-10 bg-bg-elevated border border-border-default rounded-md pl-10 pr-4 text-sm focus:outline-none focus:border-accent"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" disabled={!address || loading} onClick={() => void load()}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> {tr('Refresh', 'Обновить')}
          </Button>
          <Button variant="outline" className="gap-2" disabled={!filtered.length} onClick={exportCsv}>
            <Download size={16} /> {tr('Export CSV', 'Экспорт CSV')}
          </Button>
        </div>
      </div>

      <Card className="p-6 border-accent-border bg-accent-dim/5">
        <div className="flex items-start gap-4">
          <div className="w-8 h-8 rounded-full bg-accent-dim flex items-center justify-center text-accent shrink-0"><Info size={18} /></div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">{tr('Fail-closed audit trail', 'Журнал с запретом при неопределённости')}</h3>
            <p className="text-xs text-text-secondary leading-relaxed mt-2">
              {tr('Review and Blocked outcomes never reach execution. Transaction data appears only after a successful simulation and confirmed Solana transaction.', 'Результаты Review и Blocked никогда не доходят до исполнения. Данные транзакции появляются только после успешной симуляции и подтверждения в Solana.')}
            </p>
          </div>
        </div>
      </Card>

      {!address && <Card className="p-8 text-center text-sm text-text-secondary">{tr('Connect Phantom to load the decision log bound to your wallet.', 'Подключите Phantom, чтобы загрузить журнал решений вашего кошелька.')}</Card>}
      {error && <Card className="p-6 border-negative/40 text-sm text-negative">{error}</Card>}

      {address && !error && (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[11px] text-text-muted uppercase tracking-wider border-b border-border-subtle">
                  <th className="px-6 py-4 font-medium">{tr('Time', 'Время')}</th>
                  <th className="px-6 py-4 font-medium">{tr('Action', 'Действие')}</th>
                  <th className="px-6 py-4 font-medium">{tr('Pair', 'Пара')}</th>
                  <th className="px-6 py-4 font-medium">{tr('Amount', 'Сумма')}</th>
                  <th className="px-6 py-4 font-medium">{tr('Shariah', 'Шариат')}</th>
                  <th className="px-6 py-4 font-medium">{tr('Risk', 'Риск')}</th>
                  <th className="px-6 py-4 font-medium">{tr('Status', 'Статус')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {!loading && filtered.length === 0 && (
                  <tr><td colSpan={7} className="px-6 py-12 text-center text-sm text-text-muted">{tr('No recorded decisions for this wallet.', 'Для этого кошелька пока нет записанных решений.')}</td></tr>
                )}
                {filtered.map((row) => (
                  <React.Fragment key={row.id}>
                    <tr
                      onClick={() => setExpandedId(expandedId === row.id ? null : row.id)}
                      className={cn('text-sm hover:bg-bg-subtle transition-colors cursor-pointer', expandedId === row.id && 'bg-bg-subtle')}
                    >
                      <td className="px-6 py-4 text-text-secondary">{new Date(row.created_at).toLocaleString(locale)}</td>
                      <td className="px-6 py-4 uppercase text-xs font-bold">{localizeCode(row.proposal.action, language)}</td>
                      <td className="px-6 py-4 font-mono">{row.proposal.input_asset || '—'} → {row.proposal.output_asset || '—'}</td>
                      <td className="px-6 py-4 font-mono">${Number(row.proposal.amount_usd).toLocaleString()}</td>
                      <td className="px-6 py-4"><Badge>{localizeCode(row.shariah.status, language)}</Badge></td>
                      <td className="px-6 py-4"><Badge>{localizeCode(row.risk.status, language)}</Badge></td>
                      <td className={cn('px-6 py-4 text-xs font-bold uppercase', statusTone(row.status))}>{localizeCode(row.status, language)}</td>
                    </tr>
                    {expandedId === row.id && (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 bg-bg-subtle/50 border-y border-border-subtle">
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <section>
                              <h4 className="text-[11px] uppercase tracking-wider text-text-muted font-semibold mb-3">{tr('AI proposal', 'Предложение ИИ')}</h4>
                              <p className="text-sm text-text-secondary leading-relaxed">{row.proposal.rationale}</p>
                              <div className="flex flex-wrap gap-2 mt-4">{row.proposal.key_signals.map((signal) => <Badge key={signal}>{signal}</Badge>)}</div>
                            </section>
                            <CheckList title={`${tr('Shariah', 'Шариат')} · ${row.shariah.methodology_version}`} checks={row.shariah.checks} />
                            <CheckList title={`${tr('Risk', 'Риск')} · ${row.risk.methodology_version}`} checks={row.risk.checks} />
                          </div>
                          <button
                            className="mt-6 flex items-center gap-2 text-xs font-mono text-text-muted hover:text-accent"
                            onClick={(event) => {
                              event.stopPropagation();
                              void navigator.clipboard.writeText(row.id);
                              toast.success(tr('Decision ID copied', 'ID решения скопирован'));
                            }}
                          >
                            <Copy size={13} /> {row.id}
                          </button>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function CheckList({ title, checks }: { title: string; checks: DecisionLogResponse['risk']['checks'] }) {
  const { language } = useLanguage();
  return (
    <section>
      <h4 className="text-[11px] uppercase tracking-wider text-text-muted font-semibold mb-3">{title}</h4>
      <div className="space-y-3">
        {checks.map((check) => (
          <div key={check.code} className="rounded border border-border-subtle bg-bg-base p-3">
            <div className="flex justify-between gap-3 text-xs"><span className="font-mono">{check.code}</span><span className={statusTone(check.outcome === 'fail' ? 'blocked' : check.outcome)}>{localizeCode(check.outcome, language)}</span></div>
            <p className="text-xs text-text-secondary mt-2">{check.message}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
