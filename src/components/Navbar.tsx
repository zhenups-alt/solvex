import React from 'react';
import { Book, Menu, Sunset, Trees, Zap, LogOut } from "lucide-react";
import { usePhantom } from './WalletContextProvider';
import { truncateAddress } from '../lib/utils';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface MenuItem {
  title: string;
  url: string;
  description?: string;
  icon?: React.ReactNode;
  items?: MenuItem[];
}

interface Navbar1Props {
  logo?: {
    url: string;
    title: string;
  };
  menu?: MenuItem[];
  mobileExtraLinks?: {
    name: string;
    url: string;
  }[];
}

export const Navbar = ({
  logo = {
    url: "/",
    title: "SolveX",
  },
  menu = [
    { title: "Dashboard", url: "/dashboard" },
    {
      title: "Products",
      url: "#",
      items: [
        {
          title: "Wallet Vault",
          description: "Manage your deposited funds and review activity.",
          icon: <Book className="size-5 shrink-0" color="#8b8fa8" />,
          url: "/vault",
        },
        {
          title: "Agent Configuration",
          description: "Set your risk parameters and automation strategies.",
          icon: <Trees className="size-5 shrink-0" color="#8b8fa8" />,
          url: "/agent-config",
        },
        {
          title: "Analytics",
          description: "Track performance metrics, ROI, and PnL.",
          icon: <Sunset className="size-5 shrink-0" color="#8b8fa8" />,
          url: "/analytics",
        },
        {
          title: "Decision Log",
          description: "Full audit log of the agent's on-chain reasoning.",
          icon: <Zap className="size-5 shrink-0" color="#8b8fa8" />,
          url: "/decisions",
        },
      ],
    },
    {
      title: "Resources",
      url: "#",
      items: [
        {
          title: "Architecture",
          description: "Understand the technical design behind SolveX.",
          icon: <Zap className="size-5 shrink-0" color="#8b8fa8" />,
          url: "/architecture",
        },
        {
          title: "Documentation",
          description: "Read the full developer and user documentation.",
          icon: <Book className="size-5 shrink-0" color="#8b8fa8" />,
          url: "/docs",
        },
        {
          title: "How it Works",
          description: "Learn the fundamentals of autonomous DeFi.",
          icon: <Sunset className="size-5 shrink-0" color="#8b8fa8" />,
          url: "/how-it-works",
        },
      ],
    },
    {
      title: "Pricing",
      url: "/pricing",
    },
  ],
  mobileExtraLinks = [
    { name: "Settings", url: "/settings" },
    { name: "Contact", url: "/contact" },
  ],
}: Navbar1Props) => {
  const { connected, address, connect, disconnect } = usePhantom();

  return (
    <section style={{ background: '#0D0D0D', borderBottom: '1px solid #2A2A2A', position: 'sticky', top: 0, zIndex: 50, fontFamily: "'Inter', sans-serif" }}>
        <div style={{ maxWidth: 1440, margin: '0 auto', padding: '0 28px' }}>
          <nav className="hidden justify-between lg:flex" style={{ alignItems: 'center', height: 56 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
              <a href={logo.url} style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
                <div style={{ width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, background: '#3B82F6', color: '#fff', fontWeight: 800, fontSize: 11, boxShadow: '0 0 12px rgba(59,130,246,0.4)' }}>
                  ◎
                </div>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.3px' }}>{logo.title}</span>
            </a>
            <div className="flex items-center">
              <NavigationMenu>
                <NavigationMenuList>
                  {menu.map((item) => renderMenuItem(item))}
                </NavigationMenuList>
              </NavigationMenu>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {!connected || !address ? (
              <>
                <button onClick={connect} style={{ background: 'transparent', color: '#AAAAAA', border: '1px solid #2A2A2A', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                  Log in
                </button>
                <button onClick={connect} style={{ background: '#3B82F6', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 0 16px rgba(59,130,246,0.35)' }}>
                  Connect Wallet
                </button>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#161616', border: '1px solid #2A2A2A', borderRadius: 8, padding: '7px 12px' }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e88', display: 'inline-block' }} />
                  <span style={{ fontFamily: 'monospace', fontSize: 13, color: '#FFFFFF' }}>{truncateAddress(address)}</span>
                </div>
                <button onClick={disconnect} style={{ background: 'transparent', color: '#6B6B6B', border: '1px solid #2A2A2A', borderRadius: 8, padding: '7px 10px', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                  <LogOut size={15} />
                </button>
              </>
            )}
          </div>
        </nav>
        
        {/* Mobile Nav */}
          <div className="block lg:hidden" style={{ height: 56, display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <a href={logo.url} style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
                <div style={{ width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, background: '#3B82F6', color: '#fff', fontWeight: 800, fontSize: 11 }}>
                  ◎
                </div>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.3px' }}>{logo.title}</span>
              </a>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" style={{ background: 'transparent', border: '1px solid #2A2A2A', color: '#AAAAAA' }}>
                  <Menu className="size-4" />
                </Button>
              </SheetTrigger>
              <SheetContent style={{ background: '#0D0D0D', borderLeft: '1px solid #2A2A2A', color: '#FFFFFF' }}>
                <SheetHeader>
                  <SheetTitle>
                    <a href={logo.url} style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
                      <div style={{ width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, background: '#3B82F6', color: '#fff', fontWeight: 800, fontSize: 11 }}>
                        ◎
                      </div>
                      <span style={{ fontSize: 16, fontWeight: 700, color: '#FFFFFF' }}>
                        {logo.title}
                      </span>
                    </a>
                  </SheetTitle>
                </SheetHeader>
                <div className="my-6 flex flex-col gap-6">
                  <Accordion
                    type="single"
                    collapsible
                    className="flex w-full flex-col gap-4 text-[#e8eaf0]"
                  >
                    {menu.map((item) => renderMobileMenuItem(item))}
                  </Accordion>
                  <div className="border-t border-white/[0.07] py-4">
                    <div className="grid grid-cols-2 justify-start">
                      {mobileExtraLinks.map((link, idx) => (
                        <a
                          key={idx}
                          className="inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium text-[#8b8fa8] transition-colors hover:bg-white/[0.05] hover:text-white"
                          href={link.url}
                        >
                          {link.name}
                        </a>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col gap-3">
                    {!connected || !address ? (
                      <>
                        <Button onClick={connect} variant="outline" className="w-full bg-transparent border-white/[0.1] hover:bg-white/[0.05] text-[#e8eaf0]">
                          Log in
                        </Button>
                        <Button onClick={connect} className="w-full bg-white text-black hover:bg-neutral-200">
                          Get Started
                        </Button>
                      </>
                    ) : (
                      <>
                        <div className="w-full py-2 flex justify-center items-center bg-white/[0.05] border border-white/[0.08] rounded-md font-mono text-[#e8eaf0]">
                          <div className="w-2 h-2 rounded-full bg-green-500 mr-2" />
                          {truncateAddress(address)}
                        </div>
                        <Button onClick={disconnect} variant="outline" className="w-full bg-transparent border-red-500/20 text-red-500 hover:bg-red-500/10 hover:text-red-400">
                          <LogOut size={16} className="mr-2" /> Disconnect
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </section>
  );
};

const renderMenuItem = (item: MenuItem) => {
  if (item.items) {
    return (
      <NavigationMenuItem key={item.title} style={{ color: '#6B6B6B' }}>
        <NavigationMenuTrigger style={{ background: 'transparent', color: '#6B6B6B', fontSize: 14, fontWeight: 500 }} className="hover:text-white data-[state=open]:text-white">{item.title}</NavigationMenuTrigger>
        <NavigationMenuContent style={{ background: '#161616', border: '1px solid #2A2A2A', borderRadius: 12 }}>
          <ul className="w-80 p-3">
            <NavigationMenuLink>
              {item.items.map((subItem) => (
                <li key={subItem.title}>
                  <a
                    className="flex select-none gap-4 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-white/[0.04] hover:text-white group"
                    href={subItem.url}
                  >
                    {subItem.icon}
                    <div>
                      <div className="text-sm font-semibold text-[#e8eaf0] mb-1 group-hover:text-white">
                        {subItem.title}
                      </div>
                      {subItem.description && (
                        <p className="text-xs leading-snug text-[#71717a] group-hover:text-[#a1a1aa] transition-colors">
                          {subItem.description}
                        </p>
                      )}
                    </div>
                  </a>
                </li>
              ))}
            </NavigationMenuLink>
          </ul>
        </NavigationMenuContent>
      </NavigationMenuItem>
    );
  }

  return (
    <a
      key={item.title}
      href={item.url}
      style={{ display: 'inline-flex', alignItems: 'center', height: 36, padding: '0 14px', borderRadius: 8, fontSize: 14, fontWeight: 500, color: '#6B6B6B', textDecoration: 'none', transition: 'color 0.15s' }}
      onMouseEnter={e => (e.currentTarget.style.color = '#FFFFFF')}
      onMouseLeave={e => (e.currentTarget.style.color = '#6B6B6B')}
    >
      {item.title}
    </a>
  );
};

const renderMobileMenuItem = (item: MenuItem) => {
  if (item.items) {
    return (
      <AccordionItem key={item.title} value={item.title} className="border-b-0">
        <AccordionTrigger className="py-0 font-medium hover:no-underline text-[#e8eaf0]">
          {item.title}
        </AccordionTrigger>
        <AccordionContent className="mt-2 border-l border-white/[0.06] ml-2 pl-4">
          {item.items.map((subItem) => (
            <a
              key={subItem.title}
              className="flex select-none gap-4 rounded-md p-3 leading-none outline-none transition-colors hover:bg-white/[0.05] hover:text-white"
              href={subItem.url}
            >
              {subItem.icon}
              <div>
                <div className="text-sm font-semibold text-[#e8eaf0]">{subItem.title}</div>
                {subItem.description && (
                  <p className="text-sm leading-snug text-[#71717a] mt-1">
                    {subItem.description}
                  </p>
                )}
              </div>
            </a>
          ))}
        </AccordionContent>
      </AccordionItem>
    );
  }

  return (
    <a key={item.title} href={item.url} className="font-medium text-[#e8eaf0]">
      {item.title}
    </a>
  );
};
