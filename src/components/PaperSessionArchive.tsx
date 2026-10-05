import { useEffect, useState } from 'react';
import { Archive, Download } from 'lucide-react';
import { Badge, Button, Card } from './UI';
import PaperJournal from './PaperJournal';
import { useLanguage } from '../i18n';
import { getPaperEvents, getPaperSessions, PaperEvent, PaperSession } from '../lib/paperApi';

export default function PaperSessionArchive({ wallet, refreshKey }: { wallet: string; refreshKey: number }) {
  const { locale, tr } = useLanguage();
  const [sessions, setSessions] = useState<PaperSession[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const money = (value: string) => new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' }).format(Number(value));

  useEffect(() => {
    let alive = true;
    setLoading(true); setError(null);
    getPaperSessions(wallet).then((page) => {
      if (alive) { setSessions(page.items); setCursor(page.next_before_version); }
    }).catch((failure) => { if (alive) setError(failure.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [wallet, refreshKey, retry]);

  const loadMore = async () => {
    if (cursor === null) return;
    setLoading(true); setError(null);
    try {
      const page = await getPaperSessions(wallet, cursor);
      setSessions((old) => [...old, ...page.items]); setCursor(page.next_before_version);
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to load archive'); }
    finally { setLoading(false); }
  };

  return <section className="space-y-4" aria-label={tr('Completed sessions', 'Завершённые сессии')}>
    <h2 className="text-lg font-semibold flex gap-2 items-center"><Archive size={18} />{tr('Completed sessions', 'Завершённые сессии')}</h2>
    <p className="text-xs text-text-muted">{tr('Archived snapshots use the last recorded market price, not a closing sale. History stays separate from every new portfolio.', 'Архив хранит результат по последней записанной цене, а не результат продажи. История каждой сессии отделена от нового портфеля.')}</p>
    {error && <p role="alert" className="text-negative text-sm">{error} <button className="underline" onClick={() => setRetry((value) => value + 1)}>{tr('Retry', 'Повторить')}</button></p>}
    {!loading && !error && sessions.length === 0 && <p className="text-sm text-text-muted">{tr('No completed sessions yet.', 'Завершённых сессий пока нет.')}</p>}
    {sessions.map((session) => <Card key={session.id} className="p-5 space-y-3">
      <div className="flex flex-wrap gap-3 justify-between"><Badge>{tr('Completed', 'Завершено')}</Badge><time className="text-xs text-text-muted">{new Date(session.completed_at).toLocaleString(locale)}</time></div>
      <div className="grid sm:grid-cols-3 gap-3 text-sm">
        <p>{tr('Started with', 'Начальная сумма')}: <strong>{money(session.snapshot.state.initial_usd)}</strong></p>
        <p>{tr('Final recorded value', 'Итоговая записанная стоимость')}: <strong>{money(session.snapshot.metrics.equity_usd)}</strong></p>
        <p>{tr('Virtual P&L', 'Виртуальная прибыль / убыток')}: <strong>{money(session.snapshot.metrics.total_pnl_usd)}</strong></p>
      </div>
      <p className="text-xs text-text-secondary">{session.snapshot.state.decision_source === 'gemini' ? 'Gemini + Allocation v1' : 'Allocation v1'} · {tr('Interval', 'Интервал')}: {session.snapshot.state.interval_seconds / 60} {tr('min', 'мин')} · {tr('Cycles / fills', 'Циклы / сделки')}: {session.snapshot.state.cycle_count} / {session.snapshot.state.trade_count}</p>
      <p className="text-xs text-text-muted">{tr('Virtual cash', 'Виртуальные доллары')}: {money(session.snapshot.state.cash_usd)} · {tr('Virtual SOL', 'Виртуальные SOL')}: {Number(session.snapshot.state.sol_quantity).toFixed(6)} SOL</p>
      <p className="text-xs text-text-muted">{tr('Valuation price recorded at', 'Цена для оценки записана')}: {session.snapshot.state.last_mark_at ? new Date(session.snapshot.state.last_mark_at).toLocaleString(locale) : tr('No market price recorded', 'Рыночная цена ещё не записана')}</p>
      <ArchivedJournal wallet={wallet} session={session} />
    </Card>)}
    {loading && <p role="status" className="text-sm text-text-muted">{tr('Loading archive…', 'Загрузка архива…')}</p>}
    {cursor !== null && <Button variant="outline" disabled={loading} onClick={() => void loadMore()}>{tr('Older sessions', 'Предыдущие сессии')}</Button>}
  </section>;
}

function ArchivedJournal({ wallet, session }: { wallet: string; session: PaperSession }) {
  const { tr } = useLanguage();
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState<PaperEvent[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (before?: number) => {
    setLoading(true); setError(null);
    try {
      const page = await getPaperEvents(wallet, session.id, before);
      setEvents((old) => before === undefined ? page.items : [...old, ...page.items]);
      setCursor(page.next_before_version); setLoaded(true);
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to load history'); }
    finally { setLoading(false); }
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ session, events, has_older_events: cursor !== null }, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url; link.download = `solvex-session-${session.id}.json`; link.click();
    URL.revokeObjectURL(url);
  };
  return <div className="space-y-3">
    <Button size="sm" variant="outline" aria-expanded={open} onClick={() => { setOpen(!open); if (!open && !loaded && !loading) void load(); }}>{open ? tr('Hide session history', 'Скрыть историю сессии') : tr('Show session history', 'Показать историю сессии')}</Button>
    {open && <>
      {error && <p role="alert" className="text-sm text-negative">{error} <button className="underline" onClick={() => void load(loaded && cursor !== null ? cursor : undefined)}>{tr('Retry', 'Повторить')}</button></p>}
      <PaperJournal events={events} />
      {loading && <p role="status" className="text-sm text-text-muted">{tr('Loading history…', 'Загрузка истории…')}</p>}
      <div className="flex flex-wrap gap-3">
        {cursor !== null && <Button variant="outline" size="sm" disabled={loading} onClick={() => void load(cursor)}>{tr('Load older events', 'Загрузить предыдущие события')}</Button>}
        {loaded && <Button variant="outline" size="sm" className="gap-2" onClick={download}><Download size={14} />{tr('Export loaded events', 'Скачать загруженные события')}</Button>}
      </div>
    </>}
  </div>;
}
