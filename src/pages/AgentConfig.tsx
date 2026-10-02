import React, { useEffect, useState } from 'react';
import { 
  Shield, 
  Cpu, 
  Activity, 
  Brain, 
  Zap, 
  Bell, 
  Key, 
  Settings2,
  ChevronRight,
  Info,
  Save
} from 'lucide-react';
import { Card, Button, Badge } from '../components/UI';
import { AgentConfig, useStore } from '../store';
import { cn } from '../lib/utils';
import { usePhantom } from '../components/WalletContextProvider';
import { getRiskProfile, saveRiskProfile } from '../lib/solvexApi';
import { toast } from 'sonner';

export default function AgentConfigPage() {
  const [activeSection, setActiveSection] = useState('strategy');
  const [saving, setSaving] = useState(false);
  const { config, updateConfig } = useStore();
  const { address } = usePhantom();

  useEffect(() => {
    if (!address) return;
    getRiskProfile(address)
      .then((profile) => {
        const profileName = `${profile.risk_level[0].toUpperCase()}${profile.risk_level.slice(1)}` as AgentConfig['profile'];
        updateConfig({
          profile: profileName,
          investmentCapUsd: Number(profile.investment_cap_usd),
          maxSingleTradeUsd: Number(profile.max_single_trade_usd),
          maxDailyTurnoverUsd: Number(profile.max_daily_turnover_usd),
          slippageTolerance: profile.max_slippage_bps / 100,
          maxDrawdownPct: Number(profile.max_drawdown_pct),
        });
      })
      .catch((error) => {
        if (!error.message.includes('profile not found')) {
          toast.error('Could not load risk profile', { description: error.message });
        }
      });
  }, [address, updateConfig]);

  const handleSaveRisk = async () => {
    if (!address) {
      toast.error('Connect your wallet before saving limits');
      return;
    }
    if (config.maxSingleTradeUsd > config.investmentCapUsd) {
      toast.error('Per-trade limit cannot exceed the investment cap');
      return;
    }
    setSaving(true);
    try {
      await saveRiskProfile(address, config);
      toast.success('Risk limits saved', {
        description: `The agent cannot manage more than $${config.investmentCapUsd.toLocaleString()}.`,
      });
    } catch (error) {
      toast.error('Could not save risk limits', {
        description: error instanceof Error ? error.message : 'Unknown API error',
      });
    } finally {
      setSaving(false);
    }
  };

  const sections = [
    { id: 'strategy', name: 'Strategy Profile', icon: Activity },
    { id: 'risk', name: 'Risk Parameters', icon: Shield },
    { id: 'model', name: 'AI Model Settings', icon: Brain },
    { id: 'data', name: 'Market Data Sources', icon: Cpu },
    { id: 'prompt', name: 'AI Proposal Policy', icon: Settings2 },
    { id: 'execution', name: 'Execution Rules', icon: Zap },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'keypair', name: 'Agent Keypair', icon: Key },
  ];

  return (
    <div className="p-8 space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-text-primary">Agent Configuration</h1>
        <p className="text-text-secondary mt-1">Configure the hard limits around autonomous vault management.</p>
      </header>

      <div className="grid grid-cols-[240px,1fr] gap-8">
        {/* Sidebar Nav */}
        <div className="space-y-1">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 rounded-md text-sm font-medium transition-all group",
                activeSection === section.id 
                  ? "bg-bg-elevated text-text-primary" 
                  : "text-text-secondary hover:text-text-primary hover:bg-bg-subtle"
              )}
            >
              <div className="flex items-center gap-3">
                <section.icon size={16} className={cn(activeSection === section.id ? "text-accent" : "text-text-muted group-hover:text-text-secondary")} />
                {section.name}
              </div>
              <ChevronRight size={14} className={cn("transition-transform", activeSection === section.id ? "rotate-90 text-accent" : "text-text-muted")} />
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="space-y-8">
          {activeSection === 'strategy' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div>
                <h2 className="text-lg font-semibold text-text-primary">Strategy Profile</h2>
                <p className="text-sm text-text-secondary mt-1">Choose how aggressively the AI agent manages your vault.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { id: 'Conservative', label: 'Low Activity', trigger: '3σ', max: '5%', desc: 'Capital preservation with minimal fees.' },
                  { id: 'Balanced', label: 'Recommended', trigger: '2σ', max: '15%', desc: 'Balanced between responsiveness and stability.' },
                  { id: 'Growth', label: 'High Activity', trigger: '1σ', max: '30%', desc: 'Higher activity while remaining inside hard policy limits.' },
                ].map((profile) => (
                  <button
                    key={profile.id}
                    onClick={() => updateConfig({ profile: profile.id as any })}
                    className={cn(
                      "text-left p-6 rounded-lg border transition-all",
                      config.profile === profile.id 
                        ? "bg-accent-dim/10 border-accent ring-1 ring-accent" 
                        : "bg-bg-card border-border-subtle hover:border-border-default"
                    )}
                  >
                    <Badge variant={config.profile === profile.id ? 'accent' : 'default'} className="mb-4">{profile.label}</Badge>
                    <div className="text-md font-bold mb-2">{profile.id}</div>
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-xs">
                        <span className="text-text-muted">Trigger:</span>
                        <span className="text-text-primary font-mono">{profile.trigger}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-text-muted">Max Rebalance:</span>
                        <span className="text-text-primary font-mono">{profile.max}</span>
                      </div>
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed">{profile.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'risk' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div>
                <h2 className="text-lg font-semibold text-text-primary">Risk Parameters</h2>
                <p className="text-sm text-text-secondary mt-1">Fine-tune the boundaries within which the AI agent is allowed to operate.</p>
              </div>

              <Card className="p-8 space-y-8">
                <div className="space-y-6">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-text-muted">Hard Agent Limits</h3>
                  <p className="text-xs text-text-muted">These limits are evaluated by the deterministic Risk Engine. The AI model cannot override them.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {([
                      { key: 'investmentCapUsd', label: 'Investment cap', help: 'Maximum principal delegated to the autonomous vault.' },
                      { key: 'maxSingleTradeUsd', label: 'Maximum single trade', help: 'Maximum USD value of one rebalance operation.' },
                      { key: 'maxDailyTurnoverUsd', label: 'Daily turnover cap', help: 'Maximum total traded value during 24 hours.' },
                      { key: 'maxDrawdownPct', label: 'Maximum drawdown', help: 'New buys stop after this drawdown; de-risking sells remain available.' },
                    ] as const).map((field) => (
                      <label key={field.key} className="space-y-2 rounded-lg border border-border-subtle bg-bg-elevated/50 p-4">
                        <span className="text-sm font-medium">{field.label}</span>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">{field.key === 'maxDrawdownPct' ? '%' : '$'}</span>
                          <input
                            type="number"
                            min="1"
                            value={config[field.key]}
                            onChange={(event) => updateConfig({ [field.key]: Number(event.target.value) } as Partial<AgentConfig>)}
                            className="w-full h-11 rounded-md border border-border-default bg-bg-base pl-8 pr-3 font-mono text-sm focus:outline-none focus:border-accent"
                          />
                        </div>
                        <span className="block text-xs text-text-muted">{field.help}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="pt-8 border-t border-border-subtle">
                  <Button disabled={saving || !address} onClick={handleSaveRisk} className="gap-2">
                    <Save size={16} /> {saving ? 'Saving…' : 'Save Enforced Limits'}
                  </Button>
                  {!address && <p className="text-xs text-warning mt-3">Connect Phantom to bind these limits to your vault profile.</p>}
                </div>
              </Card>
            </div>
          )}

          {activeSection === 'prompt' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div>
                <h2 className="text-lg font-semibold text-text-primary">AI Proposal Policy</h2>
                <p className="text-sm text-text-secondary mt-1">The model may propose actions, but deterministic engines make every approval decision.</p>
              </div>

              <Card className="p-0 overflow-hidden">
                <textarea 
                  className="w-full h-[400px] bg-bg-elevated p-6 font-mono text-sm text-text-secondary focus:outline-none focus:text-text-primary leading-relaxed resize-none"
                  readOnly
                  defaultValue={`You are the Solvex portfolio analysis component running on Solana.

Your role is to analyze market data and produce one structured portfolio proposal.
You do not approve Shariah compliance, risk, simulation, or execution.
Never claim that an asset is halal. Prefer HOLD when evidence is incomplete.

DECISION FRAMEWORK:
1. Analyze the provided market data (price, volatility, volume, liquidity)
2. Consider the vault's current allocation and target allocation
3. Evaluate whether current conditions warrant a rebalance
4. Produce a structured proposal with explicit leverage, derivative, and interest flags
5. Allow the deterministic Shariah and Risk engines to accept or reject it`}
                />
                <div className="p-4 border-t border-border-subtle flex justify-between items-center bg-bg-card">
                  <span className="text-xs text-text-muted">Enforced server-side · version controlled</span>
                  <Badge variant="accent">gpt-6-astra</Badge>
                </div>
              </Card>
              
              <div className="flex items-start gap-3 p-4 bg-info-dim/10 border border-info-dim rounded-md">
                <Info size={16} className="text-info mt-0.5 shrink-0" />
                <p className="text-xs text-info leading-relaxed">
                  The model output is constrained by a JSON schema. It is always treated as an untrusted proposal and cannot bypass the Shariah Firewall or Risk Engine.
                </p>
              </div>
            </div>
          )}

          {/* Other sections would follow similar patterns */}
          {['model', 'data', 'execution', 'notifications', 'keypair'].includes(activeSection) && (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-bg-elevated flex items-center justify-center text-text-muted">
                <Settings2 size={24} />
              </div>
              <div>
                <h3 className="text-md font-semibold text-text-primary">{sections.find(s => s.id === activeSection)?.name}</h3>
                <p className="text-sm text-text-secondary mt-1">This section is available in the full version.</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setActiveSection('strategy')}>Return to Strategy</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
