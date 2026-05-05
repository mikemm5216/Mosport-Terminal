'use client'

import React from 'react'

interface FanVoteBarProps {
  agreePct: number
  disagreePct: number
  alternativePct: number
  totalVotes: number
}

export default function FanVoteBar({ agreePct, disagreePct, alternativePct, totalVotes }: FanVoteBarProps) {
  return (
    <div className="w-full space-y-2">
      <div className="flex justify-between items-end">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Fan Consensus</span>
        <span className="text-[10px] font-mono text-slate-400">{totalVotes.toLocaleString()} Votes</span>
      </div>
      
      <div className="h-6 w-full flex rounded overflow-hidden border border-white/5">
        <div 
          style={{ width: `${agreePct}%` }}
          className="h-full bg-emerald-500/80 flex items-center px-2 transition-all duration-700"
        >
          {agreePct > 15 && <span className="text-[9px] font-black text-white italic">{agreePct.toFixed(0)}%</span>}
        </div>
        <div 
          style={{ width: `${disagreePct}%` }}
          className="h-full bg-rose-500/80 flex items-center px-2 transition-all duration-700 border-l border-white/10"
        >
          {disagreePct > 15 && <span className="text-[9px] font-black text-white italic">{disagreePct.toFixed(0)}%</span>}
        </div>
        <div 
          style={{ width: `${alternativePct}%` }}
          className="h-full bg-amber-500/80 flex items-center px-2 transition-all duration-700 border-l border-white/10"
        >
          {alternativePct > 15 && <span className="text-[9px] font-black text-white italic">{alternativePct.toFixed(0)}%</span>}
        </div>
      </div>
      
      <div className="flex gap-4 text-[9px] font-bold uppercase tracking-widest italic">
        <div className="flex items-center gap-1.5 text-emerald-400">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Agree
        </div>
        <div className="flex items-center gap-1.5 text-rose-400">
          <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          Disagree
        </div>
        <div className="flex items-center gap-1.5 text-amber-400">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          Alternative
        </div>
      </div>
    </div>
  )
}
