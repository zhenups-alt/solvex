import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bot,
  Check,
  Copy,
  ExternalLink,
  LoaderCircle,
  LockKeyhole,
  Play,
  Plus,
  RefreshCw,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { PublicKey } from '@solana/web3.js';
import { toast } from 'sonner';
import { Badge, Button, Card } from '../components/UI';
import { usePhantom } from '../components/WalletContextProvider';
import { useLanguage } from '../i18n';
import { localizeCode } from '../i18n';
import {
  DecisionLogResponse,
  SolMarketDataResponse,
  analyzePortfolio,
  ensureWalletSession,
  getSolMarketData,
  getRiskProfile,
  simulateDecision,
} from '../lib/solvexApi';
import {
  VAULT_PROGRAM_ID,
  BuiltVaultTransaction,
  VaultOnChainState,
  createDepositSolTransaction,
  createInitializeVaultTransaction,
  createWithdrawSolTransaction,
  createSetPausedTransaction,
  createSetLimitsTransaction,
  deriveVaultAddresses,
  loadVaultState,
} from '../lib/vaultClient';
import { useStore } from '../store';
import { Link } from 'react-router-dom';

type WorkingAction = 'refresh' | 'create' | 'deposit' | 'withdraw' | 'analyze' | 'simulate' | 'pause' | 'limits' | null;

