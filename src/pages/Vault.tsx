import { useEffect, useMemo, useState } from 'react';
import { Copy, ExternalLink, LockKeyhole, PauseCircle, ShieldCheck } from 'lucide-react';
import { PublicKey } from '@solana/web3.js';
import { toast } from 'sonner';
import { Badge, Button, Card } from '../components/UI';
import { usePhantom } from '../components/WalletContextProvider';
import { truncateAddress } from '../lib/utils';
import { useStore } from '../store';
import { useLanguage } from '../i18n';
import { Link } from 'react-router-dom';

const PROGRAM_ID = new PublicKey('8oi1inxaWoWmY7FjEEERuCdbGdCQpfgAg2KHyXFYAkP8');

export default function VaultPage() {
  const { address, connection, network } = usePhantom();
  const { config } = useStore();
  const { locale, tr } = useLanguage();
  const [programDeployed, setProgramDeployed] = useState(false);
  const [vaultCreated, setVaultCreated] = useState(false);

  const vaultAddress = useMemo(() => {
    if (!address) return null;
    return PublicKey.findProgramAddressSync(
      [new TextEncoder().encode('vault'), new PublicKey(address).toBytes()],
      PROGRAM_ID,
    )[0];
  }, [address]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      connection.getAccountInfo(PROGRAM_ID),
      vaultAddress ? connection.getAccountInfo(vaultAddress) : Promise.resolve(null),
    ]).then(([program, vault]) => {
      if (cancelled) return;
      setProgramDeployed(Boolean(program?.executable));
      setVaultCreated(Boolean(vault));
    }).catch(() => {
      if (!cancelled) {
        setProgramDeployed(false);
        setVaultCreated(false);
      }
    });
    return () => { cancelled = true; };
  }, [connection, vaultAddress]);

  const copy = async (value: string) => {
    await navigator.clipboard.writeText(value);
    toast.success(tr('Address copied', 'Адрес скопирован'));
  };

  const explorer = (value: string) => `https://explorer.solana.com/address/${value}?cluster=${network}`;

  return (
    <div className="p-4 md:p-8 space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-text-primary">{tr('Vault', 'Хранилище')}</h1>
        <p className="text-text-secondary mt-1">{tr('Per-user custody controlled by your wallet and hard on-chain limits.', 'Персональное хранилище под контролем вашего кошелька и жёстких ончейн-лимитов.')}</p>
      </header>

      <Card className="p-6 border-accent-border bg-accent-dim/5">
        <div className="flex flex-wrap justify-between gap-4 items-center">
          <div>
            <div className="text-sm font-semibold">{tr('Deployment state', 'Статус развёртывания')}</div>
            <p className="text-xs text-text-secondary mt-2">
              {programDeployed ? tr('The Solvex vault program is executable on this cluster.', 'Программа хранилища Solvex запущена в этом кластере.') : tr('The new program is built locally but is not deployed on this cluster yet.', 'Программа собрана локально, но ещё не развёрнута в этом кластере.')}
            </p>
          </div>
          <Badge variant={programDeployed ? 'positive' : 'warning'}>{programDeployed ? tr('program live', 'программа запущена') : tr('deployment pending', 'ожидается развёртывание')}</Badge>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 lg:col-span-2 space-y-6">
          <AddressRow label={tr('Program ID', 'ID программы')} value={PROGRAM_ID.toBase58()} onCopy={copy} href={explorer(PROGRAM_ID.toBase58())} />
          <AddressRow label={tr('Owner', 'Владелец')} value={address ?? tr('Connect Phantom', 'Подключите Phantom')} onCopy={copy} href={address ? explorer(address) : undefined} />
          <AddressRow label={tr('Your vault PDA', 'PDA вашего хранилища')} value={vaultAddress?.toBase58() ?? tr('Derived after wallet connection', 'Будет вычислен после подключения кошелька')} onCopy={copy} href={vaultAddress ? explorer(vaultAddress.toBase58()) : undefined} />
          <div className="flex items-center justify-between border-t border-border-subtle pt-5">
            <span className="text-sm text-text-secondary">{tr('Vault account', 'Аккаунт хранилища')}</span>
            <Badge variant={vaultCreated ? 'positive' : 'default'}>{vaultCreated ? tr('initialized', 'инициализирован') : tr('not initialized', 'не инициализирован')}</Badge>
          </div>
        </Card>

        <Card className="p-6 space-y-5">
          <div className="flex items-center gap-3"><ShieldCheck size={18} className="text-accent" /><h2 className="font-semibold">{tr('Enforced limits', 'Действующие лимиты')}</h2></div>
          <Limit label={tr('Principal cap', 'Общий лимит')} value={`$${config.investmentCapUsd.toLocaleString(locale)}`} />
          <Limit label={tr('Per trade', 'На одну сделку')} value={`$${config.maxSingleTradeUsd.toLocaleString(locale)}`} />
          <Limit label={tr('Daily turnover', 'Дневной оборот')} value={`$${config.maxDailyTurnoverUsd.toLocaleString(locale)}`} />
          <Limit label={tr('Max drawdown', 'Макс. просадка')} value={`${config.maxDrawdownPct}%`} />
          <Link to="/agent-config?section=risk" className="inline-flex h-9 w-full items-center justify-center rounded-md border border-accent/40 text-sm font-semibold text-accent hover:bg-accent/10">{tr('Change limits', 'Изменить лимиты')}</Link>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4"><LockKeyhole size={18} className="text-accent" /><h2 className="font-semibold">{tr('Custody rules', 'Правила хранения')}</h2></div>
          <ul className="space-y-3 text-sm text-text-secondary">
            <li>{tr('Only the owner can deposit or withdraw.', 'Только владелец может вносить и выводить средства.')}</li>
            <li>{tr('The delegated agent can swap only between the configured two token accounts.', 'Агент может выполнять обмен только между двумя настроенными токен-счетами.')}</li>
            <li>{tr('Jupiter program ID, quote expiry, input ceiling, and minimum output are checked on-chain.', 'ID Jupiter, срок котировки, максимальный вход и минимальный выход проверяются ончейн.')}</li>
            <li>{tr('The backend decision hash is emitted with every successful swap.', 'Хеш серверного решения записывается при каждом успешном обмене.')}</li>
          </ul>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4"><PauseCircle size={18} className="text-warning" /><h2 className="font-semibold">{tr('Owner controls', 'Управление владельца')}</h2></div>
          <p className="text-sm text-text-secondary mb-5">{tr('The program is live on Devnet. Wallet instructions for initialization and owner controls are the next integration step; Jupiter swaps remain locked because its canonical program is not available on Devnet.', 'Программа работает в Devnet. Подключение инструкций кошелька для инициализации и управления — следующий этап; обмены Jupiter остаются заблокированы, поскольку его каноническая программа недоступна в Devnet.')}</p>
          <div className="flex flex-wrap gap-3">
            <Button disabled>{vaultCreated ? tr('Management integration pending', 'Управление ещё подключается') : tr('Initialization integration pending', 'Инициализация ещё подключается')}</Button>
            <Button variant="outline" disabled>{tr('Swaps Locked', 'Обмены заблокированы')}</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function AddressRow({ label, value, onCopy, href }: { label: string; value: string; onCopy: (value: string) => void; href?: string }) {
  return <div><div className="text-[11px] text-text-muted uppercase tracking-wider mb-2">{label}</div><div className="flex items-center gap-2 font-mono text-sm break-all"><span>{value}</span>{href && <><button onClick={() => void onCopy(value)} className="text-text-muted hover:text-accent shrink-0"><Copy size={14} /></button><a href={href} target="_blank" rel="noreferrer" className="text-text-muted hover:text-accent shrink-0"><ExternalLink size={14} /></a></>}</div></div>;
}

function Limit({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between text-sm"><span className="text-text-secondary">{label}</span><span className="font-mono text-text-primary">{value}</span></div>;
}
