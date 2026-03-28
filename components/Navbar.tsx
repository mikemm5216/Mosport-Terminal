"use client"

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Radar, Shield, TrendingUp } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();

  const navItems = [
    { label: 'RADAR', path: '/', icon: Radar },
    { label: 'TEAMS', path: '/teams', icon: Shield },
    { label: 'REPORTS', path: '/reports', icon: TrendingUp },
  ];

  return (
    <nav className="w-full bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b-2 border-blue-500/30 sticky top-0 z-40 shadow-xl">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo Area - ESPN Style */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg blur-lg opacity-40" />
              <span className="text-white relative bg-gradient-to-r from-blue-400 to-cyan-400 rounded-lg p-2">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                  <polyline points="2 17 12 22 22 17"></polyline>
                  <polyline points="2 12 12 17 22 12"></polyline>
                </svg>
              </span>
            </div>
            <div className="flex flex-col leading-none hidden sm:flex">
              <span className="font-black text-white tracking-[0.15em] text-lg">MOSPORT</span>
            </div>
          </div>

          {/* Center - Live Indicator */}
          <div className="hidden md:flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-lg shadow-emerald-500/50" />
            <span className="text-[9px] text-emerald-400 font-black tracking-widest uppercase">LIVE</span>
          </div>

          {/* Navigation Links - ESPN Tab Style */}
          <div className="flex gap-0 ml-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.path;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`flex items-center gap-1.5 px-4 sm:px-5 h-full border-b-4 transition-all duration-300 relative ${
                    isActive 
                      ? 'border-blue-500 text-blue-400 bg-slate-900/60 shadow-[0_4px_12px_rgba(59,130,246,0.2)]' 
                      : 'border-transparent text-slate-400 hover:text-blue-300 hover:bg-slate-900/30 hover:border-b-blue-500/50'
                  }`}
                >
                  {isActive && <div className="absolute inset-0 top-0 bg-gradient-to-b from-blue-500/10 to-transparent pointer-events-none" />}
                  <Icon size={18} />
                  <span className="text-xs font-black tracking-wider uppercase hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
          </div>

        </div>
      </div>
    </nav>
  );
}
