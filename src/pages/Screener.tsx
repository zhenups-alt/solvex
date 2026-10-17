import React, { useEffect, useState } from 'react';
import { 
  ShieldCheck, 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  BookOpen, 
  ExternalLink,
  Layers,
  ArrowRight,
  Filter
} from 'lucide-react';
import { Badge, Button, Card } from '../components/UI';
import { useLanguage } from '../i18n';
import { 
  getPolicyCatalog, 
  screenSubject, 
  PolicyCatalogResponse, 
  ScreenSubjectResult,
  CatalogEntryData
} from '../lib/solvexApi';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';

const FALLBACK_CATALOG: PolicyCatalogResponse = {
  methodology: {
    version: 'solvex-shariah-v0.1.0',
    name: 'Solvex conservative automated Shariah screening methodology',
    disclaimer: 'This is a technical screening framework, not a fatwa or a guarantee that an asset is halal. Eligible means that no blocking condition was found under this version and that the asset/protocol was explicitly approved in the versioned catalog.',
    statuses: {
      eligible: 'May proceed to risk checks.',
      review: 'Disputed, incomplete, stale, or unknown; never auto-execute.',
      blocked: 'Explicitly conflicts with a blocking rule; never execute.',
    },
    principles: [
      { code: 'SH-01', name: 'No riba-like mechanism', rule: 'Interest-bearing lending, borrowing, fixed-yield debt, and interest tokens are blocked.' },
      { code: 'SH-02', name: 'No leverage or derivatives', rule: 'Margin, perpetuals, futures, options, synthetic leverage, and liquidation exposure are blocked.' },
      { code: 'SH-03', name: 'Spot ownership and delivery', rule: 'MVP automation is limited to spot swaps with immediate on-chain settlement.' },
      { code: 'SH-04', name: 'Permissible asset purpose', rule: 'Assets with prohibited primary purpose or material prohibited revenue are blocked.' },
      { code: 'SH-05', name: 'Protocol allowlisting', rule: 'Every program in an execution route must be reviewed and explicitly allowlisted.' },
      { code: 'SH-06', name: 'Uncertainty fails closed', rule: 'Unknown, stale, incomplete, or disputed evidence is Review and cannot auto-execute.' },
      { code: 'SH-07', name: 'Versioned human governance', rule: 'Catalog changes require a recorded reviewer, rationale, evidence, and effective date.' },
    ],
  },
  assets: {
    SOL: {
      status: 'eligible',
      rationale: 'Native network utility asset; approved only for direct spot ownership in this MVP.',
      evidence: ['internal-review:asset/SOL:v0.1'],
    },
    USDC: {
      status: 'review',
      rationale: 'Stablecoin reserve composition and issuer revenue require qualified Shariah review.',
      evidence: ['internal-review:asset/USDC:pending'],
    },
  },
  protocols: {
    jupiter_spot_router: {
      status: 'eligible',
      rationale: 'Approved only as a router for verified spot-swap instructions and allowlisted route programs.',
      evidence: ['internal-review:protocol/jupiter-spot:v0.1'],
    },
    orca_whirlpool_spot: {
      status: 'eligible',
      rationale: 'Approved only when used as a spot-swap hop; liquidity provision is outside this approval.',
      evidence: ['internal-review:protocol/orca-spot:v0.1'],
    },
    raydium_amm_spot: {
      status: 'eligible',
      rationale: 'Approved only when used as a spot-swap hop; CLMM positions are outside this approval.',
      evidence: ['internal-review:protocol/raydium-spot:v0.1'],
    },
    jupiter_perpetuals: {
      status: 'blocked',
      rationale: 'Perpetual derivatives and leverage are outside the Solvex Shariah policy.',
      evidence: ['policy:SH-02'],
    },
  },
  transactions: {
    spot_swap: {
      status: 'eligible',
      rationale: 'Spot swaps may proceed only when asset and route checks are also eligible.',
      evidence: ['policy:SH-03'],
    },
    hold: {
      status: 'eligible',
      rationale: 'Holding an existing spot balance does not introduce new exposure.',
      evidence: ['policy:SH-03'],
    },
  },
};

