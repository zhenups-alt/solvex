import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

function ElegantShape({
  className,
  delay = 0,
  width = 400,
  height = 100,
  rotate = 0,
  gradient = 'from-white/[0.08]',
}: {
  className?: string;
  delay?: number;
  width?: number;
  height?: number;
  rotate?: number;
  gradient?: string;
}) {
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: -150,
        rotate: rotate - 15,
      }}
      animate={{
        opacity: 1,
        y: 0,
        rotate,
      }}
      transition={{
        duration: 2.4,
        delay,
        ease: [0.23, 0.86, 0.39, 0.96],
        opacity: { duration: 1.2 },
      }}
      className={cn('absolute', className)}
    >
      <motion.div
        animate={{
          y: [0, 15, 0],
        }}
        transition={{
          duration: 12,
          repeat: Number.POSITIVE_INFINITY,
          ease: 'easeInOut',
        }}
        style={{
          width,
          height,
        }}
        className="relative"
      >
        <div
          className={cn(
            'absolute inset-0 rounded-full',
            'bg-gradient-to-r to-transparent',
            gradient,
            'border-2 border-white/[0.15] shadow-[0_8px_32px_0_rgba(255,255,255,0.1)] backdrop-blur-[2px]',
            'after:absolute after:inset-0 after:rounded-full',
            'after:bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.2),transparent_70%)]'
          )}
        />
      </motion.div>
    </motion.div>
  );
}

type HeroGeometricBackgroundProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Full-bleed geometric hero backdrop (gradient mesh + floating ellipses).
 * Pair with `relative z-10` content. Uses app base #09090B for continuity.
 */
export function HeroGeometricBackground({
  children,
  className,
}: HeroGeometricBackgroundProps) {
  return (
    <div
      className={cn(
        'relative min-h-screen w-full overflow-hidden bg-[#09090B]',
        className
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-accent/[0.06] via-transparent to-solana/[0.06] blur-3xl" />
      <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/[0.04] via-transparent to-rose-500/[0.05] blur-3xl" />

      <div className="absolute inset-0 overflow-hidden">
        <ElegantShape
          delay={0.3}
          width={600}
          height={140}
          rotate={12}
          gradient="from-emerald-400/[0.12]"
          className="left-[-10%] top-[15%] md:left-[-5%] md:top-[20%]"
        />

        <ElegantShape
          delay={0.5}
          width={500}
          height={120}
          rotate={-15}
          gradient="from-rose-500/[0.12]"
          className="right-[-5%] top-[70%] md:right-[0%] md:top-[75%]"
        />

        <ElegantShape
          delay={0.4}
          width={300}
          height={80}
          rotate={-8}
          gradient="from-violet-500/[0.12]"
          className="bottom-[5%] left-[5%] md:bottom-[10%] md:left-[10%]"
        />

        <ElegantShape
          delay={0.6}
          width={200}
          height={60}
          rotate={20}
          gradient="from-amber-500/[0.10]"
          className="right-[15%] top-[10%] md:right-[20%] md:top-[15%]"
        />

        <ElegantShape
          delay={0.7}
          width={150}
          height={40}
          rotate={-25}
          gradient="from-cyan-500/[0.10]"
          className="left-[20%] top-[5%] md:left-[25%] md:top-[10%]"
        />

        <ElegantShape
          delay={0.55}
          width={380}
          height={100}
          rotate={6}
          gradient="from-indigo-400/[0.10]"
          className="left-[40%] top-[45%] hidden md:block"
        />
      </div>

      {/* Vignette: above shapes, below content */}
      <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-[#09090B] via-transparent to-[#09090B]/85" />

      <div className="relative z-10">{children}</div>
    </div>
  );
}

/** Alias for consumers expecting the original component name. */
export { HeroGeometricBackground as HeroGeometric };
