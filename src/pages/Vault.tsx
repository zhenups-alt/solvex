import { useEffect, useMemo, useState } from 'react';
import { Copy, ExternalLink, LockKeyhole, PauseCircle, ShieldCheck } from 'lucide-react';
import { PublicKey } from '@solana/web3.js';
import { toast } from 'sonner';
import { Badge, Button, Card } from '../components/UI';
import { usePhantom } from '../components/WalletContextProvider';
import { truncateAddress } from '../lib/utils';
import { useStore } from '../store';

const PROGRAM_ID = new PublicKey('8oi1inxaWoWmY7FjEEERuCdbGdCQpfgAg2KHyXFYAkP8');

export default function VaultPage() {
  const { address, connection, network } = usePhantom();
  const { config } = useStore();
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
    toast.success('Address copied');
  };

  const explorer = (value: string) => `https://explorer.solana.com/address/${value}?cluster=${network}`;

  return (
    <div className="p-8 space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-text-primary">Vault</h1>
        <p className="text-text-secondary mt-1">Per-user custody controlled by your wallet and hard on-chain limits.</p>
      </header>

      <Card className="p-6 border-accent-border bg-accent-dim/5">
        <div className="flex flex-wrap justify-between gap-4 items-center">
          <div>
            <div className="text-sm font-semibold">Deployment state</div>
            <p className="text-xs text-text-secondary mt-2">
              {programDeployed ? 'The Solvex vault program is executable on this cluster.' : 'The new program is built locally but is not deployed on this cluster yet.'}
            </p>
          </div>
          <Badge variant={programDeployed ? 'positive' : 'warning'}>{programDeployed ? 'program live' : 'deployment pending'}</Badge>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 lg:col-span-2 space-y-6">
          <AddressRow label="Program ID" value={PROGRAM_ID.toBase58()} onCopy={copy} href={explorer(PROGRAM_ID.toBase58())} />
          <AddressRow label="Owner" value={address ?? 'Connect Phantom'} onCopy={copy} href={address ? explorer(address) : undefined} />
          <AddressRow label="Your vault PDA" value={vaultAddress?.toBase58() ?? 'Derived after wallet connection'} onCopy={copy} href={vaultAddress ? explorer(vaultAddress.toBase58()) : undefined} />
          <div className="flex items-center justify-between border-t border-border-subtle pt-5">
            <span className="text-sm text-text-secondary">Vault account</span>
            <Badge variant={vaultCreated ? 'positive' : 'default'}>{vaultCreated ? 'initialized' : 'not initialized'}</Badge>
          </div>
        </Card>

        <Card className="p-6 space-y-5">
          <div className="flex items-center gap-3"><ShieldCheck size={18} className="text-accent" /><h2 className="font-semibold">Enforced limits</h2></div>
          <Limit label="Principal cap" value={`$${config.investmentCapUsd.toLocaleString()}`} />
          <Limit label="Per trade" value={`$${config.maxSingleTradeUsd.toLocaleString()}`} />
          <Limit label="Daily turnover" value={`$${config.maxDailyTurnoverUsd.toLocaleString()}`} />
          <Limit label="Max drawdown" value={`${config.maxDrawdownPct}%`} />
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4"><LockKeyhole size={18} className="text-accent" /><h2 className="font-semibold">Custody rules</h2></div>
          <ul className="space-y-3 text-sm text-text-secondary">
            <li>Only the owner can deposit or withdraw.</li>
            <li>The delegated agent can swap only between the configured two token accounts.</li>
            <li>Jupiter program ID, quote expiry, input ceiling, and minimum output are checked on-chain.</li>
            <li>The backend decision hash is emitted with every successful swap.</li>
          </ul>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4"><PauseCircle size={18} className="text-warning" /><h2 className="font-semibold">Owner controls</h2></div>
          <p className="text-sm text-text-secondary mb-5">The program is live on Devnet. Wallet instructions for initialization and owner controls are the next integration step; Jupiter swaps remain locked because its canonical program is not available on Devnet.</p>
          <div className="flex flex-wrap gap-3">
            <Button disabled>{vaultCreated ? 'Management integration pending' : 'Initialization integration pending'}</Button>
            <Button variant="outline" disabled>Swaps Locked</Button>
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
