import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bot, Check, Download, LoaderCircle, Pause, Play, RefreshCw, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Badge, Button, Card } from '../components/UI';
import { usePhantom } from '../components/WalletContextProvider';
import { localizeCode, useLanguage } from '../i18n';
import { ApiError, ensureWalletSession, getRiskProfile, hasWalletSession, RiskProfileResponse } from '../lib/solvexApi';
import { controlPaper, getPaperAccount, getPaperEvents, PaperAccount, PaperEvent, startPaper } from '../lib/paperApi';

export default function Autopilot() {
  const { address, signMessage, connect } = usePhantom();
  const currentWallet = useRef(address);
  currentWallet.current = address;
  const { language, locale, tr } = useLanguage();
  const [signedIn, setSignedIn] = useState(false);
  const [account, setAccount] = useState<PaperAccount | null>(null);
  const [events, setEvents] = useState<PaperEvent[]>([]);
  const [profile, setProfile] = useState<RiskProfileResponse | null>(null);
  const [initial, setInitial] = useState('100');
  const [interval, setIntervalValue] = useState(300);
  const [decisionSource, setDecisionSource] = useState<'allocation' | 'gemini'>('allocation');
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [now, setNow] = useState(Date.now());
  const money = (value: string | number) => new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' }).format(Number(value));
  const timestamp = (value: string | null) => value ? new Date(value).toLocaleString(locale) : '—';

  useEffect(() => {
    setAccount(null); setEvents([]); setProfile(null); setError(null); setLoaded(false);
    setSignedIn(Boolean(address && hasWalletSession(address)));
    if (!address) return;
    let alive = true;
    getRiskProfile(address).then((saved) => {
      if (!alive) return;
      setProfile(saved); setInitial(String(Math.min(100, Number(saved.investment_cap_usd))));
    }).catch((failure) => {
      if (alive && !(failure instanceof ApiError && failure.status === 404)) setError(failure.message);
    });
    return () => { alive = false; };
  }, [address]);

  useEffect(() => {
    if (!address || !signedIn) return;
    let alive = true;
    let pending = false;
    const load = async () => {
      if (pending) return;
      pending = true;
      try {
        const [portfolio, history] = await Promise.all([getPaperAccount(address), getPaperEvents(address)]);
        if (!alive) return;
        setAccount(portfolio.account); setEvents(history.items); setError(null); setLoaded(true);
      } catch (failure) {
        if (!alive) return;
        if (failure instanceof ApiError && failure.status === 401) setSignedIn(false);
        setError(failure instanceof Error ? failure.message : 'Unable to load portfolio');
      } finally { pending = false; }
    };
    void load();
    const poll = window.setInterval(() => { setNow(Date.now()); void load(); }, 5000);
    return () => { alive = false; window.clearInterval(poll); };
  }, [address, signedIn, refreshKey]);

  const act = async (operation: () => Promise<void>) => {
    if (!address) return;
    setBusy(true); setError(null);
    try {
      await ensureWalletSession(address, signMessage);
      if (currentWallet.current !== address) return;
      setSignedIn(true);
      await operation();
      if (currentWallet.current !== address) return;
      setRefreshKey((key) => key + 1);
    } catch (failure) {
      if (currentWallet.current === address) setError(failure instanceof Error ? failure.message : 'Request failed');
    } finally { setBusy(false); }
  };

  const start = () => act(async () => {
    const amount = Number(initial);
    if (!Number.isFinite(amount) || amount <= 0 || !profile || amount > Number(profile.investment_cap_usd)) {
      throw new Error(tr('Enter a virtual balance within your saved investment cap.', 'Укажите виртуальную сумму в пределах сохранённого лимита.'));
    }
    const response = await startPaper(address!, amount, interval, decisionSource, language);
    if (currentWallet.current !== address) return;
    setAccount(response.account);
    toast.success(tr('Autopilot started. The first cycle will run in a few seconds.', 'Автопилот запущен. Первый цикл начнётся через несколько секунд.'));
  });

  const control = (action: 'pause' | 'resume' | 'run-now') => act(async () => {
    const result = await controlPaper(address!, action);
    if (action === 'run-now' && !result.processed) toast(tr('The next cycle is not due yet, or another worker completed it.', 'Время следующего цикла ещё не наступило или он уже выполнен.'));
  });

  const exportLog = () => {
    const blob = new Blob([JSON.stringify({ account, events }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `solvex-paper-${address}.json`; link.click();
    URL.revokeObjectURL(url);
  };

  const pnl = Number(account?.metrics.total_pnl_usd ?? 0);
  const priceStale = account?.state.last_mark_at ? now - Date.parse(account.state.last_mark_at) > 180_000 : true;
  const nextSeconds = account ? Math.max(0, Math.ceil((Date.parse(account.next_run_at) - now) / 1000)) : 0;

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div><h1 className="text-2xl font-bold flex items-center gap-3"><Bot className="text-accent" />{tr('Autopilot', 'Автопилот')}</h1>
          <p className="text-text-secondary mt-2">{tr('An automatic virtual portfolio, with real SOL prices and a record of every decision.', 'Автоматический виртуальный портфель с реальными ценами SOL и журналом каждого решения.')}</p></div>
        <Badge variant="warning">{tr('Paper trading · no real funds', 'Виртуальная торговля · без реальных средств')}</Badge>
      </header>

      <Card className="p-5 border-accent/30 bg-accent/5 text-sm text-text-secondary space-y-2">
        <p className="text-text-primary font-semibold">{tr('Your Devnet vault and this portfolio are separate.', 'Devnet-хранилище и этот портфель учитываются отдельно.')}</p>
        <p>{tr('Start with virtual dollars. The server buys and sells virtual SOL to maintain a target allocation. Closing the page does not stop it; the backend must stay running.', 'Начните с виртуальных долларов. Сервер покупает и продаёт виртуальные SOL, поддерживая целевую долю. Закрытие страницы не останавливает работу; сервер должен оставаться запущенным.')}</p>
        <p>{tr('Fills are estimates from market prices, not Jupiter transactions. Virtual USD is not USDC; USDC remains Review for live trading. This sandbox is not Shariah certification.', 'Сделки рассчитываются по рыночным ценам и не являются транзакциями Jupiter. Виртуальный USD — не USDC; для реальных сделок USDC остаётся Review. Тестовый режим не является Shariah-сертификацией.')}</p>
      </Card>

      {error && <div role="alert" className="rounded-xl border border-negative/30 p-4 text-sm text-negative flex flex-wrap gap-3 justify-between"><span>{error}</span><button className="underline" onClick={() => setRefreshKey((key) => key + 1)}>{tr('Retry', 'Повторить')}</button></div>}

      {!address ? <Card className="p-8 space-y-4"><h2 className="font-semibold">{tr('Connect your wallet to begin', 'Подключите кошелёк для начала')}</h2><p className="text-sm text-text-secondary">{tr('No deposit is needed for the virtual portfolio.', 'Для виртуального портфеля депозит не нужен.')}</p><Button onClick={() => void connect()}>{tr('Connect Phantom', 'Подключить Phantom')}</Button></Card>
      : !signedIn ? <Card className="p-8 space-y-4"><h2 className="font-semibold">{tr('Verify wallet ownership', 'Подтвердите владение кошельком')}</h2><p className="text-sm text-text-secondary">{tr('Sign a free sign-in message in Phantom. It lets you manage your agent and does not transfer funds.', 'Подпишите бесплатное сообщение входа в Phantom. Оно даёт доступ к управлению агентом и не переводит средства.')}</p><Button disabled={busy} onClick={() => void act(async () => {})}>{busy ? tr('Waiting for signature…', 'Ожидаем подпись…') : tr('Sign in with Phantom', 'Войти через Phantom')}</Button></Card>
      : !loaded ? <div className="p-8 flex items-center gap-3 text-text-secondary"><LoaderCircle className="animate-spin" size={18} />{tr('Loading portfolio…', 'Загрузка портфеля…')}</div>
      : !account ? <Card className="p-6 space-y-5">
        <h2 className="font-semibold text-lg">{tr('Start a virtual portfolio', 'Запустить виртуальный портфель')}</h2>
        {!profile ? <p className="text-sm text-warning">{tr('Save your agent limits first.', 'Сначала сохраните лимиты агента.')} <Link className="underline" to="/agent-config?section=risk">{tr('Open limits →', 'Открыть лимиты →')}</Link></p> : <p className="text-sm text-text-secondary">{tr('Saved profile:', 'Сохранённый профиль:')} {profile.risk_level} · {tr('cap', 'лимит')} {money(profile.investment_cap_usd)} · {tr('per trade', 'на сделку')} {money(profile.max_single_trade_usd)}</p>}
        <div className="grid sm:grid-cols-2 gap-5">
          <label className="space-y-2 text-sm"><span>{tr('Starting virtual balance (USD)', 'Начальная виртуальная сумма (USD)')}</span><input aria-label={tr('Starting virtual balance', 'Начальная виртуальная сумма')} type="number" min="1" max={profile?.investment_cap_usd} value={initial} onChange={(event) => setInitial(event.target.value)} className="block w-full rounded-lg border border-border-default bg-bg-base p-3" /></label>
          <label className="space-y-2 text-sm"><span>{tr('Check portfolio every', 'Проверять портфель каждые')}</span><select value={interval} onChange={(event) => setIntervalValue(Number(event.target.value))} className="block w-full rounded-lg border border-border-default bg-bg-base p-3"><option value={60}>{tr('1 minute', '1 минуту')}</option><option value={300}>{tr('5 minutes', '5 минут')}</option><option value={900}>{tr('15 minutes', '15 минут')}</option><option value={3600}>{tr('1 hour', '1 час')}</option></select></label>
        </div>
        <label className="block space-y-2 text-sm"><span>{tr('Decision source', 'Источник решений')}</span><select value={decisionSource} onChange={(event) => setDecisionSource(event.target.value as 'allocation' | 'gemini')} className="block w-full rounded-lg border border-border-default bg-bg-base p-3"><option value="allocation">{tr('Allocation rules · no AI API calls', 'Правила распределения · без вызовов ИИ')}</option><option value="gemini">{tr('Gemini · recommendations within strategy limits', 'Gemini · рекомендации в пределах стратегии')}</option></select></label>
        <p className="text-sm text-text-secondary">{tr('Allocation v1 targets 30% / 50% / 70% SOL for Conservative / Balanced / Growth. It rebalances at a 5-point deviation and reduces exposure when your drawdown limit is exceeded. In Gemini mode the model can propose a smaller permitted trade or HOLD; every proposal is checked independently.', 'Allocation v1 поддерживает 30% / 50% / 70% SOL для Conservative / Balanced / Growth. Ребалансировка начинается при отклонении на 5 п.п., а при превышении просадки доля SOL снижается. В режиме Gemini модель может предложить допустимую сделку меньшего объёма или HOLD; каждое предложение проверяется независимо.')}</p>
        {decisionSource === 'gemini' && <p className="text-xs text-warning">{tr('Uses your configured Gemini API and may incur API charges. Missing, invalid or late AI responses result in no trade.', 'Использует настроенный Gemini API; возможны расходы на API. При отсутствии, ошибке или задержке ответа ИИ сделка не проводится.')}</p>}
        <p className="text-xs text-text-muted">{tr('Estimated costs per fill: 0.10% fee + $0.01, plus 0.10% adverse slippage. Paper results do not predict live returns.', 'Расчётные издержки сделки: комиссия 0,10% + $0,01 и неблагоприятное проскальзывание 0,10%. Тестовые результаты не предсказывают реальную доходность.')}</p>
        <label className="flex gap-3 items-start text-sm"><input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} className="mt-1" />{tr('I understand this starts a virtual strategy test, with no deposit and no real trading.', 'Я понимаю, что запускаю виртуальную проверку стратегии без депозита и реальной торговли.')}</label>
        <Button disabled={busy || !profile || !acknowledged} className="gap-2" onClick={() => void start()}><Play size={16} />{tr('Start Autopilot', 'Запустить автопилот')}</Button>
      </Card> : <>
        <Card className="p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2"><Badge variant={account.status === 'running' ? 'positive' : 'warning'}>{account.status === 'running' ? tr('Running on server', 'Работает на сервере') : tr('Paused', 'На паузе')}</Badge><p className="text-xs text-text-secondary">{tr('Last cycle:', 'Последний цикл:')} {timestamp(account.state.last_cycle_at)} · {account.status === 'running' ? tr(`Next check in ~${nextSeconds}s`, `Следующая проверка через ~${nextSeconds} с`) : tr('Resume to continue', 'Возобновите для продолжения')}</p></div>
          <div className="flex flex-wrap gap-2"><Button disabled={busy} className="gap-2" onClick={() => void control(account.status === 'running' ? 'pause' : 'resume')}>{account.status === 'running' ? <Pause size={15} /> : <Play size={15} />}{account.status === 'running' ? tr('Pause agent', 'Остановить агента') : tr('Resume agent', 'Возобновить агента')}</Button><Button variant="outline" disabled={busy || account.status !== 'running' || nextSeconds > 0} onClick={() => void control('run-now')}>{tr('Run due cycle', 'Выполнить наступивший цикл')}</Button><Button variant="outline" aria-label={tr('Refresh portfolio', 'Обновить портфель')} onClick={() => setRefreshKey((key) => key + 1)}><RefreshCw size={15} /></Button></div>
        </Card>
        {account.state.last_error && <p role="status" className="text-warning text-sm">{account.state.last_error}</p>}
        <p className="text-xs text-text-muted">{tr('Decision source:', 'Источник решений:')} {account.state.decision_source === 'gemini' ? 'Gemini + Allocation v1' : 'Allocation v1'}</p>
        <p className="text-xs text-text-muted">{tr('Market price timestamp:', 'Время рыночной цены:')} {timestamp(account.state.last_mark_at)}</p>
        {priceStale && <p className="text-warning text-sm">{tr('Waiting for a fresh market price. Valuation below uses the last recorded price.', 'Ожидаем свежую рыночную цену. Оценка ниже рассчитана по последней записанной цене.')}</p>}
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <Stat title={tr('Virtual portfolio value', 'Стоимость виртуального портфеля')} value={money(account.metrics.equity_usd)} note={`${tr('Started with', 'Начальная сумма')} ${money(account.state.initial_usd)}`} />
          <Stat title={tr('Total P&L after costs', 'Прибыль / убыток после издержек')} value={`${pnl >= 0 ? '+' : ''}${money(pnl)}`} note={`${Number(account.metrics.return_pct).toFixed(2)}%`} tone={pnl >= 0 ? 'text-positive' : 'text-negative'} />
          <Stat title={tr('Virtual cash', 'Виртуальные доллары')} value={money(account.state.cash_usd)} note={tr('Bookkeeping balance · not USDC', 'Учётный баланс · не USDC')} />
          <Stat title={tr('Virtual SOL', 'Виртуальные SOL')} value={`${Number(account.state.sol_quantity).toFixed(6)} SOL`} note={`${tr('Last price', 'Последняя цена')}: ${account.state.last_price_usd ? money(account.state.last_price_usd) : '—'}`} />
        </div>
        <div className="grid lg:grid-cols-2 gap-5">
          <Card className="p-5 space-y-4"><h2 className="font-semibold">{tr('Allocation and result', 'Состав и результат')}</h2><div className="flex justify-between text-sm"><span>SOL {Number(account.metrics.sol_allocation_pct).toFixed(1)}%</span><span>{tr('Target', 'Цель')} {account.metrics.target_sol_pct}%</span></div><div className="h-2 rounded-full bg-bg-base overflow-hidden"><div className="h-full bg-accent rounded-full" style={{ width: `${Math.min(100, Number(account.metrics.sol_allocation_pct))}%` }} /></div><dl className="grid grid-cols-2 gap-3 text-sm"><dt className="text-text-secondary">{tr('Realized P&L', 'Реализованный результат')}</dt><dd className="text-right">{money(account.metrics.realized_pnl_usd)}</dd><dt className="text-text-secondary">{tr('Unrealized P&L', 'Нереализованный результат')}</dt><dd className="text-right">{money(account.metrics.unrealized_pnl_usd)}</dd><dt className="text-text-secondary">{tr('Estimated fees paid', 'Расчётные комиссии')}</dt><dd className="text-right">{money(account.state.fees_usd)}</dd><dt className="text-text-secondary">{tr('Drawdown from peak', 'Просадка от максимума')}</dt><dd className="text-right">{Number(account.metrics.drawdown_pct).toFixed(2)}%</dd></dl></Card>
          <Card className="p-5 space-y-4"><h2 className="font-semibold flex gap-2 items-center"><ShieldCheck size={17} />{tr('Active limits', 'Действующие лимиты')}</h2><dl className="grid grid-cols-2 gap-3 text-sm"><dt className="text-text-secondary">{tr('Per trade', 'На сделку')}</dt><dd className="text-right">{money(account.state.profile.max_single_trade_usd)}</dd><dt className="text-text-secondary">{tr('Daily turnover (UTC)', 'Дневной оборот (UTC)')}</dt><dd className="text-right">{money(account.state.daily_turnover_usd)} / {money(account.state.profile.max_daily_turnover_usd)}</dd><dt className="text-text-secondary">{tr('Completed cycles / fills', 'Выполнено циклов / сделок')}</dt><dd className="text-right">{account.state.cycle_count} / {account.state.trade_count}</dd></dl><Link className="inline-block text-sm text-accent underline" to="/agent-config?section=risk">{tr('Edit limits', 'Изменить лимиты')}</Link><p className="text-xs text-text-muted">{tr('Saving new limits pauses Autopilot. Resume it to apply the new profile. On-chain vault limits are separate.', 'Сохранение новых лимитов останавливает автопилот. Возобновите его для применения профиля. Ончейн-лимиты Vault учитываются отдельно.')}</p></Card>
        </div>
        <section className="space-y-4"><div className="flex flex-wrap justify-between items-center gap-3"><h2 className="text-lg font-semibold">{tr('Autopilot journal', 'Журнал автопилота')}</h2><Button size="sm" variant="outline" className="gap-2" onClick={exportLog}><Download size={14} />{tr('Export latest 50 events', 'Скачать последние 50 событий')}</Button></div>
          {events.map((event) => <Card key={event.id} className="p-5 space-y-3"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><Badge variant={event.fill ? 'positive' : 'default'}>{event.fill ? tr('Virtual fill', 'Виртуальная сделка') : event.decision ? localizeCode(event.decision.status, language) : event.status}</Badge><span className="font-semibold text-sm uppercase">{event.decision ? localizeCode(event.decision.proposal.action, language) : event.kind.replaceAll('_', ' ')}</span></div><time className="text-xs text-text-muted">{timestamp(event.at)}</time></div>
            {event.decision && <p className="text-sm text-text-secondary">{event.decision.proposal.rationale}</p>}{event.message && <p className="text-sm text-warning">{event.message}</p>}
            {event.fill && <p className="text-sm font-mono">{Number(event.fill.quantity_sol).toFixed(6)} SOL × {money(event.fill.price_usd)} · {tr('fees', 'комиссии')} {money(event.fill.fees_usd)} · {event.fill.source}</p>}
            {event.decision && <details className="text-xs"><summary className="cursor-pointer text-accent flex gap-2 items-center"><Check size={13} />{tr('Show sandbox policy and risk checks', 'Показать тестовые проверки политики и риска')}</summary><div className="mt-3 grid md:grid-cols-2 gap-2">{[...event.decision.shariah.checks, ...event.decision.risk.checks].map((check, index) => <div key={`${check.code}-${index}`} className="rounded bg-bg-base p-3"><div className="flex justify-between gap-2"><span>{check.code}</span><span className={check.outcome === 'pass' ? 'text-positive' : 'text-warning'}>{localizeCode(check.outcome, language)}</span></div><p className="mt-2 text-text-secondary">{check.message}</p></div>)}</div></details>}
          </Card>)}
        </section>
      </>}
    </div>
  );
}

function Stat({ title, value, note, tone = '' }: { title: string; value: string; note: string; tone?: string }) {
  return <Card className="p-5"><p className="text-xs text-text-muted">{title}</p><p className={`text-xl font-mono font-semibold mt-3 ${tone}`}>{value}</p><p className="text-xs text-text-secondary mt-2">{note}</p></Card>;
}
