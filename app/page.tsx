"use client"

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronUp, AlertCircle, ArrowRight } from 'lucide-react';
import MatchTicker from '@/components/match-ticker';

export default function Home() {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/signals')
      .then(res => res.json())
      .then(data => {
        if (data.success) setMatches(data.data);
        setLoading(false);
      })
      .catch(e => {
        console.error("Failed to fetch signals", e);
        setLoading(false);
      });
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col items-center overflow-x-hidden">
      {/* 🟢 LIVE MATCH TICKER (MARQUEE) */}
      <MatchTicker />

      {/* HEADER */}
      <div className="w-full max-w-4xl p-6 sm:p-8 border-b border-slate-800/80 sticky top-0 bg-slate-950/90 backdrop-blur-md z-40">
        <h1 className="text-2xl sm:text-4xl font-black text-white tracking-widest uppercase">
          Mosport <span className="text-cyan-400">Terminal</span>
        </h1>
        <div className="flex justify-between items-center mt-2">
          <p className="text-slate-500 text-[10px] md:text-xs font-mono uppercase tracking-[0.3em]">Proprietary Intelligence Grid v2.5</p>
          <div className="flex gap-2 items-center">
             <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
             <span className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">Live Link Active</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center p-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
        </div>
      ) : matches.length === 0 ? (
        <div className="w-full max-w-4xl p-20 text-center text-slate-500 font-mono text-sm tracking-widest uppercase border border-dashed border-slate-900 mt-8 rounded-2xl mx-4">
          No Active Intelligence Signals
        </div>
      ) : (
        <div className="w-full max-w-4xl pb-20 px-4">
          {matches.map((match) => (
            <RowItem key={match.match_id} match={match} isExpanded={expandedId === match.match_id} onToggle={() => toggleExpand(match.match_id)} />
          ))}
        </div>
      )}
    </main>
  );
}

const getLeagueDisplay = (leagueName?: string): string => {
  const upper = (leagueName || '').toUpperCase();
  if (upper.includes('NBA') || upper.includes('BASKETBALL')) return '🏀 NBA';
  if (upper.includes('MLB') || upper.includes('BASEBALL')) return '⚾ MLB';
  if (upper.includes('NFL') || upper.includes('FOOTBALL')) return '🏈 NFL';
  if (upper.includes('CHAMPIONS LEAGUE') || upper.includes('UEFA')) return '🏆 UEFA CHAMPIONS LEAGUE';
  if (upper.includes('PREMIER')) return `⚽ PREMIER LEAGUE`;
  return upper ? `⚽ ${upper}` : '⚽ PRO LEAGUE';
};

