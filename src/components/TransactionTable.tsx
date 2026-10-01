import React from 'react';
import { ExternalLink } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";

const transactions = [
  { type: 'Swap', amount: '2.5 SOL → USDC', address: 'Jup...V4g1', status: 'Confirmed', time: '2m ago', hash: '5xK9Lm' },
  { type: 'Transfer', amount: '1.0 SOL', address: 'HN3x...9s2R', status: 'Pending', time: '5m ago', hash: '2bQ1Np' },
  { type: 'Buy', amount: '150 USDC', address: 'Ray...7Q1w', status: 'Confirmed', time: '1h ago', hash: '9vL4Kp' },
  { type: 'Stake', amount: '10.0 SOL', address: 'Stk...x91B', status: 'Failed', time: '2h ago', hash: '1mZ8Rq' },
  { type: 'Swap', amount: '0.5 SOL → BONK', address: 'Jup...V4g1', status: 'Confirmed', time: '5h ago', hash: '7pX2Qn' },
];

export const TransactionTable = () => {
  return (
    <Card className="w-full bg-white/[0.02] border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.12)] backdrop-blur-xl relative overflow-hidden group">
      {/* Subtle top glare */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

      <div className="px-5 pt-5 pb-3 border-b border-white/5 flex justify-between items-center">
        <h3 className="text-[14px] font-semibold tracking-wide text-foreground uppercase opacity-90">Recent Activity</h3>
      </div>

      <Table>
        <TableHeader className="bg-transparent">
          <TableRow className="border-b border-white/5 hover:bg-transparent">
            <TableHead className="w-[100px] text-[11px] font-medium text-muted-foreground/70 uppercase tracking-widest pl-5">Type</TableHead>
            <TableHead className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-widest">Amount</TableHead>
            <TableHead className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-widest">Target</TableHead>
            <TableHead className="w-[100px] text-[11px] font-medium text-muted-foreground/70 uppercase tracking-widest">Status</TableHead>
            <TableHead className="w-[80px] text-[11px] font-medium text-muted-foreground/70 uppercase tracking-widest">Time</TableHead>
            <TableHead className="w-[50px] pr-5"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center text-sm text-muted-foreground/50">
                No active transactions discovered in the ledger.
              </TableCell>
            </TableRow>
          ) : (
            transactions.map((tx, i) => (
              <TableRow key={i} className="border-b border-white/[0.03] hover:bg-white/[0.04] transition-all duration-300 h-14 group/row">
                <TableCell className="font-semibold text-foreground/90 text-xs pl-5 tracking-wide">{tx.type}</TableCell>
                <TableCell className="font-mono text-foreground text-[13px]">{tx.amount}</TableCell>
                <TableCell className="font-mono text-muted-foreground/80 text-xs">{tx.address}</TableCell>
                <TableCell>
                  <Badge 
                    variant="outline" 
                    className={`
                      text-[10px] font-semibold border px-2 py-0.5 rounded backdrop-blur-md transition-all
                      ${tx.status === 'Confirmed' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' : ''}
                      ${tx.status === 'Pending' ? 'border-amber-500/20 bg-amber-500/10 text-amber-400' : ''}
                      ${tx.status === 'Failed' ? 'border-red-500/20 bg-red-500/10 text-red-400' : ''}
                    `}
                  >
                    {tx.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground/60 text-xs">{tx.time}</TableCell>
                <TableCell className="text-right pr-5">
                  <a href="#" className="flex justify-end text-muted-foreground/40 hover:text-cyan-400 transition-colors inline-block group-hover/row:text-muted-foreground/80">
                    <ExternalLink className="h-[14px] w-[14px]" />
                  </a>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Card>
  );
};
