"use client"

import { useState, useEffect, useMemo } from 'react';
import { ChevronDown, ChevronUp, AlertCircle, Shield, ArrowRight } from 'lucide-react';

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
        console.error("Failed to fetch signals", e);
        setLoading(false);
      });
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col items-center">
      {/* 頂部 Header */}
      <div className="w-full max-w-4xl p-4 sm:p-6 border-b border-slate-800/80 sticky top-0 bg-slate-950/90 backdrop-blur-md z-50">
        <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-widest uppercase">
          Mosport <span className="text-cyan-400">Terminal</span>
        </h1>
        <div className="flex justify-between items-center mt-1">
          <p className="text-slate-500 text-xs font-mono">Live Intelligence Dashboard</p>
          <div className="flex gap-2">
             <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
             <span className="text-[10px] text-slate-400 font-mono">LIVE SYNC</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center p-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
        </div>
      ) : matches.length === 0 ? (
        <div className="w-full max-w-4xl p-10 text-center text-slate-500 font-mono text-sm">
          NO ACTIVE SIGNALS DETECTED
        </div>
      ) : (
        <div className="w-full max-w-4xl pb-20">
          {matches.map((match) => (
            <RowItem key={match.match_id} match={match} isExpanded={expandedId === match.match_id} onToggle={() => toggleExpand(match.match_id)} />
          ))}
        </div>
      )}
    </main>
  );
}

