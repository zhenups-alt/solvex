import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  BarChart3, 
  Wallet, 
  Settings2, 
  Activity, 
  FileText, 
  BookOpen, 
  Settings,
  Menu,
  X,
  ChevronDown,
  Copy,
  ExternalLink,
  LogOut,
  Cpu
} from 'lucide-react';
import { useStore } from '../store';
import { cn, truncateAddress } from '../lib/utils';
import { Button } from './UI';

export const TopNav = () => {
  const { isDemoMode, setDemoMode, walletAddress, setWalletAddress } = useStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Vault', path: '/vault' },
    { name: 'Decisions', path: '/decisions' },
    { name: 'Docs', path: '/docs' },
  ];

  return (
    <motion.nav 
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.1 }}
      className="fixed top-6 left-0 right-0 z-50 flex justify-center w-full px-4 pointer-events-none"
    >
      <div className="pointer-events-auto flex items-center gap-2 p-1.5 bg-bg-base/70 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-[0_8px_32px_-8px_rgba(0,0,0,0.5)]">
        
        {/* Links */}
        <div className="hidden lg:flex items-center px-2 relative">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.name}
                to={link.path}
                className="relative px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                style={{ WebkitTapHighlightColor: "transparent" }}
              >
                {isActive && (
                  <motion.div
                    layoutId="navbar-active"
                    className="absolute inset-0 bg-white/10 rounded-xl"
                    transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
                  />
                )}
                <span className={cn(
                  "relative z-10 transition-colors duration-200",
                  isActive ? "text-text-primary" : "text-text-secondary hover:text-text-primary"
                )}>
                  {link.name}
                </span>
              </Link>
            );
          })}
        </div>

        <div className="hidden lg:block w-px h-6 bg-white/10 mx-2" />

        {/* Tools and Connect */}
        <div className="flex items-center gap-2 pr-1">


          {walletAddress ? (
            <div className="relative group">
              <Button variant="secondary" size="sm" className="h-9 px-4 gap-2 bg-white/5 border-white/10 hover:bg-white/10 rounded-xl">
                <Wallet size={14} className="text-accent" />
                <span className="font-mono text-[13px]">{truncateAddress(walletAddress)}</span>
                <ChevronDown size={14} className="text-text-muted" />
              </Button>
              <div className="absolute right-0 top-[calc(100%+8px)] w-60 bg-bg-elevated/95 backdrop-blur-2xl border border-white/10 rounded-xl shadow-[0_16px_32px_-8px_rgba(0,0,0,0.5)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 p-2 z-[60] origin-top">
                <div className="p-3 border-b border-white/5 mb-2">
                  <div className="text-[10px] text-text-muted uppercase tracking-widest font-bold mb-2">Connected Wallet</div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[13px] text-text-primary">{truncateAddress(walletAddress)}</span>
                    <div className="flex gap-1">
                      <button className="p-1.5 hover:bg-white/10 rounded-md transition-colors text-text-secondary hover:text-text-primary"><Copy size={14} /></button>
                      <button className="p-1.5 hover:bg-white/10 rounded-md transition-colors text-text-secondary hover:text-text-primary"><ExternalLink size={14} /></button>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setWalletAddress(null)}
                  className="w-full flex items-center justify-center gap-2 p-2.5 text-[13px] font-semibold text-negative hover:bg-negative/10 rounded-lg transition-colors"
                >
                  <LogOut size={14} />
                  Disconnect
                </button>
              </div>
            </div>
          ) : (
            <Button size="sm" className="h-9 px-5 rounded-xl text-[13px] font-medium shadow-[0_0_20px_-8px_rgba(var(--color-accent),0.5)]" onClick={() => setWalletAddress('5xK9JmPQxyz8Rttm3nP3Q')}>
              Connect
            </Button>
          )}

          <button className="lg:hidden p-2 ml-1 text-text-secondary hover:text-text-primary hover:bg-white/5 rounded-xl transition-colors" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>
      
      {/* Mobile Menu Dropdown */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute top-[calc(100%+16px)] left-4 right-4 bg-bg-elevated/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl p-2 pointer-events-auto origin-top"
          >
            <div className="flex flex-col space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "px-4 py-3 rounded-xl text-sm font-semibold transition-colors flex items-center justify-between",
                    location.pathname === link.path ? "bg-white/10 text-white" : "text-text-secondary hover:text-white hover:bg-white/5"
                  )}
                >
                  {link.name}
                  {location.pathname === link.path && <div className="w-1.5 h-1.5 rounded-full bg-accent" />}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

export const Sidebar = () => {
  const location = useLocation();
  
  const sections = [
    {
      label: 'Overview',
      items: [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { name: 'Analytics', path: '/analytics', icon: BarChart3 },
      ]
    },
    {
      label: 'My Vault',
      items: [
        { name: 'Vault', path: '/vault', icon: Wallet },
        { name: 'Activity', path: '/vault#manage', icon: Activity },
      ]
    },
    {
      label: 'AI Agent',
      items: [
        { name: 'Config', path: '/agent-config', icon: Settings2 },
        { name: 'Log', path: '/decisions', icon: FileText },
      ]
    },
    {
      label: 'System',
      items: [
        { name: 'Architecture', path: '/architecture', icon: Cpu },
        { name: 'Docs', path: '/docs', icon: BookOpen },
      ]
    }
  ];

  return (
    <aside className="hidden lg:flex flex-col w-64 border-r border-white/5 h-[calc(100vh-4rem)] sticky top-16 bg-bg-base/50 backdrop-blur-sm overflow-y-auto">
      <div className="flex-1 py-8 px-4 space-y-8">
        {sections.map((section) => (
          <div key={section.label}>
            <div className="text-[10px] uppercase tracking-[0.2em] text-text-muted font-bold mb-4 px-4">
              {section.label}
            </div>
            <div className="space-y-1">
              {section.items.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    className={cn(
                      "flex items-center gap-3 h-10 px-4 rounded-xl text-[13px] font-semibold transition-all group",
                      isActive 
                        ? "bg-accent/10 text-accent" 
                        : "text-text-secondary hover:text-text-primary hover:bg-white/5"
                    )}
                  >
                    <item.icon size={18} className={cn(isActive ? "text-accent" : "text-text-muted group-hover:text-text-secondary")} />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      
      {/* Agent Status Panel */}
      <div className="p-4 border-t border-white/5">
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-bold text-text-primary uppercase tracking-wider">Agent Status</div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-accent animate-pulse-accent" />
              <span className="text-[10px] text-accent font-mono font-bold uppercase">Live</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-[11px]">
              <span className="text-text-muted">Next cycle:</span>
              <span className="text-text-secondary font-mono">4m 46s</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-text-muted">Model:</span>
              <span className="text-text-secondary">Claude 3.5</span>
            </div>
          </div>
          <Button variant="outline" size="sm" className="w-full h-8 text-[11px] font-bold border-white/10 hover:bg-white/5">Pause Agent</Button>
        </div>
      </div>
    </aside>
  );
};