export default function VaultPage() {
  const { address, publicKey, balance, connection, network, sendTransaction, signMessage } = usePhantom();
  const { config } = useStore();
  const { language, locale, tr } = useLanguage();
  const [programDeployed, setProgramDeployed] = useState(false);
  const [vaultState, setVaultState] = useState<VaultOnChainState | null>(null);
  const [market, setMarket] = useState<SolMarketDataResponse | null>(null);
  const [marketUnavailable, setMarketUnavailable] = useState(false);
  const [depositAmount, setDepositAmount] = useState('0.1');
  const [withdrawAmount, setWithdrawAmount] = useState('0.1');
  const [working, setWorking] = useState<WorkingAction>('refresh');
  const [lastDecision, setLastDecision] = useState<DecisionLogResponse | null>(null);
  const [simulation, setSimulation] = useState<Record<string, unknown> | null>(null);

  const derivedVault = useMemo(
    () => publicKey ? deriveVaultAddresses(publicKey).vault : null,
    [publicKey],
  );

  const explorer = (value: string, type: 'address' | 'tx' = 'address') =>
    `https://explorer.solana.com/${type}/${value}?cluster=${network}`;

  const refresh = useCallback(async () => {
    setWorking('refresh');
    try {
      const [program, nextMarket, nextVault] = await Promise.all([
        connection.getAccountInfo(VAULT_PROGRAM_ID, 'confirmed'),
        getSolMarketData().catch(() => null),
        publicKey ? loadVaultState(connection, publicKey) : Promise.resolve(null),
      ]);
      setProgramDeployed(Boolean(program?.executable));
      setMarket(nextMarket);
      setMarketUnavailable(!nextMarket);
      setVaultState(nextVault);
    } catch (error) {
      toast.error(tr('Could not refresh vault state', 'Не удалось обновить состояние хранилища'), {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setWorking(null);
    }
  }, [connection, publicKey, tr]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const sendAndReport = async (transactionFactory: () => Promise<BuiltVaultTransaction> | BuiltVaultTransaction, successMessage: string) => {
    if (network !== 'devnet') throw new Error(tr('This vault workflow is available on Devnet only.', 'Это хранилище доступно только в Devnet.'));
    const built = await transactionFactory();
    const signature = await sendTransaction(built.transaction, built.additionalSigners);
    toast.success(successMessage, {
      action: { label: tr('Explorer', 'Explorer'), onClick: () => window.open(explorer(signature, 'tx'), '_blank') },
    });
    await refresh();
  };

  const createVault = async () => {
    if (!publicKey || !market) return;
    setWorking('create');
    try {
      const [saved, currentMarket] = await Promise.all([getRiskProfile(address!), getSolMarketData()]);
      setMarket(currentMarket);
      await sendAndReport(
        () => createInitializeVaultTransaction(publicKey, {
          investmentCapUsd: Number(saved.investment_cap_usd),
          maxSingleTradeUsd: Number(saved.max_single_trade_usd),
          maxDailyTurnoverUsd: Number(saved.max_daily_turnover_usd),
          solPriceUsd: Number(currentMarket.price_usd),
        }),
        tr('Vault created on Devnet', 'Хранилище создано в Devnet'),
      );
    } catch (error) {
      toast.error(tr('Vault creation failed', 'Не удалось создать хранилище'), {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setWorking(null);
    }
  };

  const deposit = async () => {
    if (!publicKey || !vaultState) return;
    const amount = Number(depositAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error(tr('Enter a valid SOL amount', 'Укажите корректную сумму SOL'));
      return;
    }
    const remaining = Number(vaultState.maxPrincipalBase - vaultState.depositedPrincipalBase) / 1_000_000_000;
    if (amount > remaining) {
      toast.error(tr('Deposit exceeds your vault limit', 'Пополнение превышает лимит хранилища'), {
        description: tr(`You can add up to ${remaining.toFixed(9)} SOL.`, `Можно внести ещё ${remaining.toFixed(9)} SOL.`),
      });
      return;
    }
    if (balance != null && amount + 0.02 > balance) {
      toast.error(tr('Keep at least 0.02 SOL for network fees', 'Оставьте минимум 0,02 SOL на комиссии сети'));
      return;
    }
    setWorking('deposit');
    try {
      await sendAndReport(
        () => createDepositSolTransaction(connection, publicKey, vaultState, amount),
        tr(`${amount} SOL deposited into the vault`, `${amount} SOL внесено в хранилище`),
      );
    } catch (error) {
      toast.error(tr('Deposit failed', 'Не удалось внести средства'), {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setWorking(null);
    }
  };

  const manageVault = async (action: 'pause' | 'limits') => {
    if (!publicKey || !address || !vaultState) return;
    setWorking(action);
    try {
      if (action === 'pause') {
        await sendAndReport(() => createSetPausedTransaction(publicKey, vaultState, !vaultState.paused),
          tr('Vault pause state updated', 'Состояние паузы Vault обновлено'));
      } else {
        const [saved, currentMarket] = await Promise.all([getRiskProfile(address), getSolMarketData()]);
        setMarket(currentMarket);
        await sendAndReport(() => createSetLimitsTransaction(publicKey, vaultState, {
          investmentCapUsd: Number(saved.investment_cap_usd),
          maxSingleTradeUsd: Number(saved.max_single_trade_usd),
          maxDailyTurnoverUsd: Number(saved.max_daily_turnover_usd),
          solPriceUsd: Number(currentMarket.price_usd),
        }), tr('On-chain vault limits updated', 'Ончейн-лимиты Vault обновлены'));
      }
    } catch (error) {
      toast.error(tr('Could not update vault', 'Не удалось обновить Vault'), { description: error instanceof Error ? error.message : undefined });
    } finally { setWorking(null); }
  };

  const withdraw = async () => {
    if (!publicKey || !vaultState) return;
    const amount = Number(withdrawAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error(tr('Enter a valid SOL amount', 'Укажите корректную сумму SOL'));
      return;
    }
    setWorking('withdraw');
    try {
      await sendAndReport(
        () => createWithdrawSolTransaction(connection, publicKey, vaultState, amount),
        tr(`${amount} SOL returned to your wallet`, `${amount} SOL возвращено в ваш кошелёк`),
      );
    } catch (error) {
      toast.error(tr('Withdrawal failed', 'Не удалось вывести средства'), {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setWorking(null);
    }
  };

  const runAnalysis = async () => {
    if (!address || !vaultState || !market) return;
    setWorking('analyze');
    setSimulation(null);
    try {
      await ensureWalletSession(address, signMessage);
      const price = Number(market.price_usd);
      const principalUsd = Number(vaultState.depositedPrincipalBase) / 1_000_000_000 * price;
      const marketValueUsd = vaultState.baseBalance * price + vaultState.quoteBalance;
      const drawdown = principalUsd > 0 ? Math.max(0, (principalUsd - marketValueUsd) / principalUsd * 100) : 0;
      const decision = await analyzePortfolio(
        address,
        {
          vault_principal_usd: Number(principalUsd.toFixed(2)),
          vault_market_value_usd: Number(marketValueUsd.toFixed(2)),
          daily_turnover_usd: 0,
          current_drawdown_pct: Number(drawdown.toFixed(2)),
          captured_at: new Date().toISOString(),
        },
        {
          network,
          assets: [
            { symbol: 'SOL', price_usd: price, change_24h_pct: Number(market.change_24h_pct), policy_status: 'eligible' },
            { symbol: 'USDC', price_usd: 1, policy_status: 'review' },
          ],
          protocols: [{ id: 'jupiter_spot_router', policy_status: 'eligible', execution_available: false }],
          vault_holdings: { SOL: vaultState.baseBalance, USDC: vaultState.quoteBalance },
          constraints: { leverage: false, derivatives: false, interest: false, spot_only: true },
          market_data_source: market.source,
        },
        language,
      );
      setLastDecision(decision);
      toast.success(tr('AI analysis saved to the Decision Log', 'ИИ-анализ сохранён в журнал решений'));
    } catch (error) {
      toast.error(tr('AI analysis failed', 'Не удалось выполнить ИИ-анализ'), {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setWorking(null);
    }
  };

  const simulate = async () => {
    if (!address || !lastDecision) return;
    setWorking('simulate');
    try {
      await ensureWalletSession(address, signMessage);
      const result = await simulateDecision(lastDecision.id, address);
      setSimulation(result.simulation);
      toast.success(tr('Simulation result saved', 'Результат симуляции сохранён'));
    } catch (error) {
      toast.error(tr('Simulation failed', 'Ошибка симуляции'), {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setWorking(null);
    }
  };

  const copy = async (value: string) => {
    await navigator.clipboard.writeText(value);
    toast.success(tr('Address copied', 'Адрес скопирован'));
  };

  const maxVaultSol = vaultState ? Number(vaultState.maxPrincipalBase) / 1_000_000_000 : 0;
  const readyForAnalysis = Boolean(vaultState && vaultState.baseBalance > 0 && market);

  return (
    <div className="p-4 md:p-8 space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{tr('Devnet Vault workflow', 'Работа с Devnet-хранилищем')}</h1>
          <p className="text-text-secondary mt-1">{tr('Create a real on-chain vault, deposit test SOL, and run the guarded AI analysis.', 'Создайте настоящее ончейн-хранилище, внесите тестовые SOL и запустите защищённый ИИ-анализ.')}</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" disabled={working === 'refresh'} onClick={() => void refresh()}>
          <RefreshCw size={14} className={working === 'refresh' ? 'animate-spin' : ''} /> {tr('Refresh', 'Обновить')}
        </Button>
      </header>

      <Link to="/autopilot" className="block rounded-xl border border-accent/30 bg-accent/5 p-4 text-sm text-accent">
        {tr('Try Autopilot → Automatic virtual trading, portfolio results and a cycle-by-cycle log. Your Devnet vault stays separate.', 'Попробуйте автопилот → Автоматические виртуальные сделки, результат портфеля и журнал циклов. Devnet-хранилище учитывается отдельно.')}
      </Link>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Step number="1" done={Boolean(address)} label={tr('Connect Phantom', 'Подключить Phantom')} />
        <Step number="2" done={config.investmentCapUsd > 0} label={tr('Set limits', 'Задать лимиты')} />
        <Step number="3" done={Boolean(vaultState)} label={tr('Create Vault', 'Создать Vault')} />
        <Step number="4" done={Boolean(vaultState?.baseBalance)} label={tr('Deposit SOL', 'Внести SOL')} />
        <Step number="5" done={Boolean(lastDecision)} label={tr('Run AI', 'Запустить ИИ')} />
      </div>

      <Card className="p-6 border-accent-border bg-accent-dim/5">
        <div className="flex flex-wrap justify-between gap-4 items-center">
          <div>
            <div className="text-sm font-semibold">{tr('Environment', 'Окружение')}</div>
            <p className="text-xs text-text-secondary mt-2">
              {programDeployed
                ? tr('The Solvex program is live on Devnet. Deposits and withdrawals are real Devnet transactions.', 'Программа Solvex работает в Devnet. Пополнения и выводы являются настоящими Devnet-транзакциями.')
                : tr('The Solvex program was not found on the selected cluster.', 'Программа Solvex не найдена в выбранном кластере.')}
            </p>
          </div>
          <div className="flex gap-2">
            <Badge variant={programDeployed ? 'positive' : 'warning'}>{programDeployed ? tr('program live', 'программа запущена') : tr('unavailable', 'недоступна')}</Badge>
            <Badge variant="warning">{tr('swaps locked', 'обмены закрыты')}</Badge>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className="p-6 space-y-6">
          <div className="flex items-center gap-3"><Wallet size={18} className="text-accent" /><h2 className="font-semibold">{tr('1–3 · Prepare the Vault', '1–3 · Подготовьте хранилище')}</h2></div>
          {!address ? (
            <p className="text-sm text-warning">{tr('Connect Phantom using the button at the top of the page.', 'Подключите Phantom кнопкой в верхней части страницы.')}</p>
          ) : (
            <>
              <AddressRow label={tr('Owner', 'Владелец')} value={address} onCopy={copy} href={explorer(address)} />
              <AddressRow label={tr('Vault PDA', 'PDA хранилища')} value={derivedVault?.toBase58() ?? '—'} onCopy={copy} href={derivedVault ? explorer(derivedVault.toBase58()) : undefined} />
              <div className="grid grid-cols-2 gap-3 text-sm">
                <InfoBox label={tr('SOL price', 'Цена SOL')} value={market ? `$${Number(market.price_usd).toLocaleString(locale)}` : '—'} />
                <InfoBox label={tr('Investment cap', 'Лимит инвестиций')} value={`$${config.investmentCapUsd.toLocaleString(locale)}`} />
              </div>
              {!vaultState ? (
                <div className="space-y-3 border-t border-border-subtle pt-5">
                  <p className="text-xs leading-relaxed text-text-secondary">{tr('The USD limits will be converted into fixed on-chain SOL/USDC atomic limits using the displayed SOL price.', 'Долларовые лимиты будут преобразованы в фиксированные ончейн-лимиты SOL/USDC по указанной цене SOL.')}</p>
                  {marketUnavailable && (
                    <div className="flex flex-wrap items-center gap-3 rounded-md border border-warning/30 bg-warning-dim/20 p-3 text-xs text-text-secondary">
                      <span>{tr('The SOL quote could not be loaded. Retry before creating the vault.', 'Не удалось загрузить цену SOL. Повторите запрос перед созданием Vault.')}</span>
                      <Button variant="outline" size="sm" className="gap-2" disabled={working !== null} onClick={() => void refresh()}>
                        <RefreshCw size={13} className={working === 'refresh' ? 'animate-spin' : ''} />
                        {tr('Retry quote', 'Повторить запрос')}
                      </Button>
                    </div>
                  )}
                  <Button className="gap-2" disabled={!programDeployed || !market || working !== null} onClick={() => void createVault()}>
                    {working === 'create' ? <LoaderCircle size={16} className="animate-spin" /> : <Plus size={16} />}
                    {tr('Create and activate Vault', 'Создать и активировать Vault')}
                  </Button>
                  <Link to="/agent-config?section=risk" className="ml-3 text-xs text-accent hover:underline">{tr('Review limits first', 'Сначала проверить лимиты')}</Link>
                </div>
              ) : (
                <div className="flex items-center justify-between border-t border-border-subtle pt-5">
                  <span className="text-sm text-positive flex items-center gap-2"><Check size={15} /> {tr('Vault initialized', 'Vault инициализирован')}</span>
                  <Badge variant={vaultState.paused ? 'warning' : 'positive'}>{vaultState.paused ? tr('paused', 'на паузе') : tr('active', 'активен')}</Badge>
                </div>
              )}
              {vaultState && <div className="space-y-3 border-t border-border-subtle pt-4">
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" disabled={working !== null} onClick={() => void manageVault('pause')}>{vaultState.paused ? tr('Resume Devnet vault', 'Возобновить Devnet Vault') : tr('Pause Devnet vault', 'Остановить Devnet Vault')}</Button>
                  <Button size="sm" variant="outline" disabled={working !== null} onClick={() => void manageVault('limits')}>{tr('Apply saved limits on-chain', 'Применить сохранённые лимиты ончейн')}</Button>
                </div>
                <p className="text-xs text-text-muted">{tr('Changes require a Phantom transaction signature. Applying limits recalculates SOL caps at the current price. Pausing blocks deposits and swaps; withdrawals remain available. These controls do not affect paper Autopilot.', 'Изменения требуют подписи транзакции в Phantom. Применение лимитов пересчитывает максимум SOL по текущей цене. Пауза блокирует пополнения и обмены, но сохраняет вывод. Эти кнопки не управляют виртуальным автопилотом.')}</p>
              </div>}
            </>
          )}
        </Card>

        <Card className="p-6 space-y-6">
          <div className="flex items-center gap-3"><ShieldCheck size={18} className="text-accent" /><h2 className="font-semibold">{tr('4 · Fund the Vault', '4 · Пополните хранилище')}</h2></div>
          <div className="grid grid-cols-2 gap-3">
            <InfoBox label={tr('Vault balance', 'Баланс Vault')} value={`${vaultState?.baseBalance.toFixed(4) ?? '0.0000'} SOL`} />
            <InfoBox label={tr('On-chain maximum', 'Ончейн-максимум')} value={`${maxVaultSol.toFixed(4)} SOL`} />
          </div>
          <label className="block space-y-2">
            <span className="text-xs font-semibold text-text-secondary">{tr('Amount to deposit', 'Сумма пополнения')}</span>
            <div className="flex gap-2">
              <input type="number" min="0.001" step="0.01" value={depositAmount} onChange={(event) => setDepositAmount(event.target.value)} className="h-10 min-w-0 flex-1 rounded-md border border-border-default bg-bg-base px-3 font-mono text-sm focus:border-accent focus:outline-none" />
              <Button disabled={!vaultState || vaultState.paused || working !== null} onClick={() => void deposit()}>{working === 'deposit' ? tr('Depositing…', 'Пополнение…') : tr('Deposit SOL', 'Внести SOL')}</Button>
            </div>
            {vaultState && <p className="text-xs text-text-muted">{tr('Remaining deposit capacity:', 'Можно внести ещё:')} {Math.max(0, Number(vaultState.maxPrincipalBase - vaultState.depositedPrincipalBase) / 1_000_000_000).toLocaleString(locale, { maximumFractionDigits: 9 })} SOL</p>}
          </label>
          <label className="block space-y-2 border-t border-border-subtle pt-5">
            <span className="text-xs font-semibold text-text-secondary">{tr('Amount to withdraw', 'Сумма вывода')}</span>
            <div className="flex gap-2">
              <input type="number" min="0.001" step="0.01" value={withdrawAmount} onChange={(event) => setWithdrawAmount(event.target.value)} className="h-10 min-w-0 flex-1 rounded-md border border-border-default bg-bg-base px-3 font-mono text-sm focus:border-accent focus:outline-none" />
              <Button variant="outline" disabled={!vaultState?.baseBalance || working !== null} onClick={() => void withdraw()}>{working === 'withdraw' ? tr('Withdrawing…', 'Вывод…') : tr('Withdraw', 'Вывести')}</Button>
            </div>
          </label>
          <p className="text-xs leading-relaxed text-text-muted">{tr('SOL is wrapped into WSOL for the deposit and automatically unwrapped on withdrawal. Phantom signs every transaction.', 'При пополнении SOL автоматически оборачивается в WSOL, а при выводе разворачивается обратно. Каждую транзакцию подписывает Phantom.')}</p>
        </Card>
      </div>

      <Card className="p-6 space-y-6 border-accent/30">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Bot size={20} className="mt-0.5 text-accent" />
            <div>
              <h2 className="font-semibold">{tr('5 · Run guarded AI analysis', '5 · Запустите защищённый ИИ-анализ')}</h2>
              <p className="mt-1 text-sm text-text-secondary">{tr('Gemini proposes an action. Shariah Firewall and Risk Engine independently approve or reject it.', 'Gemini предлагает действие. Shariah Firewall и Risk Engine независимо допускают или отклоняют его.')}</p>
            </div>
          </div>
          <Button className="gap-2" disabled={!readyForAnalysis || working !== null} onClick={() => void runAnalysis()}>
            {working === 'analyze' ? <LoaderCircle size={16} className="animate-spin" /> : <Play size={16} />}
            {tr('Analyze portfolio', 'Анализировать портфель')}
          </Button>
        </div>

        {!readyForAnalysis && <p className="rounded-md border border-warning/20 bg-warning/5 p-3 text-xs text-warning">{tr('Create the Vault and deposit SOL before running the analysis.', 'Перед анализом создайте Vault и внесите SOL.')}</p>}

        {lastDecision && (
          <div className="space-y-4 rounded-lg border border-border-subtle bg-bg-elevated/50 p-5">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant={lastDecision.execution_allowed ? 'positive' : 'warning'}>{localizeCode(lastDecision.proposal.action, language)}</Badge>
              <span className="text-sm font-mono">{localizeCode(lastDecision.status, language)}</span>
              <span className="text-xs text-text-muted">{tr('confidence', 'уверенность')} {lastDecision.proposal.confidence}%</span>
            </div>
            <p className="text-sm leading-relaxed text-text-secondary">{lastDecision.proposal.rationale}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <InfoBox label="Shariah Firewall" value={localizeCode(lastDecision.shariah.status, language)} />
              <InfoBox label="Risk Engine" value={localizeCode(lastDecision.risk.status, language)} />
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" size="sm" className="gap-2" disabled={working !== null} onClick={() => void simulate()}>
                {working === 'simulate' ? <LoaderCircle size={14} className="animate-spin" /> : <LockKeyhole size={14} />}
                {tr('Simulate next step', 'Симулировать следующий шаг')}
              </Button>
              <Link to="/decisions" className="inline-flex h-8 items-center text-xs font-semibold text-accent hover:underline">{tr('Open full Decision Log', 'Открыть полный журнал решений')}</Link>
            </div>
            {simulation && (
              <div className="rounded-md border border-warning/20 bg-warning/5 p-3 text-xs text-text-secondary">
                <span className="font-semibold text-warning">{String(simulation.status)}</span>
                {' · '}{String(simulation.reason || '')}
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

function Step({ number, done, label }: { number: string; done: boolean; label: string }) {
  return (
    <div className={`rounded-lg border p-3 ${done ? 'border-positive/30 bg-positive/5' : 'border-border-subtle bg-bg-card'}`}>
      <div className={`mb-2 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${done ? 'bg-positive text-bg-base' : 'bg-bg-elevated text-text-muted'}`}>{done ? <Check size={13} /> : number}</div>
      <div className="text-xs font-semibold text-text-secondary">{label}</div>
    </div>
  );
}

function AddressRow({ label, value, onCopy, href }: { label: string; value: string; onCopy: (value: string) => void; href?: string }) {
  return <div><div className="text-[11px] text-text-muted uppercase tracking-wider mb-2">{label}</div><div className="flex items-center gap-2 font-mono text-sm break-all"><span>{value}</span>{href && <><button onClick={() => void onCopy(value)} className="text-text-muted hover:text-accent shrink-0"><Copy size={14} /></button><a href={href} target="_blank" rel="noreferrer" className="text-text-muted hover:text-accent shrink-0"><ExternalLink size={14} /></a></>}</div></div>;
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md border border-border-subtle bg-bg-base p-3"><div className="text-[10px] uppercase tracking-wider text-text-muted">{label}</div><div className="mt-1 font-mono text-sm text-text-primary">{value}</div></div>;
}
