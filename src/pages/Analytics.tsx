import React from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';
import { Download, Calendar, ArrowUpRight } from 'lucide-react';
import { Card, Button, Badge } from '../components/UI';
import { cn, formatCurrency } from '../lib/utils';

const performanceData = Array.from({ length: 30 }, (_, i) => ({
  date: `Apr ${i + 1}`,
  value: 1000 + Math.random() * 200 + i * 10,
  hodl: 1000 + Math.random() * 150 + i * 5,
}));

const decisionDist = [
  { name: 'BUY_SOL', value: 12, color: '#14F195' },
  { name: 'SELL_SOL', value: 8, color: '#EF4444' },
  { name: 'HOLD', value: 27, color: '#71717A' },
];

export default function AnalyticsPage() {
  return (
    <div className="p-8 space-y-8">
      <header className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Analytics Report</h1>
          <p className="text-text-secondary mt-1">Complete performance analysis of your vault and AI agent.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" className="gap-2">
            <Calendar size={14} /> Last 30 days
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Download size={14} /> Export Report
          </Button>
        </div>
      </header>

      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Absolute Return', value: '+$102.30', sub: '+8.3%', trend: 'up' },
          { label: 'vs. SOL HODL', value: '+5.2%', sub: 'Outperforming', trend: 'up' },
          { label: 'vs. 50/50 HODL', value: '+3.1%', sub: 'Outperforming', trend: 'up' },
          { label: 'Max Drawdown', value: '-2.4%', sub: 'Within limits', trend: 'down' },
        ].map((stat, i) => (
          <Card key={i}>
            <div className="text-xs text-text-muted uppercase tracking-wider mb-2">{stat.label}</div>
            <div className="text-2xl font-mono font-bold text-text-primary">{stat.value}</div>
            <div className="flex items-center gap-1 mt-1">
              <span className={cn("text-xs font-medium", stat.trend === 'up' ? "text-positive" : "text-text-secondary")}>{stat.sub}</span>
            </div>
          </Card>
        ))}
      </div>

      {/* Main Chart */}
      <Card className="p-6">
        <h2 className="text-md font-semibold text-text-primary mb-8">Vault Value Over Time</h2>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={performanceData}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#14F195" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#14F195" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#52525B', fontSize: 11, fontFamily: 'JetBrains Mono' }} 
              />
              <YAxis hide domain={['dataMin - 100', 'dataMax + 100']} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1C1C22', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                itemStyle={{ fontSize: '12px', fontFamily: 'JetBrains Mono' }}
              />
              <Area type="monotone" dataKey="value" stroke="#14F195" strokeWidth={2} fill="url(#colorValue)" name="Solvex" />
              <Area type="monotone" dataKey="hodl" stroke="#71717A" strokeWidth={1} strokeDasharray="4 4" fill="transparent" name="SOL HODL" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-md font-semibold text-text-primary mb-8">Decision Distribution</h2>
          <div className="flex items-center justify-between">
            <div className="h-[200px] w-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={decisionDist}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {decisionDist.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-4 flex-1 ml-8">
              {decisionDist.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm text-text-secondary">{item.name}</span>
                  </div>
                  <span className="text-sm font-mono text-text-primary">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-md font-semibold text-text-primary mb-8">Confidence Distribution</h2>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { bucket: '0.5', count: 2 },
                { bucket: '0.6', count: 5 },
                { bucket: '0.7', count: 12 },
                { bucket: '0.8', count: 18 },
                { bucket: '0.9', count: 10 },
              ]}>
                <XAxis dataKey="bucket" axisLine={false} tickLine={false} tick={{ fill: '#52525B', fontSize: 11 }} />
                <YAxis hide />
                <Bar dataKey="count" fill="#14F195" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[11px] text-text-muted text-center mt-4">Decisions cluster at high confidence (above 0.7)</p>
        </Card>
      </div>
    </div>
  );
}
