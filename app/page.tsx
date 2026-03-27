"use client"

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronDown, ArrowRight, User, Activity, Clock, Zap, Target, Shield } from 'lucide-react';
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
          const getPriority = (m: any) => {
            const tags = m.tags || [];
            if (tags.includes('THE_GOLDEN_ALPHA')) return 0;
            if (tags.includes('SMART_VALUE')) return 1;
            if (tags.includes('STATISTICAL_TRAP')) return 3;
            return 2;
          };
          const sorted = [...data.data].sort((a, b) => getPriority(a) - getPriority(b));
          setMatches(sorted);
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

      {/* HEADER: MOSPORT GLOBAL OS */}
      <div className="w-full max-w-4xl p-8 border-b border-slate-900 sticky top-0 bg-slate-950/90 backdrop-blur-3xl z-40">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tighter uppercase italic leading-none">
              MOSPORT <span className="text-cyan-400 font-black">GLOBAL OS</span>
            </h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.4em] mt-2 italic">Next-Gen Sports Intelligence Ecosystem</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-[10px] font-black text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded border border-cyan-400/20 uppercase">SYSTEM LIVE</span>
            <span className="text-[8px] font-bold text-slate-700 uppercase tracking-widest italic">V15.2 ACCORDION</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center p-40">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.4)]"></div>
        </div>
      ) : (
        <div className="w-full max-w-4xl py-12 pb-40 px-4 space-y-6">
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
  const dim = size === "lg" ? "w-28 h-28 md:w-36 md:h-36" : "w-16 h-16 md:w-24 md:h-24";
  const iconDim = size === "lg" ? "w-16 h-16 md:w-24 md:h-24" : "w-10 h-10 md:w-16 md:h-16";

  return (
    <div className={`${dim} rounded-[2rem] bg-slate-900 border border-slate-800 transition-all duration-500 flex items-center justify-center group-hover:border-cyan-500/30 overflow-hidden relative shadow-2xl`}>
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
      {src ? (
        <img src={src} alt={name} className={`${iconDim} object-contain drop-shadow-[0_10px_10px_rgba(0,0,0,0.8)] contrast-110 saturate-125`} />
      ) : (
        <Shield className={`${iconDim} text-slate-800`} strokeWidth={1.5} />
      )}
    </div>
  );
};