export default function ScreenerPage() {
  const { tr, language } = useLanguage();
  const [catalog, setCatalog] = useState<PolicyCatalogResponse>(FALLBACK_CATALOG);
  const [subjectType, setSubjectType] = useState<'asset' | 'protocol'>('asset');
  const [inputVal, setInputVal] = useState('');
  const [activeResult, setActiveResult] = useState<ScreenSubjectResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    getPolicyCatalog()
      .then((res) => setCatalog(res))
      .catch(() => {
        // Keeps fallback catalog cleanly
      });
    // Automatically screen SOL on load so the result is immediately visible
    void handleScreen('asset', 'SOL');
  }, []);

  const handleScreen = async (type: 'asset' | 'protocol', identifier: string) => {
    const trimmed = identifier.trim();
    if (!trimmed) return;
    setLoading(true);
    setSearchError(null);
    try {
      const result = await screenSubject(type, trimmed);
      setActiveResult(result);
    } catch {
      // Fallback local screening if backend offline
      if (type === 'asset') {
        const key = trimmed.toUpperCase();
        const entry = catalog.assets[key];
        if (entry) {
          setActiveResult({
            subject_type: 'asset',
            identifier: key,
            status: entry.status,
            approved: entry.status === 'eligible',
            code: entry.status === 'eligible' ? 'SH-04-PURPOSE' : 'SH-06-REVIEW',
            rationale: entry.rationale,
            evidence: entry.evidence,
            methodology_version: catalog.methodology.version,
          });
        } else {
          setActiveResult({
            subject_type: 'asset',
            identifier: trimmed,
            status: 'review',
            approved: false,
            code: 'SH-06-UNCERTAINTY',
            rationale: `Asset '${trimmed}' is not present in the verified policy catalog. Unknown or unvetted assets fail closed and cannot be auto-executed.`,
            evidence: ['policy:SH-04', 'policy:SH-06'],
            methodology_version: catalog.methodology.version,
          });
        }
      } else {
        const key = trimmed.toLowerCase();
        const entry = catalog.protocols[key];
        if (entry) {
          setActiveResult({
            subject_type: 'protocol',
            identifier: key,
            status: entry.status,
            approved: entry.status === 'eligible',
            code: entry.status === 'blocked' ? 'SH-02-DERIVATIVE' : 'SH-05-PROTOCOL',
            rationale: entry.rationale,
            evidence: entry.evidence,
            methodology_version: catalog.methodology.version,
          });
        } else {
          setActiveResult({
            subject_type: 'protocol',
            identifier: trimmed,
            status: 'review',
            approved: false,
            code: 'SH-05-PROTOCOL',
            rationale: `Protocol or route program '${trimmed}' is not present in the approved policy catalog. Every program must be explicitly vetted and allowlisted.`,
            evidence: ['policy:SH-05', 'policy:SH-06'],
            methodology_version: catalog.methodology.version,
          });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: 'eligible' | 'review' | 'blocked') => {
    switch (status) {
      case 'eligible':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-positive/10 text-positive border border-positive/20">
            <CheckCircle2 size={14} /> {tr('ELIGIBLE · APPROVED', 'ПРИЕМЛЕМО · ОДОБРЕНО')}
          </span>
        );
      case 'review':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-warning/10 text-warning border border-warning/20">
            <HelpCircle size={14} /> {tr('REVIEW · FAILS CLOSED', 'ПРОВЕРКА · БЛОКИРОВКА')}
          </span>
        );
      case 'blocked':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-negative/10 text-negative border border-negative/20">
            <XCircle size={14} /> {tr('BLOCKED · PROHIBITED', 'ЗАПРЕЩЕНО · НЕДОПУСТИМО')}
          </span>
        );
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <header className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-accent/10 border border-accent/20 text-[11px] font-bold text-accent uppercase tracking-wider">
              <ShieldCheck size={14} /> {catalog.methodology.version}
            </div>
            <h1 className="text-3xl font-bold text-text-primary tracking-tight">
              {tr('Deterministic Shariah Asset Screener', 'Детерминированный Shariah-скринер активов')}
            </h1>
            <p className="text-text-secondary text-sm max-w-2xl leading-relaxed">
              {tr(
                'Evaluate Solana assets and execution protocols before any agent proposal can be executed. Solvex implements a fail-closed screening engine where unvetted subjects default to Review and cannot execute.',
                'Проверка активов Solana и протоколов исполнения перед выполнением любого предложения агента. Solvex использует принцип запрета при неопределенности: непроверенные активы получают статус проверки и блокируются.'
              )}
            </p>
          </div>
          <Link
            to="/docs"
            className="inline-flex items-center gap-2 text-xs font-medium text-accent hover:underline border border-accent/20 bg-accent/5 px-3.5 py-2 rounded-xl"
          >
            <BookOpen size={14} />
            {tr('Methodology & Governance Docs', 'Документация методологии')}
          </Link>
        </div>
      </header>

      {/* Interactive Screener Bar & Preset Buttons */}
      <Card className="p-6 space-y-6 bg-bg-elevated/70 border-white/10 backdrop-blur-md">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted mb-3">
            {tr('Quick Preset Evaluation (Demonstration)', 'Быстрая проверка для демонстрации')}
          </h2>
          <div className="flex flex-wrap gap-2.5">
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "gap-2 bg-white/5 border-white/10 hover:border-positive/50 hover:bg-positive/5 transition-all",
                activeResult?.identifier === 'SOL' && "border-positive bg-positive/10 ring-1 ring-positive shadow-sm"
              )}
              onClick={() => {
                setSubjectType('asset');
                setInputVal('SOL');
                void handleScreen('asset', 'SOL');
              }}
            >
              <span className="w-2 h-2 rounded-full bg-positive" />
              SOL {tr('(Native Utility · Eligible)', '(Нативный актив · Допущено)')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "gap-2 bg-white/5 border-white/10 hover:border-warning/50 hover:bg-warning/5 transition-all",
                activeResult?.identifier === 'USDC' && "border-warning bg-warning/10 ring-1 ring-warning shadow-sm"
              )}
              onClick={() => {
                setSubjectType('asset');
                setInputVal('USDC');
                void handleScreen('asset', 'USDC');
              }}
            >
              <span className="w-2 h-2 rounded-full bg-warning" />
              USDC {tr('(Reserve Review · Review)', '(Резервы на проверке · Проверка)')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "gap-2 bg-white/5 border-white/10 hover:border-negative/50 hover:bg-negative/5 transition-all",
                activeResult?.identifier === 'jupiter_perpetuals' && "border-negative bg-negative/10 ring-1 ring-negative shadow-sm"
              )}
              onClick={() => {
                setSubjectType('protocol');
                setInputVal('jupiter_perpetuals');
                void handleScreen('protocol', 'jupiter_perpetuals');
              }}
            >
              <span className="w-2 h-2 rounded-full bg-negative" />
              Jupiter Perpetuals {tr('(Leverage · Blocked)', '(Деривативы · Запрещено)')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "gap-2 bg-white/5 border-white/10 hover:border-positive/50 hover:bg-positive/5 transition-all",
                activeResult?.identifier === 'orca_whirlpool_spot' && "border-positive bg-positive/10 ring-1 ring-positive shadow-sm"
              )}
              onClick={() => {
                setSubjectType('protocol');
                setInputVal('orca_whirlpool_spot');
                void handleScreen('protocol', 'orca_whirlpool_spot');
              }}
            >
              <span className="w-2 h-2 rounded-full bg-positive" />
              Orca Whirlpool {tr('(Spot Hop · Eligible)', '(Спот · Допущено)')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "gap-2 bg-white/5 border-white/10 hover:border-warning/50 hover:bg-warning/5 transition-all",
                activeResult?.identifier === 'So11111111111111111111111111111111111111112' && "border-warning bg-warning/10 ring-1 ring-warning shadow-sm"
              )}
              onClick={() => {
                const mint = 'So11111111111111111111111111111111111111112';
                setSubjectType('asset');
                setInputVal(mint);
                void handleScreen('asset', mint);
              }}
            >
              <span className="w-2 h-2 rounded-full bg-warning" />
              {tr('Custom Solana Token Mint Address', 'Произвольный адрес токена')}
            </Button>
          </div>
        </div>

        {/* Input Form */}
        <div className="space-y-4 pt-2 border-t border-white/5">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex rounded-lg border border-white/10 bg-white/5 p-1">
              <button
                type="button"
                onClick={() => setSubjectType('asset')}
                className={cn(
                  'px-3 py-1.5 rounded-md text-xs font-semibold transition-colors',
                  subjectType === 'asset' ? 'bg-accent text-bg-base' : 'text-text-muted hover:text-white'
                )}
              >
                {tr('Asset / Token Mint', 'Актив / Токен')}
              </button>
              <button
                type="button"
                onClick={() => setSubjectType('protocol')}
                className={cn(
                  'px-3 py-1.5 rounded-md text-xs font-semibold transition-colors',
                  subjectType === 'protocol' ? 'bg-accent text-bg-base' : 'text-text-muted hover:text-white'
                )}
              >
                {tr('Protocol / Program ID', 'Протокол / Программа')}
              </button>
            </div>

            <div className="relative flex-1 min-w-[280px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
              <input
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleScreen(subjectType, inputVal);
                }}
                placeholder={
                  subjectType === 'asset'
                    ? tr('Enter symbol (e.g. SOL, USDC) or token mint address...', 'Символ (SOL, USDC) или адрес минта...')
                    : tr('Enter protocol ID (e.g. jupiter_perpetuals, raydium_amm_spot)...', 'ID протокола (jupiter_perpetuals, orca)...')
                }
                className="w-full h-11 bg-bg-base/80 border border-white/10 rounded-xl pl-10 pr-4 text-sm focus:outline-none focus:border-accent text-white placeholder:text-text-muted/60"
              />
            </div>

            <Button
              onClick={() => void handleScreen(subjectType, inputVal)}
              disabled={loading || !inputVal.trim()}
              className="h-11 px-6 font-semibold"
            >
              {loading ? tr('Evaluating…', 'Анализ…') : tr('Run Policy Screen', 'Запустить проверку')}
            </Button>
          </div>
          {searchError && (
            <p className="text-xs text-negative">{searchError}</p>
          )}
        </div>
      </Card>

      {/* Screen Result Card */}
      {activeResult && (
        <Card className={cn(
          "p-6 md:p-8 space-y-6 transition-all border",
          activeResult.status === 'eligible' && "border-positive/30 bg-positive/[0.02]",
          activeResult.status === 'review' && "border-warning/30 bg-warning/[0.02]",
          activeResult.status === 'blocked' && "border-negative/30 bg-negative/[0.02]"
        )}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs font-mono uppercase text-text-muted">
                  {activeResult.subject_type.toUpperCase()}
                </span>
                <span className="text-2xl font-bold font-mono text-white">
                  {activeResult.identifier}
                </span>
                {getStatusBadge(activeResult.status)}
              </div>
              <p className="text-sm text-text-secondary max-w-3xl leading-relaxed mt-2">
                {activeResult.rationale}
              </p>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-text-muted uppercase tracking-wider font-mono">
                {tr('Rule Code', 'Код правила')}
              </div>
              <div className="text-lg font-mono font-bold text-accent">
                {activeResult.code}
              </div>
            </div>
          </div>

          {/* Execution Implication */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-white/10">
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
              <div className="text-[11px] text-text-muted uppercase font-bold">{tr('Execution Verdict', 'Вердикт исполнения')}</div>
              <div className={cn(
                "text-sm font-semibold",
                activeResult.approved ? "text-positive" : "text-negative"
              )}>
                {activeResult.approved 
                  ? tr('Permitted for AI Proposals', 'Разрешено для предложений ИИ') 
                  : tr('Execution Blocked', 'Исполнение заблокировано')}
              </div>
              <p className="text-xs text-text-muted">
                {activeResult.status === 'review'
                  ? tr('Fails closed: requires recorded governance approval.', 'Запрет по умолчанию: требуется запись одобрения.')
                  : activeResult.status === 'blocked'
                  ? tr('Violates strict Shariah firewall invariants.', 'Прямое нарушение защитного инварианта.')
                  : tr('Passed all configured constraints.', 'Прошло все настроенные ограничения.')}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
              <div className="text-[11px] text-text-muted uppercase font-bold">{tr('Evidence References', 'Ссылки на доказательства')}</div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {activeResult.evidence.map((ev) => (
                  <span key={ev} className="font-mono text-[11px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-text-secondary">
                    {ev}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
              <div className="text-[11px] text-text-muted uppercase font-bold">{tr('Methodology Version', 'Версия методологии')}</div>
              <div className="text-sm font-mono text-text-primary">{activeResult.methodology_version}</div>
              <p className="text-xs text-text-muted">{tr('Deterministic policy engine', 'Детерминированный движок политик')}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Catalog Overview & Core Principles Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Approved Catalog Summary */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-white mb-1">
              {tr('Approved Policy Catalog v0.1', 'Утверждённый каталог политик v0.1')}
            </h2>
            <p className="text-xs text-text-secondary">
              {tr('Bootstrap catalog verified under the Solvex technical screening guidelines.', 'Начальный каталог, проверенный по техническим стандартам Solvex.')}
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">
              {tr('Assets', 'Активы')}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.entries(catalog.assets).map(([symbol, item]) => {
                const asset = item as CatalogEntryData;
                return (
                  <div 
                    key={symbol}
                    onClick={() => {
                      setInputVal(symbol);
                      setSubjectType('asset');
                      void handleScreen('asset', symbol);
                    }}
                    className="p-4 rounded-xl bg-bg-elevated border border-white/5 hover:border-white/20 transition-all cursor-pointer space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-base text-white">{symbol}</span>
                      {getStatusBadge(asset.status)}
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed line-clamp-2">
                      {asset.rationale}
                    </p>
                  </div>
                );
              })}
            </div>

            <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted pt-2">
              {tr('Execution Protocols & Programs', 'Протоколы исполнения и программы')}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.entries(catalog.protocols).map(([pid, item]) => {
                const proto = item as CatalogEntryData;
                return (
                  <div 
                    key={pid}
                    onClick={() => {
                      setInputVal(pid);
                      setSubjectType('protocol');
                      void handleScreen('protocol', pid);
                    }}
                    className="p-4 rounded-xl bg-bg-elevated border border-white/5 hover:border-white/20 transition-all cursor-pointer space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-sm text-white truncate max-w-[160px]">{pid}</span>
                      {getStatusBadge(proto.status)}
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed line-clamp-2">
                      {proto.rationale}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Shariah Policy Rules Checklist */}
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold text-white mb-1">
              {tr('Firewall Rules Checklist', 'Чеклист правил файрвола')}
            </h2>
            <p className="text-xs text-text-secondary">
              {tr('Deterministic rule codes checked before trade proposal submission.', 'Детерминированные коды правил, проверяемые перед отправкой предложений.')}
            </p>
          </div>

          <div className="space-y-2.5">
            {catalog.methodology.principles.map((principle) => (
              <div 
                key={principle.code}
                className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1 hover:border-white/10 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-accent">{principle.code}</span>
                  <span className="text-xs font-semibold text-text-primary">{principle.name}</span>
                </div>
                <p className="text-xs text-text-muted leading-relaxed">
                  {principle.rule}
                </p>
              </div>
            ))}
          </div>

          {/* Disclaimer Box */}
          <div className="p-4 rounded-xl bg-warning/5 border border-warning/20 space-y-2">
            <div className="flex items-center gap-2 text-warning text-xs font-bold uppercase tracking-wider">
              <AlertTriangle size={14} /> {tr('Framework Scope', 'Рамки методологии')}
            </div>
            <p className="text-xs text-text-muted leading-relaxed">
              {catalog.methodology.disclaimer}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
