"use client"

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronDown, ArrowRight, User, Activity, Clock } from 'lucide-react';
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
      <div className="w-full max-w-4xl p-8 border-b border-slate-900 sticky top-0 bg-slate-950/90 backdrop-blur-xl z-40">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tighter uppercase italic leading-none">
              MOSPORT <span className="text-cyan-400">GLOBAL OS</span>
            </h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.4em] mt-2 italic">Next-Gen Sports Intelligence Ecosystem</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-[10px] font-black text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded border border-cyan-400/20 uppercase">SYSTEM LIVE</span>
            <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest italic">V15.1 BUILD</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center p-32">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.5)]"></div>
        </div>
      ) : (
        <div className="w-full max-w-4xl py-12 pb-32 px-4 space-y-8">
          {matches.length === 0 ? (
            <div className="p-20 text-center text-slate-600 font-black text-xs uppercase tracking-[0.3em] border-2 border-dashed border-slate-900 rounded-[2rem] italic">
              [ AWAITING FRESH INTEL STREAMS ]
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

const TeamShield = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

function DecisionCard({ match, isExpanded, onToggle }: { match: any, isExpanded: boolean, onToggle: () => void }) {
  const tags = match.tags || [];
  const signalId = match.future?.signalId || match.match_id;

  const isGolden = tags.includes('THE_GOLDEN_ALPHA');
  const isUpset = tags.includes('SMART_VALUE');
  const isVolatile = tags.includes('STATISTICAL_TRAP');

  let typeBadge = "text-slate-500 bg-slate-900/50";
  let typeLabel = "PRO MATCHUP";

  if (isGolden) {
    typeBadge = "text-cyan-400 bg-cyan-400/10 border border-cyan-400/20";
    typeLabel = "⭐ MAIN EVENT";
  } else if (isUpset) {
    typeBadge = "text-amber-400 bg-amber-400/10 border border-amber-400/20";
    typeLabel = "🔥 UPSET ALERT";
  } else if (isVolatile) {
    typeBadge = "text-red-500 bg-red-500/10 border border-red-500/20";
    typeLabel = "⚠️ VOLATILE BATTLE";
  }

  return (
    <div className={`group transition-all duration-700 rounded-[2.5rem] border overflow-hidden ${isExpanded ? 'border-slate-700 bg-slate-900/40' : 'border-slate-900/40 hover:border-slate-700 bg-slate-950 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.7)] hover:scale-[1.01]'}`}>
      <div onClick={onToggle} className="w-full cursor-pointer">

        {/* STORYLINE SLIVER */}
        <div className={`h-2 w-full ${isGolden ? 'bg-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.4)]' : isUpset ? 'bg-amber-500' : isVolatile ? 'bg-red-500' : 'bg-slate-800'}`} />

        <div className="p-8 md:p-12">
          {/* HEADER META */}
          <div className="flex justify-between items-center mb-12">
            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-[0.2em] uppercase ${typeBadge}`}>
              {typeLabel}
            </span>
            <div className="flex items-center gap-6 text-[10px] text-slate-500 font-bold uppercase italic tracking-widest">
              <span className="flex items-center gap-2"><Activity size={14} className={isGolden ? 'text-cyan-400' : 'text-slate-600'} /> {match.sport?.toUpperCase() || 'PRO LEAGUE'}</span>
              <span className="flex items-center gap-2"><Clock size={14} className="text-slate-600" /> {formatLocalTime(match.match_date)}</span>
            </div>
          </div>

          {/* HERO CENTER: THE MATCHUP */}
          <div className="flex items-center justify-between gap-4 md:gap-16 relative py-4">

            {/* HOME TEAM - MASSIVE FOCUS */}
            <div className="flex-1 flex flex-col items-center gap-6 group/team">
              <div className="w-28 h-28 md:w-44 md:h-44 rounded-[3rem] bg-slate-900/80 border-2 border-slate-800/50 transition-all duration-500 group-hover/team:scale-110 group-hover/team:border-cyan-500/50 flex items-center justify-center overflow-hidden shadow-[0_30px_70px_rgba(0,0,0,0.6)] relative">
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                {match.home_logo_url ? (
                  <img src={match.home_logo_url} alt={match.home_team_name} className="w-20 h-20 md:w-32 md:h-32 object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)] contrast-110 saturate-110" />
                ) : (
                  <TeamShield className="w-16 h-16 md:w-28 md:h-28 text-slate-800" />
                )}
              </div>
              <div className="text-center">
                <h3 className="text-3xl md:text-5xl font-black text-white italic uppercase tracking-tighter leading-none">{getShortName(match.home_team_name)}</h3>
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] mt-2">HOME FRANCHISE</p>
              </div>
            </div>

            {/* MIDPOINT: VS / TUG-OF-WAR */}
            <div className="flex flex-col items-center justify-center gap-8 flex-shrink-0">
              <div className="text-slate-900 font-black text-6xl md:text-9xl italic select-none tracking-tighter leading-none opacity-40">VS</div>
              <div className="w-32 md:w-48 h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800/50 relative shadow-inner">
                <div
                  className={`h-full transition-all duration-1000 ease-out ${isGolden ? 'bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.6)]' : 'bg-slate-700'}`}
                  style={{ width: `${(match.edge || 0.5) * 100}%` }}
                />
              </div>
            </div>

            {/* AWAY TEAM - MASSIVE FOCUS */}
            <div className="flex-1 flex flex-col items-center gap-6 group/team">
              <div className="w-28 h-28 md:w-44 md:h-44 rounded-[3rem] bg-slate-900/80 border-2 border-slate-800/50 transition-all duration-500 group-hover/team:scale-110 group-hover/team:border-cyan-500/50 flex items-center justify-center overflow-hidden shadow-[0_30px_70px_rgba(0,0,0,0.6)] relative">
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                {match.away_logo_url ? (
                  <img src={match.away_logo_url} alt={match.away_team_name} className="w-20 h-20 md:w-32 md:h-32 object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)] contrast-110 saturate-110" />
                ) : (
                  <TeamShield className="w-16 h-16 md:w-28 md:h-28 text-slate-800" />
                )}
              </div>
              <div className="text-center">
                <h3 className="text-3xl md:text-5xl font-black text-white italic uppercase tracking-tighter leading-none">{getShortName(match.away_team_name)}</h3>
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] mt-2">AWAY FRANCHISE</p>
              </div>
            </div>

          </div>
        </div>

        {/* DATA FOOTER: COMPACT METRICS BAR */}
        <div className="bg-slate-950 border-t border-slate-900 px-10 py-5 flex items-center justify-between backdrop-blur-3xl group-hover:bg-slate-900/50 transition-colors">
          <div className="flex items-center gap-8 md:gap-16">
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Dominance</span>
              <span className={`text-sm md:text-lg font-black italic ${isGolden ? 'text-cyan-400' : 'text-slate-200'}`}>
                {((match.edge || 0) * 100).toFixed(0)}%
              </span>
            </div>
            <div className="flex flex-col border-l border-slate-800 pl-8 md:pl-16">
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Upset Index</span>
              <span className="text-sm md:text-lg font-black italic text-amber-500">
                {((match.ev || 0) * 10).toFixed(1)}x
              </span>
            </div>
            <div className="flex flex-col border-l border-slate-800 pl-8 md:pl-16">
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Hype Rating</span>
              <span className="text-sm md:text-lg font-black italic text-white">
                {((match.confidence || 0) * 100).toFixed(0)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden md:block text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] italic">AI Strategic Feed Active</span>
            <div className="w-10 h-10 rounded-full border border-slate-800 flex items-center justify-center text-slate-500 group-hover:text-cyan-400 group-hover:border-cyan-500/50 transition-all">
              <ChevronDown size={20} className={`transition-transform duration-500 ${isExpanded ? 'rotate-180' : ''}`} />
            </div>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="px-10 pb-16 md:px-20 md:pb-24 animate-in fade-in slide-in-from-top-10 duration-700">
          <div className="h-px bg-gradient-to-r from-transparent via-slate-800 to-transparent w-full mb-12" />

          <div className="max-w-4xl mx-auto flex flex-col gap-12">
            <div className="flex flex-col md:flex-row gap-6">
              <Link
                href={`/matches/${match.match_id}`}
                className="flex-[2] flex items-center justify-center gap-4 bg-white hover:bg-cyan-500 text-black py-7 rounded-[2.5rem] font-black text-sm uppercase tracking-[0.3em] transition-all hover:scale-[1.02] active:scale-95 shadow-2xl shadow-cyan-500/10 group/btn"
              >
                Enter Intelligence War Room <ArrowRight size={20} className="group-hover/btn:translate-x-2 transition-transform" />
              </Link>
              <button
                onClick={(e) => { e.stopPropagation(); trackUserEvent("VIEW", signalId); }}
                className="flex-1 flex items-center justify-center gap-3 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 py-7 rounded-[2.5rem] font-black text-sm uppercase tracking-[0.3em] transition-all"
              >
                Join Hype Stream
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Link href={`/teams/${match.home_team_id || 'LIV'}`} className="flex items-center justify-between p-8 bg-slate-950/40 border border-slate-900 rounded-[2rem] hover:border-cyan-500/40 transition-all hover:shadow-2xl hover:shadow-cyan-500/5 group/vault">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-600 uppercase mb-2 tracking-[0.3em]">TEAM ARCHIVE</span>
                  <span className="text-xl font-black text-white uppercase italic tracking-tighter">{match.home_team_name}</span>
                </div>
                <div className="w-14 h-14 bg-slate-900/80 rounded-2xl flex items-center justify-center border border-slate-800 group-hover/vault:border-cyan-500/50 transition-colors">
                  <User size={24} className="text-slate-600 group-hover:text-cyan-400" />
                </div>
              </Link>
              <Link href={`/teams/${match.away_team_id || 'OPP'}`} className="flex items-center justify-between p-8 bg-slate-950/40 border border-slate-900 rounded-[2rem] hover:border-cyan-500/40 transition-all hover:shadow-2xl hover:shadow-cyan-500/5 group/vault">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-600 uppercase mb-2 tracking-[0.3em]">TEAM ARCHIVE</span>
                  <span className="text-xl font-black text-white uppercase italic tracking-tighter">{match.away_team_name}</span>
                </div>
                <div className="w-14 h-14 bg-slate-900/80 rounded-2xl flex items-center justify-center border border-slate-800 group-hover/vault:border-cyan-500/50 transition-colors">
                  <User size={24} className="text-slate-600 group-hover:text-cyan-400" />
                </div>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
