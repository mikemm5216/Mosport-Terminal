"use client"

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronUp, ArrowRight, User, Zap, Activity, Info, Eye, CheckCircle, XCircle } from 'lucide-react';
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
          // V11.5 Priority Sorting
          const getPriority = (m: any) => {
            const tags = m.tags || [];
            if (tags.includes('THE_GOLDEN_ALPHA')) return 0;
            if (tags.includes('SMART_VALUE')) return 1;
            if (tags.includes('STATISTICAL_TRAP')) return 3;
            return 2; // NORMAL
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
    <main className="min-h-screen bg-slate-950 flex flex-col items-center overflow-x-hidden">
      {/* ?�� LIVE MATCH TICKER (MARQUEE) */}
      <LiveTicker />

      {/* HEADER */}
      <div className="w-full max-w-4xl p-6 sm:p-8 border-b border-slate-800/80 sticky top-0 bg-slate-950/90 backdrop-blur-md z-40">
        <h1 className="text-2xl sm:text-4xl font-black text-white tracking-widest uppercase">
          Mosport <span className="text-cyan-400">Terminal</span>
        </h1>
        <div className="flex justify-between items-center mt-2">
          <div className="flex gap-2 items-center">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">Decision Intelligence Active</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center p-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
        </div>
      ) : matches.length === 0 ? (
        <div className="w-full max-w-4xl p-20 text-center text-slate-500 font-mono text-sm tracking-widest uppercase border border-dashed border-slate-900 mt-8 rounded-2xl mx-4">
          No Intelligence Signals Found
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
  if (upper.includes('NBA') || upper.includes('BASKETBALL')) return '?? NBA';
  if (upper.includes('MLB') || upper.includes('BASEBALL')) return '??MLB';
  if (upper.includes('NFL') || upper.includes('FOOTBALL')) return '?? NFL';
  if (upper.includes('CHAMPIONS LEAGUE') || upper.includes('UEFA')) return '?? UEFA CHAMPIONS LEAGUE';
  if (upper.includes('PREMIER')) return `??PREMIER LEAGUE`;
  return upper ? `??${upper}` : '??PRO LEAGUE';
};

const toTLA = (name: string) => getShortName(name);

