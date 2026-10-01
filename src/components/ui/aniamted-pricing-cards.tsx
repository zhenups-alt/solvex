/**
 * aniamted-pricing-cards.tsx  (adapted from 21st.dev — Next.js → React Router)
 * Rethemed: waves/crosses use the site accent + solana purple palette.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

/* ── SVG Decorations ───────────────────────────────────────────────────────── */

export const Wave = ({ stroke = '#14F195' }: { stroke?: string }) => (
  <svg
    width="129"
    height="1387"
    viewBox="0 0 129 1387"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M11.2131 11L106.283 106.07M106.283 106.07L117.279 117.066M106.283 106.07L22.2962 190.003M106.283 106.07L116.688 95.6708M11.2962 200.997L22.2962 190.003M22.2962 190.003L11.2529 178.96M22.2962 190.003L106.323 274.03M106.323 274.03L117.319 285.026M106.323 274.03L22.4537 357.846M106.323 274.03L116.728 263.631M11.3361 368.957L22.4537 357.846M22.4537 357.846L11.5493 346.901M22.4537 357.846L106.44 442.149M106.44 442.149L117.416 453.166M106.44 442.149L22.2962 525.925M106.44 442.149L116.865 431.769M11.2756 536.897L22.2962 525.925M22.2962 525.925L11.2737 514.861M22.2962 525.925L106.165 610.109M106.165 610.109L117.14 621.126M106.165 610.109L11 704.857M106.165 610.109L116.59 599.729M11.2131 683L106.283 778.07M106.283 778.07L117.279 789.066M106.283 778.07L22.2962 862.003M106.283 778.07L116.688 767.671M11.2962 872.997L22.2962 862.003M22.2962 862.003L11.2529 850.96M22.2962 862.003L106.323 946.03M106.323 946.03L117.319 957.026M106.323 946.03L22.4537 1029.85M106.323 946.03L116.728 935.631M11.3361 1040.96L22.4537 1029.85M22.4537 1029.85L11.5493 1018.9M22.4537 1029.85L106.44 1114.15M106.44 1114.15L117.416 1125.17M106.44 1114.15L22.2962 1197.92M106.44 1114.15L116.865 1103.77M11.2756 1208.9L22.2962 1197.92M22.2962 1197.92L11.2737 1186.86M22.2962 1197.92L106.165 1282.11M106.165 1282.11L117.14 1293.13M106.165 1282.11L11 1376.86M106.165 1282.11L116.59 1271.73"
      stroke={stroke}
      strokeWidth="31"
    />
  </svg>
);

export const Cross = ({ stroke = '#9945FF' }: { stroke?: string }) => (
  <svg
    width="130"
    height="130"
    viewBox="0 0 130 130"
    fill="none"
    className="scale-125"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M11 11L118.899 119M11.101 119L119 11" stroke={stroke} strokeWidth="31" />
  </svg>
);

/* ── PricingWrapper ─────────────────────────────────────────────────────────── */

export const PricingWrapper: React.FC<{
  children: React.ReactNode;
  type?: 'waves' | 'crosses';
  /** React Router path */
  contactHref: string;
  contactLabel?: string;
  className?: string;
  waveStroke?: string;
  crossStroke?: string;
}> = ({
  children,
  contactHref,
  contactLabel = 'Get Started',
  className,
  type = 'waves',
  waveStroke = '#14F195',
  crossStroke = '#9945FF',
}) => (
  <article
    className={cn(
      'min-h-[300px] h-[500px] max-w-sm w-full relative overflow-hidden rounded-2xl text-white',
      'border border-white/10 bg-white/[0.03] backdrop-blur-xl',
      className
    )}
  >
    {/* Content layer */}
    <span className="w-full h-full absolute top-0 left-0 z-[2] p-6 flex flex-col items-start justify-start gap-6">
      {children}
      <div className="w-full h-full flex items-end justify-end text-base">
        <Link to={contactHref} className="w-full h-fit">
          <button className="h-12 w-full bg-accent rounded-xl text-black font-bold hover:brightness-110 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_20px_rgba(20,241,149,0.25)]">
            {contactLabel}
          </button>
        </Link>
      </div>
    </span>

    {/* Wave decoration */}
    {type === 'waves' && (
      <>
        <div className="w-fit h-fit absolute -top-[106px] sm:left-4 -left-0 opacity-20 z-0">
          <Wave stroke={waveStroke} />
        </div>
        <div className="w-fit h-fit absolute -top-[106px] sm:right-4 -right-0 opacity-20 z-0">
          <Wave stroke={waveStroke} />
        </div>
      </>
    )}

    {/* Cross decoration */}
    {type === 'crosses' && (
      <>
        <div className="w-fit h-fit absolute top-0 -left-10 z-0 animate-[spin_8s_linear_infinite] opacity-25">
          <Cross stroke={crossStroke} />
        </div>
        <div className="w-fit h-fit absolute top-1/2 -right-12 z-0 animate-[spin_8s_linear_infinite] opacity-25">
          <Cross stroke={crossStroke} />
        </div>
        <div className="w-fit h-fit absolute top-[85%] -left-5 z-0 animate-[spin_6s_linear_infinite] opacity-25">
          <Cross stroke={crossStroke} />
        </div>
      </>
    )}
  </article>
);

/* ── Typography helpers ─────────────────────────────────────────────────────── */

export const CardHeading: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <h3 className={cn('text-2xl sm:text-3xl leading-[1.1] font-bold text-white', className)}>
    {children}
  </h3>
);

export const CardPrice: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <div style={{ lineHeight: '1' }} className={cn('text-4xl sm:text-5xl font-bold text-accent', className)}>
    {children}
  </div>
);

export const CardParagraph: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <p className={cn('text-sm sm:text-base text-white/60 font-medium leading-relaxed', className)}>
    {children}
  </p>
);
