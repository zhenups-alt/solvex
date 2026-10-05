import { Check } from 'lucide-react';
import { Badge, Card } from './UI';
import { localizeCode, useLanguage } from '../i18n';
import { PaperEvent } from '../lib/paperApi';

export default function PaperJournal({ events }: { events: PaperEvent[] }) {
  const { language, locale, tr } = useLanguage();
  const money = (value: string) => new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' }).format(Number(value));
  return <div className="space-y-4">{events.map((event) => <Card key={event.id} className="p-5 space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Badge variant={event.fill ? 'positive' : 'default'}>{event.fill ? tr('Virtual fill', 'Виртуальная сделка') : event.decision ? localizeCode(event.decision.status, language) : event.status === 'completed' ? tr('Completed', 'Завершено') : event.status}</Badge>
        <span className="font-semibold text-sm uppercase">{event.decision ? localizeCode(event.decision.proposal.action, language) : event.kind === 'completed' ? tr('Session ended', 'Сессия завершена') : event.kind.replaceAll('_', ' ')}</span>
      </div>
      <time className="text-xs text-text-muted">{new Date(event.at).toLocaleString(locale)}</time>
    </div>
    {event.decision && <p className="text-sm text-text-secondary">{event.decision.proposal.rationale}</p>}
    {event.message && <p className="text-sm text-warning">{event.kind === 'completed' ? tr('Session ended and archived at the last recorded price. No assets were sold.', 'Сессия завершена и сохранена по последней записанной цене. Активы не продавались.') : event.message}</p>}
    {event.fill && <p className="text-sm font-mono">{Number(event.fill.quantity_sol).toFixed(6)} SOL × {money(event.fill.price_usd)} · {tr('fees', 'комиссии')} {money(event.fill.fees_usd)} · {event.fill.source}</p>}
    {event.decision && <details className="text-xs">
      <summary className="cursor-pointer text-accent flex gap-2 items-center"><Check size={13} />{tr('Show sandbox policy and risk checks', 'Показать тестовые проверки политики и риска')}</summary>
      <div className="mt-3 grid md:grid-cols-2 gap-2">{[...event.decision.shariah.checks, ...event.decision.risk.checks].map((check, index) => <div key={`${check.code}-${index}`} className="rounded bg-bg-base p-3">
        <div className="flex justify-between gap-2"><span>{check.code}</span><span className={check.outcome === 'pass' ? 'text-positive' : 'text-warning'}>{localizeCode(check.outcome, language)}</span></div>
        <p className="mt-2 text-text-secondary">{check.message}</p>
      </div>)}</div>
    </details>}
  </Card>)}</div>;
}
