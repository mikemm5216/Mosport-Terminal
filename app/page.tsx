"use client"

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronDown, ArrowRight, User, Activity, Clock, Zap, Target, Shield, AlertTriangle } from 'lucide-react';
import LiveTicker from '@/components/LiveTicker';
import { formatLocalTime } from '@/lib/timezone';
import { getShortName } from '@/lib/teams';

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
    <main className="min-h-screen bg-slate-950 flex flex-col items-center overflow-x-hidden selection:bg-cyan-500/30">
      <LiveTicker />

      {/* HEADER: MOSPORT GLOBAL OS Terminal */}
      <div className="w-full max-w-6xl p-8 border-b border-slate-900 sticky top-0 bg-slate-950/90 backdrop-blur-3xl z-40">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tighter uppercase italic leading-none">
              MOSPORT <span className="text-cyan-400 font-black">TERMINAL</span>
            </h1>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.5em] mt-1 italic">High-Density Strategic Intel Ecosystem</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden md:flex flex-col items-end gap-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Scan Active</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(i => <div key={i} className="w-1 h-3 bg-cyan-400/20 rounded-full" />)}
              </div>
            </div>
            <div className="w-px h-10 bg-slate-800" />
            <div className="flex flex-col items-end gap-1">
              <span className="text-[10px] font-black text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded border border-cyan-400/20 uppercase">SYSTEM LIVE</span>
              <span className="text-[8px] font-bold text-slate-700 uppercase tracking-widest italic">V15.4 BLOOMBERG CORE</span>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center p-40">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.4)]"></div>
        </div>
      ) : (
        <div className="w-full max-w-6xl py-12 pb-40 px-4 space-y-6">
          {matches.length === 0 ? (
            <div className="p-24 text-center text-slate-700 font-black text-xs uppercase tracking-[0.4em] border-2 border-dashed border-slate-900 rounded-[3rem] italic">
              [ NO FRESH SIGNALS DETECTED ]
            </div>
          ) : (
            matches.map((match) => (
              <DecisionCard key={match.match_id} match={match} isExpanded={expandedId === match.match_id} onToggle={() => toggleExpand(match.match_id)} />
            ))
          )}
        </div>
      )}
    </main>
  );
}

const TeamBadge = ({ src, name, size = "md" }: { src: string | null, name: string, size?: "md" | "lg" }) => {
  const dim = size === "lg" ? "w-24 h-24" : "w-16 h-16";
  const iconDim = size === "lg" ? "w-16 h-16" : "w-12 h-12";

  return (
    <div className={`${dim} rounded-3xl bg-slate-900 border border-slate-800 transition-all duration-500 flex items-center justify-center group-hover/team:border-cyan-500/30 overflow-hidden relative shadow-xl`}>
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
      {src ? (
        <img src={src} alt={name} className={`${iconDim} object-contain drop-shadow-2xl`} />
      ) : (
        <Shield className={`${iconDim} text-slate-800`} strokeWidth={1.5} />
      )}
    </div>
  );
};