function RowItem({ match, isExpanded, onToggle }: { match: any, isExpanded: boolean, onToggle: () => void }) {
  const matchDate = new Date(match.match_date);
  const timeStr = matchDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Parsing bio-battery
  const { homeBattery, awayBattery } = useMemo(() => {
    let hb = 50, ab = 50;
    if (match.snapshots?.length > 0) {
      const fd = match.snapshots[0].feature_json;
      const rawHb = fd?.bio_battery_home ?? fd?.h_bio ?? fd?.home_energy;
      const rawAb = fd?.bio_battery_away ?? fd?.a_bio ?? fd?.away_energy;
      if (typeof rawHb === 'number') hb = rawHb;
      if (typeof rawAb === 'number') ab = rawAb;
    }
    const total = hb + ab;
    if (total > 0) return { homeBattery: Math.round((hb/total)*100), awayBattery: Math.round((ab/total)*100) };
    return { homeBattery: 50, awayBattery: 50 };
  }, [match]);

  const homeTeam = match.home_team?.team_name || "Unknown Home";
  const awayTeam = match.away_team?.team_name || "Unknown Away";
  const homeLogo = match.home_team?.logo_url;
  const awayLogo = match.away_team?.logo_url;

  const hasNarrative = !!match.narrative;
  const themeBorder = match.narrative_type === "fatigue" ? "border-cyan-400" :
                      match.narrative_type === "scandal" ? "border-orange-500" :
                      match.narrative_type === "news_driven" ? "border-purple-400" : "border-slate-600";
  const themeText = match.narrative_type === "fatigue" ? "text-cyan-400" :
                    match.narrative_type === "scandal" ? "text-orange-500" :
                    match.narrative_type === "news_driven" ? "text-purple-400" : "text-slate-400";
  const themeLabel = match.narrative_type?.toUpperCase() || "STANDARD ANALYSIS";

  return (
    <div className="group">
      {/* 🔴 Level 1: 極簡雷達清單 (Row UI) */}
      <div 
        onClick={onToggle}
        className={`flex justify-between items-center py-3 px-2 sm:px-4 border-b border-slate-800/80 cursor-pointer transition-colors ${isExpanded ? 'bg-slate-800/80' : 'hover:bg-slate-800/40 bg-slate-950'}`}
      >
        {/* Left: League & Time */}
        <div className="w-1/4 flex flex-col truncate pr-2">
          <span className="text-[10px] sm:text-xs text-slate-500 font-mono tracking-wider truncate">
            {match.league?.league_name?.substring(0,20) || "PRO LEAGUE"}
          </span>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] sm:text-xs text-slate-400 font-mono">{timeStr}</span>
            {match.status === "COMPLETED" && (
              <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">FIN</span>
            )}
          </div>
        </div>

        {/* Center: Teams (CSS Grid Alignment) */}
        <div className="w-1/2 flex justify-center items-center">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4 w-full max-w-md mx-auto">
            {/* 主隊 (靠右 + Logo) */}
            <div className="flex items-center justify-end gap-2 sm:gap-3 text-right">
              <span className="text-white font-bold text-xs sm:text-sm truncate">{homeTeam}</span>
              <img src={match.home_logo || "https://upload.wikimedia.org/wikipedia/commons/8/82/Transparent_background.png"} alt="Home" className="w-6 h-6 sm:w-8 sm:h-8 object-contain flex-shrink-0 drop-shadow-md" />
            </div>

            {/* VS (絕對置中) */}
            <div className="text-slate-500 font-black text-[10px] sm:text-xs px-1 sm:px-2 text-center">VS</div>

            {/* 客隊 (Logo + 靠左) */}
            <div className="flex items-center justify-start gap-2 sm:gap-3 text-left">
              <img src={match.away_logo || "https://upload.wikimedia.org/wikipedia/commons/8/82/Transparent_background.png"} alt="Away" className="w-6 h-6 sm:w-8 sm:h-8 object-contain flex-shrink-0 drop-shadow-md" />
              <span className="text-white font-bold text-xs sm:text-sm truncate">{awayTeam}</span>
            </div>
          </div>
        </div>

        {/* Right: Triggers */}
        <div className="w-1/4 flex justify-end items-center gap-3">
          {hasNarrative && (
            <AlertCircle size={14} className={`${themeText} animate-pulse`} />
          )}
          {isExpanded ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
        </div>
      </div>

      {/* 🔴 Level 2: 展開情報面板 (Expanded UI) */}
      {isExpanded && (
        <div className="bg-slate-900 px-4 py-5 sm:px-6 border-b border-slate-800 shadow-inner">
          
          {/* Logo & X-Factor Row */}
          <div className="flex items-start justify-between mb-6">
            
            {/* Home Side */}
            <div className="flex items-center gap-3 w-1/3">
              <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-slate-800/50 rounded-full border border-slate-700 p-1">
                {homeLogo ? (
                   <img src={homeLogo} alt={homeTeam} className="w-full h-full object-contain drop-shadow-md" />
                ) : (
                   <Shield size={20} className="text-slate-600" />
                )}
              </div>
              <div className="flex flex-col truncate">
                <span className="text-xs text-slate-300 font-bold truncate">{homeTeam}</span>
                <span className="text-[10px] text-cyan-500/80 font-mono truncate">X-Factor: 核心戰力</span>
              </div>
            </div>

            {/* Score or VS */}
            <div className="flex flex-col items-center justify-center w-1/3">
              {match.status === "COMPLETED" ? (
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-black text-white">{match.home_score}</span>
                  <span className="text-xs text-slate-600">-</span>
                  <span className="text-xl font-black text-white">{match.away_score}</span>
                </div>
              ) : (
                <span className="text-[10px] text-slate-600 font-black tracking-widest">MATCHUP</span>
              )}
            </div>

            {/* Away Side */}
            <div className="flex items-center justify-end gap-3 w-1/3 text-right flex-row-reverse">
              <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-slate-800/50 rounded-full border border-slate-700 p-1">
                {awayLogo ? (
                   <img src={awayLogo} alt={awayTeam} className="w-full h-full object-contain drop-shadow-md" />
                ) : (
                   <Shield size={20} className="text-slate-600" />
                )}
              </div>
              <div className="flex flex-col truncate">
                <span className="text-xs text-slate-300 font-bold truncate">{awayTeam}</span>
                <span className="text-[10px] text-orange-400/80 font-mono truncate">X-Factor: 防守樞紐</span>
              </div>
            </div>

          </div>

          {/* Bio-Battery Bar */}
          <div className="mb-6">
            <div className="flex justify-between items-center text-[10px] font-mono mb-1.5 px-1">
              <span className="text-emerald-400 font-bold">BATTERY {homeBattery}%</span>
              <span className="text-slate-600 tracking-widest">ENERGETIC GAP</span>
              <span className="text-red-400 font-bold">{awayBattery}% BATTERY</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800/80 rounded flex overflow-hidden border border-slate-700/50 relative">
               <div className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" style={{ width: `${homeBattery}%` }}></div>
               <div className="h-full bg-red-500" style={{ width: `${awayBattery}%` }}></div>
               <div className="absolute left-1/2 top-0 w-[1px] h-full bg-slate-900 -translate-x-1/2" />
            </div>
          </div>

          {/* Narrative Bubble */}
          <div className={`bg-slate-950/50 p-3 sm:p-4 rounded-r flex flex-col border-l-4 ${themeBorder} relative overflow-hidden group/narrative mb-4`}>
             <div className={`absolute -right-4 -top-4 w-24 h-24 bg-current opacity-[0.02] rounded-full blur-2xl ${themeText}`} />
             <span className={`text-[9px] font-bold tracking-widest uppercase mb-1 ${themeText}`}>
               {themeLabel}
             </span>
             <p className="text-xs text-slate-300 leading-relaxed font-medium">
               {match.narrative || "Waiting for intelligence feed..."}
             </p>
          </div>

          {/* Bottom Action Area */}
          <div className="flex justify-between items-end border-t border-slate-800/50 pt-3">
             <div className="flex gap-2">
               {match.signal_pick && (
                  <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                    PICK: {match.signal_pick}
                  </span>
               )}
               {match.signal_conf && (
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                    CONF: {match.signal_conf}%
                  </span>
               )}
             </div>
             <button className="flex items-center gap-1.5 text-[10px] sm:text-xs text-slate-400 hover:text-white transition-colors cursor-pointer group/btn font-mono uppercase">
               進入深度戰情室
               <ArrowRight size={12} className="group-hover/btn:translate-x-1 transition-transform text-cyan-500" />
             </button>
          </div>

        </div>
      )}
    </div>
  )
}
