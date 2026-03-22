"use client"

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Radar, Shield, TrendingUp, Bell } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();

  const navItems = [
    { label: '賽事雷達', path: '/', icon: Radar },
    { label: '球隊軍火庫', path: '/teams', icon: Shield },
    { label: '屠莊戰報', path: '/reports', icon: TrendingUp },
    { label: '監控中心', path: '/alerts', icon: Bell },
  ];

  return (
    <nav className="w-full bg-slate-950 border-b border-slate-800/80 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-14">
          
          {/* Logo Area */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-cyan-400">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                <polyline points="2 17 12 22 22 17"></polyline>
                <polyline points="2 12 12 17 22 12"></polyline>
              </svg>
            </span>
            <span className="font-extrabold text-white tracking-widest text-lg ml-1 hidden sm:block">
              MOSPORT
            </span>
          </div>

          {/* Navigation Links */}
          <div className="flex gap-1 sm:gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.path;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`flex items-center gap-1.5 px-3 sm:px-4 h-full border-b-2 transition-colors ${
                    isActive 
                      ? 'border-cyan-400 text-cyan-400 bg-slate-900/40' 
                      : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/20'
                  }`}
                >
                  <Icon size={16} className={isActive ? 'animate-pulse' : ''} />
                  <span className="text-xs sm:text-sm font-bold tracking-wide">{item.label}</span>
                </Link>
              );
            })}
          </div>

        </div>
      </div>
    </nav>
  );
}
