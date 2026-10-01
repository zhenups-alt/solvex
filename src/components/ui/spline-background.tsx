import React, { Suspense, lazy } from 'react';

const Spline = lazy(() => import('@splinetool/react-spline'));

export function HeroSplineBackground({ children }: { children?: React.ReactNode }) {
  return (
    <div className="relative w-full min-h-screen overflow-hidden bg-[#09090B]">
      {/* Background layer — shifted up ~12% to show more of the scene */}
      <div
        className="absolute z-0 pointer-events-auto"
        style={{ top: '-12%', left: 0, right: 0, bottom: 0 }}
      >
        <Suspense fallback={<div className="w-full h-full bg-[#09090B]" />}>
          <Spline
            style={{
              width: '100%',
              height: '112%',
              pointerEvents: 'auto',
            }}
            scene="https://prod.spline.design/us3ALejTXl6usHZ7/scene.splinecode"
          />
        </Suspense>

        {/* Gradient overlays */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `
              linear-gradient(to bottom, rgba(9,9,11,0.15) 0%, transparent 25%, transparent 60%, rgba(9,9,11,1) 100%),
              radial-gradient(ellipse at 50% 50%, transparent 35%, rgba(9,9,11,0.4) 100%)
            `,
          }}
        />
      </div>

      {/* Content layer */}
      <div className="relative z-10 w-full">
        {children}
      </div>
    </div>
  );
}
