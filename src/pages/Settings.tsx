import React from 'react';
import { Card, Button, Badge } from '../components/UI';
import { useStore } from '../store';
import { Monitor, Globe, Bell, ShieldAlert, Trash2, LogOut } from 'lucide-react';
import { cn } from '../lib/utils';

export default function SettingsPage() {
  const { isDemoMode, setDemoMode, walletAddress, setWalletAddress } = useStore();

  return (
    <div className="p-8 max-w-4xl space-y-12">
      <header>
        <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
        <p className="text-text-secondary mt-1">Manage your account and application preferences.</p>
      </header>

      <div className="space-y-8">
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-text-muted">Appearance</h2>
          <Card className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Monitor className="text-text-muted" size={20} />
              <div>
                <div className="text-sm font-medium">Theme</div>
                <div className="text-xs text-text-muted">Dark mode is the default for Solvex.</div>
              </div>
            </div>
            <Badge>Dark Only</Badge>
          </Card>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-text-muted">Network</h2>
          <Card className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Globe className="text-text-muted" size={20} />
                <div>
                  <div className="text-sm font-medium">Cluster</div>
                  <div className="text-xs text-text-muted">Currently connected to Solana Devnet.</div>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-accent-dim border border-accent-border rounded-md">
                <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                <span className="text-[11px] font-mono text-accent uppercase font-bold">Devnet</span>
              </div>
            </div>
            <div className="pt-4 border-t border-border-subtle">
              <label className="block text-xs text-text-muted uppercase tracking-wider mb-2">Custom RPC Endpoint</label>
              <input 
                type="text" 
                placeholder="https://api.devnet.solana.com"
                className="w-full bg-bg-elevated border border-border-default rounded-md h-10 px-4 text-sm font-mono focus:outline-none focus:border-accent"
              />
            </div>
          </Card>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-text-muted">Demo Mode</h2>
          <Card className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-sm font-medium">Toggle Demo Mode</div>
              <div className="text-xs text-text-muted">Simulate live data without connecting a wallet.</div>
            </div>
            <button
              onClick={() => setDemoMode(!isDemoMode)}
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none",
                isDemoMode ? "bg-accent" : "bg-bg-elevated border border-border-default"
              )}
            >
              <span
                className={cn(
                  "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                  isDemoMode ? "translate-x-6" : "translate-x-1"
                )}
              />
            </button>
          </Card>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-negative">Danger Zone</h2>
          <Card className="p-6 border-negative/20 bg-negative-dim/5 space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-sm font-medium text-text-primary">Pause Agent</div>
                <div className="text-xs text-text-secondary">Stop all future rebalancing cycles immediately.</div>
              </div>
              <Button variant="outline" size="sm" className="border-negative text-negative hover:bg-negative-dim">Pause Agent</Button>
            </div>
            <div className="flex items-center justify-between pt-6 border-t border-negative/10">
              <div className="space-y-1">
                <div className="text-sm font-medium text-text-primary">Close Vault</div>
                <div className="text-xs text-text-secondary">Withdraw all funds and close the vault account.</div>
              </div>
              <Button variant="outline" size="sm" className="border-negative text-negative hover:bg-negative-dim gap-2">
                <Trash2 size={14} /> Close Vault
              </Button>
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
}
