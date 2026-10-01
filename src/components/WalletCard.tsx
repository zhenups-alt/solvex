import React from 'react';
import { usePhantom } from './WalletContextProvider';
import { truncateAddress } from '../lib/utils';
import { Copy, ExternalLink, LogOut, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

export const WalletCard = () => {
  const { connected, address, balance, network, disconnect } = usePhantom();

  if (!connected || !address) return null;

  return (
    <Card className="w-full mb-4 bg-white/[0.02] border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.12)] backdrop-blur-xl relative overflow-hidden group">
      {/* Subtle top glare */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
      
      <CardContent className="p-5 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-white/5 border border-white/10 text-muted-foreground group-hover:text-cyan-400 group-hover:border-cyan-400/30 transition-colors">
              <Wallet className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold text-muted-foreground group-hover:text-foreground transition-colors">Phantom Wallet</span>
          </div>
          <Badge variant="outline" className="flex items-center gap-1.5 uppercase text-[10px] tracking-wider py-0.5 px-2.5 bg-black/20 border-white/10 text-muted-foreground font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-[pulse-dot_2s_ease-in-out_infinite]" />
            {network}
          </Badge>
        </div>

        <div className="flex justify-between items-center bg-black/20 p-2.5 rounded-lg border border-white/5">
           <span className="font-mono text-sm text-foreground/90 font-medium tracking-wide">
            {truncateAddress(address)}
          </span>
          <Button
            variant="ghost" 
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground hover:bg-white/10 hover:text-foreground transition-colors rounded"
            onClick={() => { navigator.clipboard.writeText(address); toast.success('Address copied'); }}
          >
            <Copy className="h-3.5 w-3.5 mr-1.5" /> Copy
          </Button>
        </div>

        <div className="flex flex-col gap-1 py-1">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-1">Balance</div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-4xl font-semibold text-foreground tracking-tight leading-none bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
              {balance !== null ? balance.toFixed(4) : '---'}
            </span>
            <span className="text-sm font-medium text-cyan-400/80">SOL</span>
          </div>
          <div className="text-sm font-mono text-muted-foreground/70 mt-1">
            ≈ ${(balance !== null ? balance * 144.20 : 0).toFixed(2)} USD
          </div>
        </div>

        <div className="flex gap-3 pt-3 mt-1 border-t border-white/5">
          <Button
            variant="outline"
            className="flex-1 h-9 text-xs font-medium bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 hover:text-foreground transition-all shadow-sm"
            asChild
          >
            <a href={`https://explorer.solana.com/address/${address}?cluster=${network}`} target="_blank" rel="noopener noreferrer">
              Explorer <ExternalLink className="ml-1.5 h-3.5 w-3.5 opacity-70" />
            </a>
          </Button>
          <Button
            variant="destructive"
            className="h-9 px-4 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/30 transition-all shadow-sm"
            onClick={disconnect}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