function DecisionCard({ match, isExpanded, onToggle }: { match: any, isExpanded: boolean, onToggle: () => void }) {
  const tags = match.tags || [];
  const signalId = match.future?.signalId || match.match_id;

  const isGolden = tags.includes('THE_GOLDEN_ALPHA');
  const isUpset = tags.includes('SMART_VALUE');
  const isVolatile = tags.includes('STATISTICAL_TRAP');

  let typeBadge = "text-slate-500 bg-slate-900/40";
  let typeLabel = "MATCHUP";

  if (isGolden) {
    typeBadge = "text-cyan-400 bg-cyan-400/10 border border-cyan-400/20";
    typeLabel = "⭐ MAIN EVENT";
  } else if (isUpset) {
    typeBadge = "text-amber-400 bg-amber-400/10 border border-amber-400/20";
    typeLabel = "🔥 UPSET ALERT";
  } else if (isVolatile) {
    typeBadge = "text-red-500 bg-red-500/10 border border-red-500/20";
    typeLabel = "⚠️ VOLATILE MATCH";
  }

  const trackUserEvent = async (action: string, id: string) => {
    try {
      await fetch('/api/ghost/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, signalId: id })
      });
    } catch (e) { }
  };

  return (
    <div className={`group transition-all duration-500 rounded-[2.5rem] border overflow-hidden ${isExpanded ? 'border-slate-700 bg-slate-900/50 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.8)]' : 'border-slate-900 hover:border-slate-800 bg-slate-950/50 hover:bg-slate-950 shadow-xl'}`}>

      {/* 1. COLLAPSED VIEW (PURE MATCHUP) */}
      <div onClick={onToggle} className="w-full cursor-pointer relative">
        <div className={`h-1.5 w-full ${isGolden ? 'bg-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.4)]' : isUpset ? 'bg-amber-500' : isVolatile ? 'bg-red-500' : 'bg-slate-800'}`} />

        <div className="p-8 md:p-10 flex flex-col md:flex-row items-center gap-8 md:gap-12">

          {/* HEADER META (LEFT FOR DESKTOP, TOP FOR MOBILE) */}
          <div className="w-full md:w-auto flex md:flex-col justify-between items-center md:items-start gap-4 flex-shrink-0">
            <span className={`px-4 py-1.5 rounded-full text-[9px] font-black tracking-[0.2em] uppercase ${typeBadge}`}>
              {typeLabel}
            </span>
            <span className="text-[10px] text-slate-600 font-bold uppercase italic tracking-widest flex items-center gap-2">
              <Clock size={12} className="text-slate-800" /> {formatLocalTime(match.match_date)}
            </span>
          </div>

          {/* HERO CENTER: LOGO PAIRING */}
          <div className="flex-1 flex items-center justify-center gap-6 md:gap-10">
            <div className="flex flex-col items-center gap-3">
              <TeamBadge src={match.home_logo_url} name={match.home_team_name} />
              <span className="text-lg md:text-2xl font-black text-white italic uppercase tracking-tighter">{getShortName(match.home_team_name)}</span>
            </div>

            <div className="flex flex-col items-center justify-center">
              <span className="text-slate-900 font-black text-4xl md:text-5xl italic opacity-40 mb-2">VS</span>
              <div className="w-1.5 h-12 bg-slate-900 rounded-full border border-slate-800/40 relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-slate-950 border-2 border-slate-800 rounded-full flex items-center justify-center">
                  <div className={`w-1 h-1 rounded-full ${isExpanded ? 'bg-cyan-400 shadow-[0_0_5px_cyan]' : 'bg-slate-700'}`} />
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center gap-3">
              <TeamBadge src={match.away_logo_url} name={match.away_team_name} />
              <span className="text-lg md:text-2xl font-black text-white italic uppercase tracking-tighter">{getShortName(match.away_team_name)}</span>
            </div>
          </div>

          {/* INDICATOR */}
          <div className="flex-shrink-0 text-slate-800 group-hover:text-slate-500 transition-colors hidden md:block">
            <ChevronDown size={32} className={`transition-transform duration-500 ${isExpanded ? 'rotate-180 text-cyan-500' : ''}`} />
          </div>
        </div>
      </div>

      {/* 2. EXPANDED VIEW (AI INTELLIGENCE LAYER) */}
      <div className={`transition-all duration-500 ease-in-out ${isExpanded ? 'max-h-[1200px] border-t border-slate-900 opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="p-8 md:p-12 bg-slate-950/50 backdrop-blur-3xl">

          <div className="max-w-4xl mx-auto space-y-12">

            {/* PANEL: AI ENGINE FEED */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

              {/* WIN PROBABILITY (TUG-OF-WAR) */}
              <div className="flex flex-col gap-4 p-6 bg-slate-900/30 border border-slate-900 rounded-3xl relative overflow-hidden">
                <div className="flex items-center gap-2 mb-2">
                  <Target size={14} className="text-cyan-400" />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Win Probability</span>
                </div>
                <div className="flex items-end justify-between mb-2">
                  <span className="text-2xl font-black text-white italic leading-none">{((match.edge || 0.5) * 100).toFixed(0)}%</span>
                  <span className="text-[9px] font-bold text-slate-600 uppercase italic">Favoring {getShortName(match.home_team_name)}</span>
                </div>
                <div className="w-full h-3 bg-slate-950 rounded-full border border-slate-800 overflow-hidden shadow-inner">
                  <div
                    className={`h-full transition-all duration-1000 ${isGolden ? 'bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.5)]' : 'bg-slate-700'}`}
                    style={{ width: `${(match.edge || 0.5) * 100}%` }}
                  />
                </div>
              </div>

              {/* BIO ENGINE (DOMINANCE) */}
              <div className="flex flex-col gap-4 p-6 bg-slate-900/30 border border-slate-900 rounded-3xl">
                <div className="flex items-center gap-2 mb-2">
                  <Activity size={14} className="text-emerald-500" />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Bio Engine</span>
                </div>
                <div className="flex items-end justify-between">
                  <span className="text-2xl font-black text-emerald-400 italic leading-none">{((match.ev || 0) * 10).toFixed(1)}x</span>
                  <span className="text-[9px] font-bold text-slate-600 uppercase italic">Upset Index</span>
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= (match.ev || 0) * 5 ? 'bg-emerald-500' : 'bg-slate-800'}`} />
                  ))}
                </div>
              </div>

              {/* PSYCHO ENGINE (MOMENTUM) */}
              <div className="flex flex-col gap-4 p-6 bg-slate-900/30 border border-slate-900 rounded-3xl">
                <div className="flex items-center gap-2 mb-2">
                  <Zap size={14} className="text-amber-500" />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Psycho Engine</span>
                </div>
                <div className="flex items-end justify-between">
                  <span className="text-2xl font-black text-white italic leading-none">{((match.confidence || 0) * 100).toFixed(0)}</span>
                  <span className="text-[9px] font-bold text-slate-600 uppercase italic">Hype Rating</span>
                </div>
                <div className="text-[9px] font-black text-amber-500/80 uppercase tracking-wider bg-amber-500/5 py-1 px-3 rounded-lg border border-amber-500/20 text-center">
                  {isGolden ? "CRITICAL MOMENTUM DETECTED" : "TACTICAL EQUILIBRIUM"}
                </div>
              </div>

            </div>

            {/* 3. CTA LAYER */}
            <div className="flex flex-col md:flex-row gap-6">
              <Link
                href={`/matches/${match.match_id}`}
                className="flex-[2] flex items-center justify-center gap-4 bg-white hover:bg-cyan-500 text-black py-7 rounded-[2.5rem] font-black text-sm uppercase tracking-[0.3em] transition-all hover:scale-[1.02] active:scale-95 shadow-[0_30px_60px_-10px_rgba(255,255,255,0.1)] group/btn"
              >
                Enter War Room <ArrowRight size={20} className="group-hover/btn:translate-x-2 transition-transform" />
              </Link>
              <button
                onClick={(e) => { e.stopPropagation(); trackUserEvent("VIEW", signalId); }}
                className="flex-1 flex items-center justify-center gap-3 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 py-7 rounded-[2.5rem] font-black text-sm uppercase tracking-[0.3em] transition-all"
              >
                Watch Live Feed
              </button>
            </div>

            {/* ARCHIVE LINKS */}
            <div className="grid grid-cols-2 gap-6">
              <Link href={`/teams/${match.home_team_id || 'LIV'}`} className="flex items-center justify-between p-6 bg-slate-950/40 border border-slate-900 rounded-[2rem] hover:border-cyan-500/30 transition-all hover:shadow-2xl group/vault">
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-slate-700 uppercase mb-2 tracking-[0.3em]">TEAM VAULT</span>
                  <span className="text-base font-black text-white uppercase italic tracking-tighter opacity-80 group-hover/vault:opacity-100">{match.home_team_name}</span>
                </div>
                <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center border border-slate-800 group-hover/vault:border-cyan-500/50 transition-colors">
                  <User size={18} className="text-slate-700 group-hover:text-cyan-400" />
                </div>
              </Link>
              <Link href={`/teams/${match.away_team_id || 'OPP'}`} className="flex items-center justify-between p-6 bg-slate-950/40 border border-slate-900 rounded-[2rem] hover:border-cyan-500/30 transition-all hover:shadow-2xl group/vault">
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-slate-700 uppercase mb-2 tracking-[0.3em]">TEAM VAULT</span>
                  <span className="text-base font-black text-white uppercase italic tracking-tighter opacity-80 group-hover/vault:opacity-100">{match.away_team_name}</span>
                </div>
                <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center border border-slate-800 group-hover/vault:border-cyan-500/50 transition-colors">
                  <User size={18} className="text-slate-700 group-hover:text-cyan-400" />
                </div>
              </Link>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
