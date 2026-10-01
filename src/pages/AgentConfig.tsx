import React, { useState } from 'react';
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
import { useStore } from '../store';
import { cn } from '../lib/utils';

export default function AgentConfigPage() {
  const [activeSection, setActiveSection] = useState('strategy');
  const { config, updateConfig } = useStore();

  const sections = [
    { id: 'strategy', name: 'Strategy Profile', icon: Activity },
    { id: 'risk', name: 'Risk Parameters', icon: Shield },
    { id: 'model', name: 'AI Model Settings', icon: Brain },
    { id: 'data', name: 'Market Data Sources', icon: Cpu },
    { id: 'prompt', name: 'Claude System Prompt', icon: Settings2 },
    { id: 'execution', name: 'Execution Rules', icon: Zap },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'keypair', name: 'Agent Keypair', icon: Key },
  ];

  return (
    <div className="p-8 space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-text-primary">Agent Configuration</h1>
        <p className="text-text-secondary mt-1">Configure how Claude manages your vault.</p>
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
                  { id: 'Aggressive', label: 'High Activity', trigger: '1σ', max: '30%', desc: 'Maximum responsiveness to market conditions.' },
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
                <p className="text-sm text-text-secondary mt-1">Fine-tune the boundaries within which Claude is allowed to operate.</p>
              </div>

              <Card className="p-8 space-y-8">
                <div className="space-y-6">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-text-muted">Position Limits</h3>
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <label className="text-sm font-medium">Max SOL Allocation</label>
                        <span className="text-sm font-mono text-accent">{config.maxSolAllocation}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" max="100" 
                        value={config.maxSolAllocation}
                        onChange={(e) => updateConfig({ maxSolAllocation: parseInt(e.target.value) })}
                        className="w-full h-1.5 bg-bg-elevated rounded-lg appearance-none cursor-pointer accent-accent"
                      />
                      <p className="text-xs text-text-muted">Never hold more than {config.maxSolAllocation}% of vault value in SOL.</p>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <label className="text-sm font-medium">Min USDC Reserve</label>
                        <span className="text-sm font-mono text-accent">{config.minUsdcReserve}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" max="50" 
                        value={config.minUsdcReserve}
                        onChange={(e) => updateConfig({ minUsdcReserve: parseInt(e.target.value) })}
                        className="w-full h-1.5 bg-bg-elevated rounded-lg appearance-none cursor-pointer accent-accent"
                      />
                      <p className="text-xs text-text-muted">Always keep at least {config.minUsdcReserve}% in USDC for stability.</p>
                    </div>
                  </div>
                </div>

                <div className="pt-8 border-t border-border-subtle">
                  <Button className="gap-2"><Save size={16} /> Save Risk Parameters</Button>
                </div>
              </Card>
            </div>
          )}

          {activeSection === 'prompt' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div>
                <h2 className="text-lg font-semibold text-text-primary">Claude System Prompt</h2>
                <p className="text-sm text-text-secondary mt-1">Customize the instructions sent to Claude before every analysis.</p>
              </div>

              <Card className="p-0 overflow-hidden">
                <textarea 
                  className="w-full h-[400px] bg-bg-elevated p-6 font-mono text-sm text-text-secondary focus:outline-none focus:text-text-primary leading-relaxed resize-none"
                  defaultValue={`You are Solvex, an autonomous DeFi asset management AI running on Solana.

Your role is to analyze market data and make allocation decisions for a SOL/USDC vault, strictly within the risk parameters defined by the vault owner.

DECISION FRAMEWORK:
1. Analyze the provided market data (price, volatility, volume, liquidity)
2. Consider the vault's current allocation and target allocation
3. Evaluate whether current conditions warrant a rebalance
4. Apply the configured risk profile constraints
5. Produce a structured decision with clear reasoning

OUTPUT FORMAT (respond ONLY with this JSON):
{
  "action": "BUY_SOL" | "SELL_SOL" | "HOLD",
  "amount_pct": <number 0-100>,
  "confidence": <number 0-1>,
  "reasoning": "<full natural language reasoning>",
  "key_signals": ["<signal 1>", "<signal 2>"]
}`}
                />
                <div className="p-4 border-t border-border-subtle flex justify-between items-center bg-bg-card">
                  <button className="text-xs text-text-muted hover:text-text-primary transition-colors">Reset to Default</button>
                  <div className="flex gap-3">
                    <Button variant="outline" size="sm">Test Prompt</Button>
                    <Button size="sm">Save Prompt</Button>
                  </div>
                </div>
              </Card>
              
              <div className="flex items-start gap-3 p-4 bg-info-dim/10 border border-info-dim rounded-md">
                <Info size={16} className="text-info mt-0.5 shrink-0" />
                <p className="text-xs text-info leading-relaxed">
                  Changes to the system prompt are not written on-chain. They are stored locally and sent with each API call to the Claude model.
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
