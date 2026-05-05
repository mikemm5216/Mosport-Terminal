'use client'

import React from 'react'
import Link from 'next/link'
import { Terminal, Shield, MessageSquare, Trophy } from 'lucide-react'

interface PublicAppShellProps {
  children: React.ReactNode
}

export default function PublicAppShell({ children }: PublicAppShellProps) {
  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 selection:bg-blue-500/30">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 h-16 bg-[#020617]/80 backdrop-blur-md border-b border-white/5 z-50 px-6 flex justify-between items-center">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center group-hover:scale-110 transition-transform">
              <Terminal size={18} className="text-white" />
            </div>
            <span className="text-lg font-black italic tracking-tighter uppercase text-white">Mosport</span>
          </Link>
          
          <div className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-[10px] font-black uppercase tracking-widest text-blue-500">Coach Room</Link>
            <Link href="/games" className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors">Games</Link>
            <Link href="/terminal" className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors">Terminal Mode</Link>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded border border-white/10 transition-all">
            <Shield size={14} className="text-blue-500" />
            <span className="text-[9px] font-black uppercase tracking-widest">Login</span>
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="pt-16">
        {children}
      </div>

      {/* Global Status Bar */}
      <div className="fixed bottom-0 left-0 right-0 h-8 bg-blue-600 px-6 flex justify-between items-center z-40 overflow-hidden">
        <div className="flex items-center gap-4 overflow-hidden">
          <div className="flex items-center gap-2 whitespace-nowrap">
            <span className="text-[8px] font-black uppercase tracking-widest text-blue-200">System Status:</span>
            <span className="text-[8px] font-black uppercase tracking-widest text-white">Engine Online</span>
          </div>
          <div className="h-3 w-px bg-blue-400" />
          <div className="animate-marquee whitespace-nowrap">
            <span className="text-[8px] font-black uppercase tracking-widest text-blue-100 mx-4">
              LAL vs GSW: 82% DEBATE INTENSITY • 1,240 VOTES CAST • COACH READ LOCKED AT KICKOFF
            </span>
            <span className="text-[8px] font-black uppercase tracking-widest text-blue-100 mx-4">
              NYY vs BOS: 45% DEBATE INTENSITY • 850 VOTES CAST • POSTGAME VERDICT PENDING
            </span>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2 whitespace-nowrap bg-blue-600 pl-4">
          <span className="text-[8px] font-black uppercase tracking-widest text-white">v2.0.4-COACH</span>
        </div>
      </div>
    </div>
  )
}