function DecisionCard({ match, isExpanded, onToggle }: { match: any, isExpanded: boolean, onToggle: () => void }) {
  const tags = match.tags || [];
  const isGolden = tags.includes('THE_GOLDEN_ALPHA');
  const isUpset = tags.includes('SMART_VALUE');
  const isTrap = tags.includes('STATISTICAL_TRAP');

  // V15.4 Terminology Purge
  const typeLabel = isGolden ? "⭐ SYSTEM LOCK" : isUpset ? "🔥 UPSET ALERT" : isTrap ? "⚠️ MANIPULATION RISK" : "PRO MATCHUP";
  const typeBadge = isGolden ? "text-cyan-400 bg-cyan-400/10 border-cyan-400/20" : isUpset ? "text-amber-400 bg-amber-400/10 border-amber-400/20" : isTrap ? "text-red-500 bg-red-500/10 border-red-500/20" : "text-slate-500 bg-slate-900/40 border-slate-800";

  return (
    <div className={`group transition-all duration-500 rounded-[2.5rem] border overflow-hidden relative ${isExpanded ? 'border-slate-700 bg-slate-900/50 shadow-2xl' : 'border-slate-900 hover:border-slate-800 bg-slate-950/50 hover:bg-slate-950 shadow-lg'}`}>

      {/* TRAP MODE: RED SLANTED STRIPES */}
      {isTrap && (
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #ef4444 0, #ef4444 10px, transparent 10px, transparent 20px)' }} />
      )}

      {/* 1. COLLAPSED VIEW (HIGH-DENSITY TERMINAL) */}
      <div onClick={onToggle} className="w-full cursor-pointer relative z-10">
        <div className={`h-1 w-full ${isGolden ? 'bg-cyan-500' : isUpset ? 'bg-amber-500' : isTrap ? 'bg-red-500' : 'bg-slate-800'}`} />

        <div className="grid grid-cols-1 md:grid-cols-12 items-center p-6 md:p-8 gap-6">

          {/* COLUMN 1: IDENTITY (LEFT) */}
          <div className="md:col-span-3 flex items-center gap-4">
            <div className="flex -space-x-4">
              <TeamBadge src={match.home_logo_url} name={match.home_team_name} />
              <TeamBadge src={match.away_logo_url} name={match.away_team_name} />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black text-white italic uppercase tracking-tighter">
                {getShortName(match.home_team_name)} <span className="text-slate-700">⚔️</span> {getShortName(match.away_team_name)}
              </span>
              <span className="text-[10px] text-slate-600 font-bold uppercase italic tracking-widest flex items-center gap-2">
                <Clock size={10} /> {formatLocalTime(match.match_date)}
              </span>
            </div>
          </div>

          {/* COLUMN 2: THE TRUTH BAR (CENTER) */}
          <div className="md:col-span-5 hidden md:flex flex-col gap-3 px-8 border-x border-slate-900/50">
            <div className="flex justify-between items-end">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Dominance Advantage</span>
              <span className={`text-xs font-black ${isTrap ? 'text-slate-700 line-through' : 'text-cyan-400'}`}>
                {isTrap ? "N/A" : `+${((match.edge || 0) * 100).toFixed(2)}%`}
              </span>
            </div>
            <div className="h-3 w-full bg-slate-900 rounded-full border border-slate-800 overflow-hidden relative group/tug">
              <div
                className={`h-full transition-all duration-1000 ${isGolden ? 'bg-cyan-500' : isTrap ? 'bg-red-500/40' : 'bg-slate-600'}`}
                style={{ width: `${(match.edge + 0.5 || 0.5) * 100}%` }}
              />
              <div className="absolute top-0 left-1/2 w-px h-full bg-slate-800/50" />
            </div>
            <div className="flex justify-between text-[8px] font-black text-slate-700 uppercase tracking-[0.2em]">
              <span>{match.home_short_name} MODEL</span>
              <span>{match.away_short_name} MODEL</span>
            </div>
          </div>

          {/* COLUMN 3: DECISION MATRIX (RIGHT) */}
          <div className="md:col-span-4 flex items-center justify-between pl-4">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1 italic">Upset Index</span>
              <span className={`text-3xl font-black italic leading-none ${isGolden ? 'text-cyan-400' : isUpset ? 'text-amber-400' : isTrap ? 'text-slate-800 line-through' : 'text-white'}`}>
                {isTrap ? "0.0x" : (Math.max((match.ev || 0) * 10 + 1, 1.1)).toFixed(2)}x
              </span>
            </div>

            <div className="flex flex-col items-end gap-2">
              <div className={`px-3 py-1 rounded text-[8px] font-black tracking-widest uppercase border ${typeBadge}`}>
                {typeLabel}
              </div>
              <div className="flex gap-1">
                {tags.map((t: string) => (
                  <span key={t} className="text-[7px] font-bold text-slate-700 uppercase tracking-tighter border border-slate-900/50 px-1.5 py-0.5 rounded">
                    {t.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* 2. EXPANDED VIEW (PROGRESSIVE DISCLOSURE LAYER) */}
      <div className={`transition-all duration-700 ease-in-out ${isExpanded ? 'max-h-[1200px] border-t border-slate-900 opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
        <div className="p-8 md:p-12 bg-slate-950/80 backdrop-blur-3xl">

          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">

            {/* PSYCHO: MOMENTUM */}
            <div className="p-6 bg-slate-900/40 rounded-3xl border border-slate-800">
              <div className="flex items-center gap-2 mb-4">
                <Activity size={14} className="text-cyan-400" />
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Psycho Engine</span>
              </div>
              <div className="flex justify-between items-end mb-2">
                <span className="text-2xl font-black text-white italic uppercase">Surging</span>
                <span className="text-[10px] font-black text-cyan-400">92/100</span>
              </div>
              <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-400 w-[92%]" />
              </div>
            </div>

            {/* BIO: FATIGUE */}
            <div className="p-6 bg-slate-900/40 rounded-3xl border border-slate-800">
              <div className="flex items-center gap-2 mb-4">
                <Zap size={14} className="text-amber-500" />
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Bio Engine</span>
              </div>
              <div className="flex justify-between items-end mb-2">
                <span className="text-2xl font-black text-emerald-400 italic uppercase">Optimal</span>
                <span className="text-[10px] font-black text-slate-600">STABLE</span>
              </div>
              <div className="flex gap-1 h-1">
                {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className={`flex-1 rounded-full ${i < 5 ? 'bg-emerald-500 shadow-[0_0_5px_emerald]' : 'bg-slate-800'}`} />)}
              </div>
            </div>

            {/* ACTION: CTA */}
            <div className="flex flex-col gap-4 justify-center">
              <Link
                href={`/matches/${match.match_id}`}
                className="w-full bg-white hover:bg-cyan-500 text-black py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.3em] flex items-center justify-center gap-3 transition-all hover:scale-[1.02] shadow-2xl group"
              >
                Enter War Room <ArrowRight size={16} className="group-hover:translate-x-2 transition-transform" />
              </Link>
              <div className="flex gap-4">
                <button className="flex-1 bg-slate-900 border border-slate-800 text-slate-500 py-4 rounded-[1.2rem] font-bold text-[9px] uppercase tracking-widest hover:text-white transition-colors">
                  Track Match
                </button>
                <button className="flex-1 bg-slate-900 border border-slate-800 text-slate-500 py-4 rounded-[1.2rem] font-bold text-[9px] uppercase tracking-widest hover:text-white transition-colors">
                  Add to Vault
                </button>
              </div>
            </div>

          </div>

          <div className="mt-12 pt-8 border-t border-slate-900/50 flex justify-between items-center px-4">
            <span className="text-[8px] font-black text-slate-700 uppercase tracking-[0.5em] italic">V13 Ghost Layer Behavioral Backbone Active</span>
            <div className="flex gap-6">
              <Link href={`/teams/${match.home_team_id || 'LIV'}`} className="text-[9px] font-black text-slate-500 hover:text-cyan-400 transition-colors uppercase tracking-widest">Team Profile</Link>
              <Link href={`/teams/${match.away_team_id || 'MCI'}`} className="text-[9px] font-black text-slate-500 hover:text-cyan-400 transition-colors uppercase tracking-widest">Opponent Profile</Link>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
