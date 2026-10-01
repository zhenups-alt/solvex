import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Card, CardContent } from './ui/card';

interface StatCard {
  label: string;
  value: string;
  prefix?: string;
  trend: string;
  isPositive: boolean;
}

const stats: StatCard[] = [
  { label: 'SOL Balance', value: '4.2500', prefix: 'SOL', trend: '+2.4%', isPositive: true },
  { label: 'Portfolio USD', value: '612.40', prefix: '$', trend: '+5.2%', isPositive: true },
  { label: 'Transactions', value: '142', trend: '+12', isPositive: true },
  { label: 'Actions Today', value: '24', trend: '-2', isPositive: false },
];

export const StatsRow = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 w-full">
      {stats.map((stat, i) => (
        <Card 
          key={stat.label} 
          className="group relative overflow-hidden bg-white/[0.02] hover:bg-white/[0.04] border-white/10 hover:border-white/20 transition-all duration-300 cursor-default shadow-[0_4px_20px_rgb(0,0,0,0.1)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.15)] flex flex-col justify-between"
          style={{ animationDelay: `${(i + 1) * 50}ms` }}
        >
          {/* Top glow right corner */}
          <div className="absolute -top-10 -right-10 w-24 h-24 bg-white/5 rounded-full blur-2xl group-hover:bg-cyan-500/10 transition-colors duration-500"></div>

          <CardContent className="p-4.5 flex flex-col h-full min-h-[105px] z-10 relative">
            <div className="text-[13px] text-muted-foreground/80 font-medium tracking-wide uppercase mb-2">
              {stat.label}
            </div>
            
            <div className="flex items-end justify-between mt-auto w-full">
              <div className="flex items-baseline gap-1">
                {stat.prefix && <span className="text-sm font-medium text-cyan-400/70">{stat.prefix}</span>}
                <span className="text-2xl font-semibold text-foreground font-mono tracking-tight leading-none bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                  {stat.value}
                </span>
              </div>
              
              <div className={`flex items-center text-xs font-semibold px-2 py-1 rounded-md backdrop-blur-md ${stat.isPositive ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' : 'text-red-400 bg-red-500/10 border border-red-500/20'}`}>
                {stat.isPositive ? <ArrowUpRight className="h-3 w-3 mr-1 opacity-80" /> : <ArrowDownRight className="h-3 w-3 mr-1 opacity-80" />}
                {stat.trend}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
