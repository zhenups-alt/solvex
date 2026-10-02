import React, { useRef } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import {
  Brain, Zap, Shield, Sparkles, ArrowRight,
  Lock, CheckCircle2, Circle, BarChart3, Workflow
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';

/* ─────────────────────────────────────────────────────────────────────────────
   Animation Wrappers
───────────────────────────────────────────────────────────────────────────── */
function FadeUp({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  key?: React.Key;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 36 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function SectionLabel({ children, color = "accent" }: { children: React.ReactNode, color?: "accent" | "cta" | "solana" }) {
  const colorMap = {
    accent: "text-accent fill-accent bg-accent/10 border-accent/20",
    cta: "text-cta fill-cta bg-cta/10 border-cta/20",
    solana: "text-solana fill-solana bg-solana/10 border-solana/20"
  };
  
  return (
    <div className={cn("inline-flex items-center gap-2 px-3 py-1 rounded-full border mb-4", colorMap[color])}>
      <Circle className="w-1.5 h-1.5" />
      <span className="text-[10px] font-bold tracking-[0.2em] uppercase">
        {children}
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Hero Section
───────────────────────────────────────────────────────────────────────────── */
function HeroSection() {
  const current = {
    id: 'illustrative-hold',
    action: 'HOLD',
    amount_pct: 0,
    reasoning: 'Insufficient screening evidence. Fail-closed policy keeps the portfolio unchanged.',
    confidence: 88,
    timestamp: new Date().toISOString(),
  };

  const itemV = {
    hidden: { opacity: 0, y: 28 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { duration: 0.7, delay: 0.3 + i * 0.12, ease: [0.22, 1, 0.36, 1] },
    }),
  };

  return (
    <section className="relative min-h-screen flex items-center px-6 pt-32 pb-24 overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[20%] left-[10%] w-[500px] h-[500px] bg-accent/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[20%] right-[10%] w-[600px] h-[600px] bg-cta/10 blur-[150px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#0F172A_100%)] opacity-80" />
      </div>

      <div className="max-w-7xl mx-auto w-full relative z-10">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-16 items-center">
          
          <div className="space-y-10">
            <motion.div
              custom={0} variants={itemV} initial="hidden" animate="visible"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 backdrop-blur-sm"
            >
              <Sparkles size={12} className="text-accent" />
              <span className="text-[10px] font-bold text-accent uppercase tracking-[0.2em]">
                Autonomous AI Asset Management · Solana
              </span>
            </motion.div>

            <div className="space-y-6">
              <motion.h1
                custom={1} variants={itemV} initial="hidden" animate="visible"
                className="text-6xl sm:text-7xl lg:text-8xl font-bold tracking-tight leading-[0.95]"
              >
                Solana's <br />
                <span className="text-accent">Smarter</span> <br />
                Capital.
              </motion.h1>
              <motion.p
                custom={2} variants={itemV} initial="hidden" animate="visible"
                className="text-lg sm:text-xl text-text-secondary max-w-lg leading-relaxed font-light"
              >
                An autonomous Solana agent constrained by a deterministic
                <span className="text-white font-medium"> Shariah and risk policy pipeline</span>.
                Every proposal and check is preserved in an explainable decision log.
              </motion.p>
            </div>

            <motion.div
              custom={3} variants={itemV} initial="hidden" animate="visible"
              className="flex flex-wrap gap-4"
            >
              <Link to="/dashboard">
                <button className="group relative inline-flex items-center gap-2 bg-accent text-bg-base font-bold h-14 px-8 rounded-2xl hover:brightness-110 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_30px_rgba(245,158,11,0.3)] overflow-hidden">
                  <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                  Launch Terminal <ArrowRight size={18} />
                </button>
              </Link>
              <Link to="/docs">
                <button className="inline-flex items-center gap-2 border border-white/10 bg-white/5 backdrop-blur-sm text-white/80 font-semibold h-14 px-8 rounded-2xl hover:bg-white/10 hover:border-white/20 hover:text-white transition-all">
                  Documentation
                </button>
              </Link>
            </motion.div>

            <motion.div
              custom={4} variants={itemV} initial="hidden" animate="visible"
              className="flex items-center gap-12 pt-4"
            >
              {[
                { label: 'Policy', value: 'v0.1' },
                { label: 'Execution', value: 'Paused' },
                { label: 'Network', value: 'Devnet' },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="text-[10px] text-text-muted uppercase tracking-widest font-bold mb-1">{stat.label}</div>
                  <div className="text-2xl font-bold text-white">{stat.value}</div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Reasoning Visualization */}
          <motion.div
            custom={3} variants={itemV} initial="hidden" animate="visible"
            className="relative lg:block"
          >
            <div className="glass-card !bg-bg-card/60 !p-0 overflow-hidden border-white/10 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.7)]">
              <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
                    <Brain size={20} className="text-accent" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">Illustrative Decision Trace</div>
                    <div className="text-[10px] text-text-muted font-mono">SIMULATION PREVIEW</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                  <span className="text-[10px] font-mono font-bold text-accent">NOT EXECUTED</span>
                </div>
              </div>

              <div className="p-8 min-h-[340px] flex flex-col justify-between">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={current.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="space-y-6"
                  >
                    <div className="flex items-center justify-between">
                      <div className={cn(
                        "px-3 py-1 rounded-lg text-[10px] font-bold tracking-widest uppercase border",
                        current.action.includes('BUY') ? "bg-positive/10 text-positive border-positive/20" : "bg-negative/10 text-negative border-negative/20"
                      )}>
                        {current.action}
                      </div>
                      <div className="text-[10px] font-mono text-text-muted">{new Date(current.timestamp).toLocaleTimeString()}</div>
                    </div>

                    <div className="space-y-3">
                      <div className="text-[10px] text-text-muted uppercase tracking-widest font-bold">Decision Rationale</div>
                      <p className="text-lg text-white/90 leading-relaxed italic font-light">
                        "{current.reasoning}"
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
                        <div className="text-[10px] text-text-muted uppercase tracking-widest font-bold mb-1">Confidence</div>
                        <div className="text-2xl font-bold text-white">{current.confidence.toFixed(1)}%</div>
                      </div>
                      <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
                        <div className="text-[10px] text-text-muted uppercase tracking-widest font-bold mb-1">Impact</div>
                        <div className="text-2xl font-bold text-accent">+{current.amount_pct}%</div>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
                
                <div className="mt-8 flex items-center justify-between pt-6 border-t border-white/[0.06]">
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-2" aria-hidden="true">
                      {[Shield, Lock, Workflow].map((Icon, i) => (
                        <div key={i} className="w-8 h-8 rounded-full border-2 border-bg-base bg-bg-elevated flex items-center justify-center text-accent">
                          <Icon size={12} />
                        </div>
                      ))}
                    </div>
                    <span className="text-[11px] text-text-muted font-medium">No live capital in this preview</span>
                  </div>
                  <Link to="/decisions" className="text-[10px] font-bold text-accent hover:underline uppercase tracking-widest">View Decision Log</Link>
                </div>
              </div>
            </div>
            
            {/* Geometric accents */}
            <div className="absolute -top-6 -right-6 w-24 h-24 border-t-2 border-r-2 border-accent/20" />
            <div className="absolute -bottom-6 -left-6 w-24 h-24 border-b-2 border-l-2 border-accent/20" />
          </motion.div>

        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Features Section
───────────────────────────────────────────────────────────────────────────── */
const features = [
  {
    icon: Brain,
    title: "Structured AI Proposals",
    desc: "The AI agent produces a typed portfolio proposal and rationale. It never bypasses the deterministic policy and risk checks.",
    color: "accent"
  },
  {
    icon: Shield,
    title: "Explainable Decision Log",
    desc: "Every proposal records its rationale, policy result, risk result, and transaction signature when an execution actually occurs.",
    color: "cta"
  },
  {
    icon: Zap,
    title: "Simulation Before Execution",
    desc: "Transactions are simulated before approval. The execution boundary is designed for constrained spot swaps through Jupiter.",
    color: "solana"
  },
  {
    icon: Lock,
    title: "Non-Custodial Security",
    desc: "Funds remain in a per-user program vault. The delegated agent cannot withdraw and may only act within owner-defined limits.",
    color: "accent"
  },
  {
    icon: BarChart3,
    title: "Deterministic Risk Limits",
    desc: "Per-trade and daily caps are enforced independently from the model, with fail-closed behavior when inputs are unavailable or invalid.",
    color: "cta"
  },
  {
    icon: Workflow,
    title: "Shariah Firewall",
    desc: "Assets, protocols, and transaction types are classified Eligible, Review, or Blocked. Review cases are never auto-executed.",
    color: "solana"
  }
];

function FeaturesSection() {
  return (
    <section className="py-32 px-6 bg-white/[0.02]">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-20">
          <SectionLabel>Core Architecture</SectionLabel>
          <h2 className="text-4xl sm:text-5xl font-bold mb-6">A controlled path from proposal to execution.</h2>
          <p className="text-text-secondary leading-relaxed">
            Solvex separates AI analysis from deterministic Shariah policy, risk controls, and Solana execution.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <FadeUp key={f.title} delay={i * 0.1} className="glass-card group hover:-translate-y-1">
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center mb-6 transition-colors",
                f.color === "accent" ? "bg-accent/10 text-accent group-hover:bg-accent group-hover:text-bg-base" : 
                f.color === "cta" ? "bg-cta/10 text-cta group-hover:bg-cta group-hover:text-white" :
                "bg-solana/10 text-solana group-hover:bg-solana group-hover:text-white"
              )}>
                <f.icon size={24} />
              </div>
              <h3 className="text-xl font-bold mb-3">{f.title}</h3>
              <p className="text-sm text-text-secondary leading-relaxed font-light">
                {f.desc}
              </p>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Call to Action Section
───────────────────────────────────────────────────────────────────────────── */
function CTASection() {
  return (
    <section className="py-32 px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-cta/5" />
      <div className="max-w-5xl mx-auto relative z-10 glass-card !bg-bg-card/80 !p-12 sm:!p-20 text-center border-white/10">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cta/10 border border-cta/20 text-cta mb-8">
          <Zap size={14} className="fill-current" />
          <span className="text-[10px] font-bold tracking-widest uppercase">Development Preview</span>
        </div>
        
        <h2 className="text-4xl sm:text-6xl font-bold mb-8 leading-tight">
          Explore policy-constrained <br />
          <span className="text-accent">portfolio automation.</span>
        </h2>
        
        <p className="text-lg text-text-secondary max-w-xl mx-auto mb-12 font-light">
          Connect a devnet wallet, define an investment cap, and inspect each decision before live execution is enabled.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/dashboard" className="inline-flex items-center justify-center bg-cta text-white font-bold h-14 px-10 rounded-2xl hover:brightness-110 transition-all hover:scale-[1.02] shadow-[0_0_40px_rgba(139,92,246,0.3)]">
            Open Devnet App
          </Link>
          <Link to="/architecture" className="inline-flex items-center justify-center border border-white/10 bg-white/5 text-white font-semibold h-14 px-10 rounded-2xl hover:bg-white/10 transition-all">
            Review Architecture
          </Link>
        </div>
        
        <div className="mt-12 flex items-center justify-center gap-8 text-[10px] text-text-muted font-bold uppercase tracking-[0.2em]">
          <span className="flex items-center gap-2"><CheckCircle2 size={12} className="text-positive" /> Non-Custodial</span>
          <span className="flex items-center gap-2"><CheckCircle2 size={12} className="text-positive" /> Fail-Closed</span>
          <span className="flex items-center gap-2"><CheckCircle2 size={12} className="text-positive" /> Devnet Preview</span>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Landing Page Footer
───────────────────────────────────────────────────────────────────────────── */
function Footer() {
  return (
    <footer className="py-20 px-6 border-t border-white/5">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-12 lg:gap-8">
          <div className="col-span-2 lg:col-span-2 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
                <Brain size={24} className="text-bg-base" />
              </div>
              <span className="text-2xl font-bold tracking-tight">SOLVEX</span>
            </div>
            <p className="text-sm text-text-muted max-w-xs leading-relaxed font-light">
              Policy-constrained AI asset management research project on Solana.
              Transparent decisions, deterministic safety checks.
            </p>
          </div>
          
          {[
            { title: 'Platform', links: [['Dashboard', '/dashboard'], ['Vault', '/vault'], ['Agent Config', '/agent-config'], ['Analytics', '/analytics']] },
            { title: 'System', links: [['Architecture', '/architecture'], ['How It Works', '/how-it-works'], ['Decision Log', '/decisions']] },
            { title: 'Resources', links: [['Documentation', '/docs'], ['Settings', '/settings']] }
          ].map((col) => (
            <div key={col.title}>
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-6">{col.title}</h4>
              <ul className="space-y-4">
                {col.links.map(([label, path]) => (
                  <li key={path}><Link to={path} className="text-sm text-text-secondary hover:text-accent transition-colors font-light">{label}</Link></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        
        <div className="mt-20 pt-8 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-6">
          <p className="text-[11px] text-text-muted">Solvex devnet research preview · Not financial or Shariah advice.</p>
          <Link to="/docs" className="text-[11px] text-text-muted hover:text-white">Read the methodology and limitations</Link>
        </div>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg-base text-text-primary selection:bg-accent/30 selection:text-white">
      <HeroSection />
      <FeaturesSection />
      <CTASection />
      <Footer />
    </div>
  );
}