function RowItem({ match, isExpanded, onToggle }: { match: any, isExpanded: boolean, onToggle: () => void }) {
  const tags = match.tags || [];
  const signalId = match.future?.signalId || match.match_id;

  // 1. SIGNAL HEADER LOGIC
  const isGolden = tags.includes('THE_GOLDEN_ALPHA');
  const isValue = tags.includes('SMART_VALUE');
  const isTrap = tags.includes('STATISTICAL_TRAP');
  const isStale = tags.includes('STALE_ODDS');

  let headerStyle = "border-slate-800 text-slate-500 bg-slate-900/40";
  let tagLabel = match.signal || "NEUTRAL";

  if (isGolden) {
    headerStyle = "border-cyan-500 bg-cyan-500/10 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)] animate-pulse";
    tagLabel = "⭐ THE GOLDEN ALPHA";
  } else if (isValue) {
    headerStyle = "border-blue-500 bg-blue-500/10 text-blue-400";
    tagLabel = "🔥 SMART VALUE";
  } else if (isTrap) {
    headerStyle = "border-red-500 bg-red-500/10 text-red-500";
    tagLabel = "⚠️ STATISTICAL TRAP";
  }

  // 3. INTERPRETATION LAYER
  const getInterpretation = () => {
    if (isGolden) return "Market Inefficiency Detected";
    if (isTrap) return "High EV but Low Reliability";
    if (isStale) return "Market Data Outdated";
    return "Stable Quantitative Alignment";
  };

  const trackUserEvent = async (action: string, id: string) => {
    console.log(`[V13 Ghost] Recording decision: ${action} for signal ${id}`);
    // Mock API call per "Do not modify backend" constraint
    try {
      await fetch('/api/ghost/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, signalId: id })
      });
    } catch (e) { }
  };

  return (
    <div className={`group mb-4 rounded-xl border transition-all duration-500 overflow-hidden ${isExpanded ? 'border-slate-700 bg-slate-900/20' : 'border-slate-900/50 hover:border-slate-700 bg-slate-950'}`}>
      <div
        onClick={onToggle}
        className="w-full p-4 md:p-6 cursor-pointer relative"
      >
        {/* DECISION HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className={`px-4 py-1.5 rounded-full border text-[10px] md:text-xs font-black tracking-widest uppercase transition-all ${headerStyle}`}>
            {tagLabel}
          </div>

          <div className="flex items-center gap-6">
            <div className="flex flex-col items-end">
              <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">{getShortName(match.home_team_name)} VS {getShortName(match.away_team_name)}</span>
              <span className="text-[10px] text-slate-400 font-mono">{formatLocalTime(match.match_date)}</span>
            </div>
          </div>
        </div>

        {/* 2. CORE METRICS GRID */}
        <div className="grid grid-cols-3 gap-4 md:gap-8 mb-6">
          <div className="flex flex-col items-center justify-center p-3 bg-slate-900/50 rounded-lg border border-slate-800/50">
            <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Edge</span>
            <span className={`text-xl md:text-3xl font-black ${(match.edge || 0) > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
              {((match.edge || 0) * 100).toFixed(1)}%
            </span>
          </div>
          <div className="flex flex-col items-center justify-center p-3 bg-slate-900/50 rounded-lg border border-slate-800/50">
            <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Exp. EV</span>
            <span className={`text-xl md:text-3xl font-black ${(match.ev || 0) > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
              {((match.ev || 0) * 100).toFixed(1)}%
            </span>
          </div>
          <div className="flex flex-col items-center justify-center p-3 bg-slate-900/50 rounded-lg border border-slate-800/50">
            <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Confidence</span>
            <span className="text-xl md:text-3xl font-black text-cyan-400">
              {((match.confidence || 0) * 100).toFixed(1)}%
            </span>
          </div>
        </div>

        {/* 3. INTERPRETATION LAYER */}
        <div className="bg-slate-950 p-4 rounded-lg border-l-4 border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Info size={14} className="text-slate-500" />
            <span className="text-xs md:text-sm font-medium text-slate-300 italic">
              "{getInterpretation()}"
            </span>
          </div>
          {!isExpanded && <ChevronDown size={14} className="text-slate-700" />}
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 pb-6 md:px-6 md:pb-8 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="h-px bg-slate-800/50 w-full mb-6" />

          <div className="max-w-3xl mx-auto space-y-6">
            {/* 4. ACTION LAYER (V13) */}
            <div className="flex flex-col md:flex-row gap-3">
              <button
                onClick={(e) => { e.stopPropagation(); trackUserEvent("FOLLOW", signalId); }}
                className="flex-1 flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-black py-4 rounded-lg font-black text-xs uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(6,182,212,0.2)]"
              >
                <CheckCircle size={14} /> Follow Signal
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); trackUserEvent("VIEW", signalId); }}
                className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white py-4 rounded-lg font-black text-xs uppercase tracking-widest transition-all"
              >
                <Eye size={14} /> Watch Intel
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); trackUserEvent("IGNORE", signalId); }}
                className="flex-1 flex items-center justify-center gap-2 bg-slate-900/50 hover:bg-red-900/20 text-slate-500 hover:text-red-400 py-4 rounded-lg font-black text-xs uppercase tracking-widest transition-all border border-slate-800"
              >
                <XCircle size={14} /> Ignore Decision
              </button>
            </div>

            <div className="flex justify-center pt-2">
              <Link
                href={`/matches/${match.match_id}`}
                onClick={e => e.stopPropagation()}
                className="flex items-center gap-2 text-slate-500 hover:text-cyan-400 font-black text-[9px] uppercase tracking-[0.3em] transition-all"
              >
                Detailed World State Model <ArrowRight size={10} />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