function RowItem({ match, isExpanded, onToggle }: { match: any, isExpanded: boolean, onToggle: () => void }) {
  const matchDate = new Date(match.match_date);
  const timeStr = matchDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

  const isUCL = (match.league?.league_name || '').toUpperCase().includes('CHAMPIONS LEAGUE');

  return (
    <div className="group border-b border-slate-900/50">
      {/* 🔴 Level 1: Extreme Radar List (Row UI) */}
      <div 
        onClick={onToggle}
        className={`w-full py-6 md:py-8 cursor-pointer transition-all duration-300 relative overflow-hidden ${isExpanded ? 'bg-slate-900/40' : 'hover:bg-slate-900/20'}`}
      >
        {/* LEAGUE / TIME / TOGGLER HEADER */}
        <div className="flex justify-between items-center px-4 md:px-6 mb-4">
           <div className="flex items-center gap-4">
             <span className="text-[10px] md:text-sm text-slate-400 font-black tracking-[0.2em] uppercase flex items-center gap-2">
               {getLeagueDisplay(match.league?.league_name)}
               {isUCL && (
                 <span className="text-[8px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded shadow-[0_0_10px_rgba(52,211,153,0.2)] animate-pulse">
                   [FREE TO VIEW]
                 </span>
               )}
             </span>
             {match.primaryTag && (
               <div className="flex items-center gap-2 bg-cyan-500/5 border border-cyan-500/10 px-3 py-1 rounded-full group-hover:border-cyan-500/30 transition-colors">
                 <span className="text-[9px] md:text-xs font-black text-cyan-500 tracking-tighter uppercase whitespace-nowrap">THE SIGN ➔</span>
                 <span className="text-[9px] md:text-xs font-black text-white tracking-[0.1em] uppercase truncate max-w-[150px] md:max-w-none">{match.primaryTag}</span>
               </div>
             )}
           </div>
           <div className="flex items-center gap-3">
             <span className="text-[10px] md:text-sm text-slate-500 font-mono tracking-widest font-bold">{timeStr} UTC</span>
             {match.status === "COMPLETED" && (
               <span className="text-[9px] md:text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700 font-black uppercase tracking-widest">FINAL</span>
             )}
             {isExpanded ? <ChevronUp size={16} className="text-slate-600" /> : <ChevronDown size={16} className="text-slate-600" />}
           </div>
        </div>

        {/* STRICT SYMMETRICAL GRID */}
        <div className="grid grid-cols-[1fr_60px_1fr] md:grid-cols-[1fr_100px_1fr] items-center gap-4 md:gap-10 w-full px-4 md:px-6">
          
          {/* HOME TEAM */}
          <div className="flex items-center justify-end gap-4 md:gap-8">
            <span className="text-white font-black text-2xl md:text-5xl tracking-tighter uppercase transition-transform group-hover:scale-105 duration-500">
              {match.home_short_name}
            </span>
            {match.home_logo ? (
              <img src={match.home_logo} alt="Home" className="w-10 h-10 md:w-16 md:h-16 object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.1)] transition-transform group-hover:rotate-6" />
            ) : (
              <div className="w-10 h-10 md:w-14 md:h-14 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-xs font-black text-slate-600">
                {match.home_short_name}
              </div>
            )}
          </div>

          {/* VS */}
          <div className="text-slate-800 font-black text-xl md:text-3xl text-center italic tracking-widest opacity-40">VS</div>

          {/* AWAY TEAM */}
          <div className="flex items-center justify-start gap-4 md:gap-8">
            {match.away_logo ? (
              <img src={match.away_logo} alt="Away" className="w-10 h-10 md:w-16 md:h-16 object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.1)] transition-transform group-hover:-rotate-6" />
            ) : (
              <div className="w-10 h-10 md:w-14 md:h-14 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-xs font-black text-slate-600">
                {match.away_short_name}
              </div>
            )}
            <span className="text-white font-black text-2xl md:text-5xl tracking-tighter uppercase transition-transform group-hover:scale-105 duration-500">
              {match.away_short_name}
            </span>
          </div>
        </div>
      </div>

      {/* 🔴 Level 2: Expanded Intelligence Panel */}
      {isExpanded && (
        <div className="bg-slate-900/60 px-6 py-8 md:px-12 border-t border-slate-800/50 shadow-inner">
          <div className="max-w-3xl mx-auto">
            {/* Market Sentiment Bubble */}
            <div className="bg-slate-950/80 p-6 md:p-8 rounded-xl border border-slate-800 relative overflow-hidden group/narrative mb-8">
               <div className="absolute top-0 right-0 w-1 h-full bg-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.4)]" />
               <div className="flex justify-between items-center mb-4">
                 <div className="flex items-center gap-2">
                   <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                   <span className="text-[10px] font-black tracking-[0.2em] uppercase text-purple-400">
                     Market Sentiment Intelligence
                   </span>
                 </div>
                 <span className="text-[9px] font-mono text-slate-600 uppercase tracking-widest">Ref: Global Consensus Grid</span>
               </div>
               <p className="text-base md:text-lg text-slate-200 leading-relaxed font-medium italic">
                 "{match.marketSentiment || "Aggregating market intelligence and expert keywords..."}"
               </p>
            </div>

            {/* Bottom Action Area */}
            <div className="flex justify-between items-center border-t border-slate-800/50 pt-6">
               <div className="flex gap-4">
                 <div className="flex flex-col">
                   <span className="text-[8px] font-mono text-slate-600 uppercase mb-1">Confidence</span>
                   <span className="text-xs font-black text-cyan-400">HIGH_RELIABILITY</span>
                 </div>
               </div>
               <Link
                 href={`/matches/${match.match_id}`}
                 onClick={e => e.stopPropagation()}
                 className="flex items-center gap-3 bg-white text-black px-6 py-2 rounded font-black text-[10px] md:text-xs uppercase tracking-widest hover:bg-cyan-400 transition-colors"
               >
                 ENTER WAR ROOM <ArrowRight size={14} />
               </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
