import React, { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { Card, CardHeader, CardContent, CardFooter } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Badge } from './ui/badge';

type Sender = 'user' | 'agent' | 'system';

interface Message {
  id: string;
  sender: Sender;
  text: string;
  isAction?: boolean;
  actionDetails?: { type: string; amount: string; status: 'Pending' | 'Confirmed' | 'Failed' };
}

export const AgentChat = () => {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', sender: 'system', text: 'CONNECTION ESTABLISHED' },
    {
      id: '2', sender: 'agent',
      text: 'Terminal initialized. I can execute operations such as tracking wallets, swapping tokens, and deploying intelligent strategies.',
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg: Message = { id: Date.now().toString(), sender: 'user', text: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      if (userMsg.text.toLowerCase().includes('send')) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            sender: 'agent',
            text: 'Preparing transaction manifest...',
            isAction: true,
            actionDetails: { type: 'Transfer', amount: '1.0 SOL', status: 'Pending' },
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            sender: 'agent',
            text: `Analyzing: "${userMsg.text}". Market variables are within acceptable parameters for execution.`,
          },
        ]);
      }
    }, 1400);
  };

  return (
    <Card className="w-full lg:w-[340px] xl:w-[380px] h-full min-h-[600px] flex flex-col shrink-0 bg-white/[0.02] border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.12)] backdrop-blur-xl relative overflow-hidden group/chat">
      <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl group-hover/chat:bg-cyan-500/20 transition-all duration-700"></div>

      <CardHeader className="p-4 border-b border-white/5 flex flex-row items-center justify-between shrink-0 space-y-0 relative z-10">
        <div className="flex items-center gap-2.5">
          <Avatar className="w-7 h-7 bg-white/5 border border-white/10 text-cyan-400">
            <AvatarFallback className="bg-transparent text-[10px] font-bold text-cyan-400/80 tracking-wider">AI</AvatarFallback>
          </Avatar>
          <span className="text-[13px] font-semibold text-foreground tracking-wide opacity-90 uppercase">
            Supervisor
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[9px] uppercase tracking-widest font-semibold bg-white/5 border-white/10 text-muted-foreground/80 rounded py-0.5 px-2">
            GPT-4o
          </Badge>
          <div className="flex items-center gap-1.5 ml-1">
            <div className="w-[6px] h-[6px] rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-[pulse-dot_2s_ease-in-out_infinite]" />
          </div>
        </div>
      </CardHeader>

      <ScrollArea className="flex-1 p-4 flex flex-col relative z-10 w-full">
        <div className="flex flex-col gap-4 pb-2 w-full">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex w-full ${msg.sender === 'user' ? 'justify-end' : msg.sender === 'system' ? 'justify-center' : 'justify-start'}`}
            >
              {msg.sender === 'system' && (
                <div className="text-[10px] text-muted-foreground/50 tracking-[0.2em] font-semibold uppercase text-center py-2 relative">
                  <span className="px-4 bg-[#0F1117] z-10 relative">{msg.text}</span>
                  <div className="absolute top-1/2 left-0 w-full h-px bg-white/5 -z-10 mt-[-1px]"></div>
                </div>
              )}

              {msg.sender === 'user' && (
                <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-2xl rounded-tr-sm px-4 py-3 text-[13px] text-foreground max-w-[85%] leading-relaxed shadow-sm shadow-cyan-500/5">
                  {msg.text}
                </div>
              )}

              {msg.sender === 'agent' && !msg.isAction && (
                <div className="flex items-end gap-2 max-w-[85%]">
                  <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl rounded-tl-sm px-4 py-3 text-[13px] text-foreground/90 leading-relaxed shadow-sm">
                    {msg.text}
                  </div>
                </div>
              )}

              {msg.sender === 'agent' && msg.isAction && msg.actionDetails && (
                 <div className="flex items-end gap-2 max-w-[85%] w-full">
                  <div className="bg-white/[0.03] border border-white/10 backdrop-blur-md rounded-2xl rounded-tl-sm p-4 w-full shadow-sm">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground/80">
                        {msg.actionDetails.type}
                      </span>
                      <Badge 
                        variant="outline" 
                        className={`text-[9px] font-bold border px-1.5 py-0.5 rounded tracking-wider uppercase ${msg.actionDetails.status === 'Pending' ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'}`}
                      >
                        {msg.actionDetails.status}
                      </Badge>
                    </div>
                    <div className="text-lg font-mono font-semibold text-foreground pb-3 border-b border-white/5 mb-3">
                      {msg.actionDetails.amount}
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground/60 font-mono">HN3x...9s2R</span>
                      <a href="#" className="text-[11px] font-medium text-cyan-400/80 hover:text-cyan-400 transition-colors uppercase tracking-wider">
                        Explore
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {isTyping && (
            <div className="flex items-end gap-2 max-w-[85%] mt-1">
              <div className="bg-white/5 border border-white/5 backdrop-blur-md rounded-2xl rounded-tl-sm px-4 py-3.5 text-sm text-cyan-400 flex items-center gap-1.5 shadow-sm">
                <span className="w-1.5 h-1.5 bg-cyan-400/60 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-1.5 h-1.5 bg-cyan-400/60 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-1.5 h-1.5 bg-cyan-400/60 rounded-full animate-bounce"></span>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </ScrollArea>

      <CardFooter className="p-3 border-t border-white/5 shrink-0 bg-white/[0.01] backdrop-blur flex flex-row items-center gap-2 relative z-10 m-2 rounded-xl">
        <Input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Issue command..."
          className="flex-1 bg-transparent border-none shadow-none focus-visible:ring-0 text-[13px] px-2 text-foreground placeholder:text-muted-foreground/50 h-9"
        />
        <Button
          size="icon"
          variant="ghost"
          onClick={handleSend}
          disabled={!input.trim()}
          className="h-8 w-8 text-cyan-400/60 hover:text-cyan-400 hover:bg-cyan-400/10 shrink-0 rounded-lg transition-colors"
        >
          <Send className="h-4 w-4 ml-0.5" />
        </Button>
      </CardFooter>
    </Card>
  );
};
