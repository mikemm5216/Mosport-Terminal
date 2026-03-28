"use client"

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronDown, ArrowRight, User, Activity, Clock, Zap, Target, Shield, AlertTriangle } from 'lucide-react';
import LiveTicker from '@/components/LiveTicker';
import { formatLocalTime } from '@/lib/timezone';

export default function Home() {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/signals')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setMatches(data.data);
        }
        setLoading(false);
      })
      .catch(e => {
        setLoading(false);
      });
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  return (
    <main className="min-h-screen bg-[#05090f] flex flex-col items-center overflow-x-hidden selection:bg-cyan-500/30">
      <LiveTicker />

      {/* TERMINAL HEADER (image_10.png Style) */}
      <div className="w-full max-w-7xl pt-16 pb-12 px-12">
        <div className="flex flex-col border-l-4 border-cyan-400 pl-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_emerald]" />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Live Link Active</span>
          </div>
          <h1 className="text-5xl font-black text-white italic uppercase tracking-[0.1em] leading-none">
            MOSPORT <span className="text-cyan-400">TERMINAL</span>
          </h1>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center p-40">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-400"></div>
        </div>
      ) : (
        <div className="w-full max-w-7xl px-12 pb-40 space-y-1">
          {matches.map((match) => (
            <TerminalRow key={match.match_id} match={match} isExpanded={expandedId === match.match_id} onToggle={() => toggleExpand(match.match_id)} />
          ))}
        </div>
      )}
    </main>
  );
}

function TerminalRow({ match, isExpanded, onToggle }: { match: any, isExpanded: boolean, onToggle: () => void }) {
  const tags = match.tags || [];
  const isLock = tags.includes('SYSTEM LOCK');
  const isUpset = tags.includes('UPSET ALERT');

  return (
    <div className="w-full group">

      {/* 1. COLLAPSED: HIGH-DENSITY MATCHUP (image_10.png) */}
      <div
        onClick={onToggle}
        className={`relative w-full cursor-pointer flex items-center justify-between p-12 transition-all duration-500 ${isExpanded ? 'bg-[#0a111a] border-y border-slate-800' : 'bg-transparent hover:bg-white/[0.02] border-b border-white/[0.03]'}`}
      >
        <div className="flex items-center gap-16">
          {/* League & Meta */}
          <div className="hidden lg:flex flex-col gap-2 min-w-[80px]">
            <div className="flex items-center gap-2">
              <Activity size={14} className="text-white" />
              <span className="text-xs font-black text-white uppercase tracking-widest">{match.league_name}</span>
            </div>
            <div className={`px-2 py-0.5 rounded text-[8px] font-black tracking-widest uppercase border ${isLock ? 'text-cyan-400 border-cyan-400/30' : 'text-amber-400 border-amber-400/30'}`}>
              {isLock ? "SYSTEM LOCK" : "UPSET ALERT"}
            </div>
          </div>

          {/* MATCHUP IDENTITY: HUGE */}
          <div className="flex items-center gap-12">
            <div className="flex items-center gap-6 group/home">
              {match.home_logo_url && <img src={match.home_logo_url} className="w-16 h-16 object-contain drop-shadow-2xl" alt="" />}
              <span className="text-6xl font-black text-white italic uppercase tracking-tighter opacity-90 group-hover/home:opacity-100 transition-opacity">
                {match.home_short_name}
              </span>
            </div>

            <div className="flex flex-col items-center gap-1 opacity-20">
              <div className="h-6 w-px bg-white" />
              <span className="text-xs font-black text-white italic">VS</span>
              <div className="h-6 w-px bg-white" />
            </div>

            <div className="flex items-center gap-6 group/away">
              <span className="text-6xl font-black text-white italic uppercase tracking-tighter opacity-90 group-hover/away:opacity-100 transition-opacity">
                {match.away_short_name}
              </span>
              {match.away_logo_url && <img src={match.away_logo_url} className="w-16 h-16 object-contain drop-shadow-2xl" alt="" />}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <span className="text-xs font-black text-slate-500 uppercase tracking-widest">
            {formatLocalTime(match.match_date)}
          </span>
          <ChevronDown size={20} className={`text-slate-700 transition-transform duration-500 ${isExpanded ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* 2. EXPANDED: INTEL PANEL (image_6.png) */}
      <div className={`transition-all duration-700 ease-in-out ${isExpanded ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
        <div className="bg-[#070c14] border-b border-slate-800/50 p-16 flex flex-col items-center">

          <div className="w-full max-w-5xl space-y-16">

            {/* VICTORY PROJECTION (Tug-of-war) */}
            <div className="space-y-6">
              <div className="flex justify-center items-center gap-6">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent to-slate-800" />
                <span className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.5em] italic">Match Energy Index</span>
                <div className="h-px flex-1 bg-gradient-to-l from-transparent to-slate-800" />
              </div>

              <div className="relative h-20 w-full bg-slate-950 rounded-2xl border border-white/5 flex items-center p-2 overflow-hidden shadow-2xl">
                <div
                  className="h-full bg-emerald-500 rounded-xl transition-all duration-1000 flex items-center pl-8 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                  style={{ width: `${(match.confidence * 100) || 50}%` }}
                >
                  <span className="text-3xl font-black text-black italic">{(match.confidence * 100).toFixed(0)}%</span>
                </div>
                <div className="w-1 h-full bg-white/10 z-10" />
                <div className="h-full flex-1 flex items-center justify-end pr-8">
                  <span className="text-3xl font-black text-red-500 italic">{Math.round(100 - (match.confidence * 100))}%</span>
                </div>
              </div>
            </div>

            {/* PSYCHO & BIO ENGINE GRID */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              {/* Momentum */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Activity size={14} className="text-cyan-400" />
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Psycho Surge</span>
                </div>
                <div className="p-6 bg-slate-950 rounded-2xl border border-white/5">
                  <span className="text-2xl font-black text-white italic uppercase block mb-1">Surging</span>
                  <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-400 w-3/4 shadow-[0_0_10px_cyan]" />
                  </div>
                </div>
              </div>

              {/* Fatigue */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Zap size={14} className="text-amber-400" />
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Bio Status</span>
                </div>
                <div className="p-6 bg-slate-950 rounded-2xl border border-white/5">
                  <span className="text-2xl font-black text-emerald-400 italic uppercase block mb-1">Optimal</span>
                  <span className="text-[10px] font-black text-slate-600 block uppercase tracking-widest leading-none">High-Efficiency State</span>
                </div>
              </div>

              {/* CTA */}
              <div className="flex items-center justify-center">
                <Link
                  href={`/matches/${match.match_id}`}
                  className="w-full h-full bg-white hover:bg-cyan-500 text-black rounded-3xl flex flex-col items-center justify-center gap-2 group transition-all hover:scale-[1.02] shadow-2xl relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
                  <span className="text-[11px] font-black uppercase tracking-[0.3em]">Enter War Room</span>
                  <ArrowRight size={24} className="group-hover:translate-x-2 transition-transform" />
                </Link>
              </div>
            </div>

          </div>

        </div>
      </div>

    </div>
  );
}
