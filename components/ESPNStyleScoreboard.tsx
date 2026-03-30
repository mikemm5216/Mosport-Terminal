"use client";

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Zap, Activity, Info } from 'lucide-react';
import LogoFallback from './LogoFallback';

export default function ESPNStyleScoreboard({ matches }: { matches: any[] }) {
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const toggleExpand = (id: string) => {
        setExpandedId(prev => (prev === id ? null : id));
    };

    if (!matches || matches.length === 0) {
        return (
            <div className="w-full flex flex-col items-center justify-center p-12 border border-dashed border-slate-800 rounded-xl bg-slate-900/10">
                <span className="text-slate-600 font-black tracking-[0.5em] uppercase text-[10px] italic text-center">
                    [ NO ACTIVE MATCH INTELLIGENCE SCHEDULED FOR THIS CYCLE ]
                </span>
            </div>
        );
    }

    return (
        <div className="w-full max-w-7xl mx-auto flex flex-col space-y-1.5 px-2 md:px-0">
            {matches.map((match, idx) => {
                const uniqueId = match.match_id || match.id || `match-${idx}`;
                const isExpanded = expandedId === uniqueId;
                const hasUpset = match.signal_label?.includes("UPSET") || (match.confidence > 0.8 && match.win_probabilities?.home_win_prob < 0.4);

                return (
                    <div key={uniqueId} className="w-full bg-[#020617] border border-slate-900 rounded-md overflow-hidden transition-all hover:border-cyan-500/40 shadow-lg group">
                        <div
                            onClick={() => toggleExpand(uniqueId)}
                            className="flex items-center justify-between px-3 py-3 md:px-6 md:py-4 cursor-pointer select-none relative"
                        >
                            {/* 1. TIME/STATUS (LEFT) */}
                            <div className="flex flex-col items-start min-w-[60px] md:min-w-[80px]">
                                <span className="text-[10px] md:text-sm font-black text-slate-500 uppercase tracking-tighter tabular-nums leading-none mb-1">
                                    {match.time || (match.start_time ? new Date(match.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : "19:00")}
                                </span>
                                <span className={`text-[8px] md:text-[10px] font-black uppercase tracking-widest leading-none ${match.status === 'live' ? 'text-red-500 animate-pulse' : 'text-cyan-400'}`}>
                                    {match.status?.toUpperCase() || 'FINAL'}
                                </span>
                            </div>

                            {/* 2. TEAMS (HORIZONTAL PIVOT - Perfectly Balanced) */}
                            <div className="flex-1 flex items-center justify-center gap-2 md:gap-12 px-2 md:px-10">
                                {/* HOME TEAM */}
                                <div className="flex items-center justify-end gap-2 md:gap-4 flex-1">
                                    <span className="text-xl md:text-4xl lg:text-5xl font-black text-white italic uppercase tracking-tighter leading-none transition-colors group-hover:text-cyan-400 text-right">
                                        {match.home_team?.short_name}
                                    </span>
                                    <LogoFallback
                                        url={match.home_team?.logo_url}
                                        name={match.home_team?.short_name}
                                        shortName={match.home_team?.short_name}
                                        sport={match.sport}
                                        size={40}
                                        className="w-6 h-6 md:w-10 md:h-10"
                                    />
                                </div>

                                {/* VS ICON */}
                                <div className="flex items-center justify-center px-1 md:px-4">
                                    <span className="text-lg md:text-2xl font-black text-slate-800 italic opacity-50 text-center">⚔️</span>
                                </div>

                                {/* AWAY TEAM */}
                                <div className="flex items-center justify-start gap-2 md:gap-4 flex-1">
                                    <LogoFallback
                                        url={match.away_team?.logo_url}
                                        name={match.away_team?.short_name}
                                        shortName={match.away_team?.short_name}
                                        sport={match.sport}
                                        size={40}
                                        className="w-6 h-6 md:w-10 md:h-10"
                                    />
                                    <span className="text-xl md:text-4xl lg:text-5xl font-black text-white italic uppercase tracking-tighter leading-none transition-colors group-hover:text-cyan-400 text-left">
                                        {match.away_team?.short_name}
                                    </span>
                                </div>
                            </div>

                            {/* 3. AI TAGS (RIGHT) */}
                            <div className="flex items-center gap-3 min-w-[60px] md:min-w-[100px] justify-end">
                                {hasUpset ? (
                                    <div className="px-1.5 md:px-2 py-0.5 bg-cyan-950/20 border border-cyan-500/50 rounded flex items-center gap-1">
                                        <div className="w-1 h-1 rounded-full bg-cyan-400 animate-ping" />
                                        <span className="text-[7px] md:text-[10px] font-black text-cyan-400 tracking-widest uppercase italic whitespace-nowrap">UPSET ALERT</span>
                                    </div>
                                ) : (
                                    <div className="px-1.5 py-0.5 border border-slate-900 rounded opacity-20 hidden md:block">
                                        <span className="text-[7px] md:text-[9px] font-black text-slate-600 uppercase tracking-widest italic">LOCKED</span>
                                    </div>
                                )}
                                <ChevronDown size={14} className={`text-cyan-500 transition-transform duration-300 opacity-20 group-hover:opacity-100 ${isExpanded ? 'rotate-180' : ''}`} />
                            </div>
                        </div>

                        {/* V17 MINIMALIST ACCORDION */}
                        {isExpanded && (
                            <div className="border-t border-slate-900 bg-slate-950/60 p-6 animate-in slide-in-from-top-1 duration-200">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-5xl mx-auto">

                                    {/* BLOCK 1: WIN PROBABILITY (NEON TUG-OF-WAR) */}
                                    <div className="space-y-4 max-w-sm mx-auto w-full">
                                        <div className="flex items-center gap-2 justify-center md:justify-start">
                                            <Activity size={12} className="text-cyan-400" />
                                            <span className="text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest italic leading-tight">Win Probability Intelligence</span>
                                        </div>
                                        <div className="relative h-4 w-full bg-slate-900/50 rounded-full border border-white/5 overflow-hidden flex items-center">
                                            {typeof match.win_probabilities?.home_win_prob === 'number' && !isNaN(match.win_probabilities.home_win_prob) ? (
                                                <>
                                                    <div
                                                        className="absolute inset-y-0 left-0 bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.6)] flex items-center pl-4 z-10"
                                                        style={{ width: `${Math.max(5, match.win_probabilities.home_win_prob * 100)}%` }}
                                                    >
                                                        <span className="text-xs font-black text-black italic">{(match.win_probabilities.home_win_prob * 100).toFixed(0)}%</span>
                                                    </div>
                                                    <div className="flex-1 flex items-center justify-end pr-4">
                                                        <span className="text-xs font-black text-slate-500 italic">{(match.win_probabilities.away_win_prob * 100).toFixed(0)}%</span>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="flex-1 flex items-center justify-center w-full z-10 bg-slate-800/80">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] font-mono">[ CALCULATING INCIDENCE... ]</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex justify-between px-1">
                                            <span className="text-[10px] md:text-xs font-black text-white italic uppercase tracking-widest">{match.home_team?.short_name} Alpha</span>
                                            <span className="text-[10px] md:text-xs font-black text-slate-600 italic uppercase tracking-widest">{match.away_team?.short_name}</span>
                                        </div>
                                    </div>

                                    {/* BLOCK 2: KEY PLAYERS / PHYSICALS (NAME + STATS ONLY) */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 justify-center md:justify-start">
                                            <Zap size={12} className="text-cyan-400" />
                                            <span className="text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest italic leading-tight">Physical Intelligence</span>
                                        </div>
                                        <div className="flex flex-col md:grid md:grid-cols-2 gap-4">
                                            {/* Home Key Player */}
                                            <div className="border-l-2 border-cyan-500/30 pl-3">
                                                <div className="text-[11px] md:text-xs font-black text-slate-500 uppercase leading-none mb-1">
                                                    #{match.home_key_player?.jersey_number || match.home_key_player?.jersey || '8'} // {match.home_team?.short_name}
                                                </div>
                                                <div className="text-lg md:text-xl font-black text-white italic uppercase leading-tight">
                                                    {match.home_key_player?.player_name || match.home_key_player?.name || `[ GATHERING INTEL ]`}
                                                </div>
                                                <div className="text-[11px] md:text-xs font-bold text-slate-400 uppercase tracking-tighter leading-tight mt-1">
                                                    {match.home_key_player?.height ? `${match.home_key_player.height} / ${match.home_key_player.weight}` : '[ CLASSIFIED PHYSICALS ]'} • {match.home_key_player?.stats || "PENDING METRICS"}
                                                </div>
                                            </div>
                                            {/* Away Key Player */}
                                            <div className="border-l-2 border-slate-800 pl-3">
                                                <div className="text-[11px] md:text-xs font-black text-slate-700 uppercase leading-none mb-1">
                                                    #{match.away_key_player?.jersey_number || match.away_key_player?.jersey || '99'} // {match.away_team?.short_name}
                                                </div>
                                                <div className="text-lg md:text-xl font-black text-slate-400 italic uppercase leading-tight">
                                                    {match.away_key_player?.player_name || match.away_key_player?.name || `[ GATHERING INTEL ]`}
                                                </div>
                                                <div className="text-[11px] md:text-xs font-bold text-slate-600 uppercase tracking-tighter leading-tight mt-1">
                                                    {match.away_key_player?.height ? `${match.away_key_player.height} / ${match.away_key_player.weight}` : '[ CLASSIFIED PHYSICALS ]'} • {match.away_key_player?.stats || "PENDING METRICS"}
                                                </div>
                                            </div>
                                        </div>

                                        <Link href={`/matches/${uniqueId}`} className="flex items-center justify-center gap-2 w-full py-2 md:py-3 bg-slate-900 border border-slate-800 rounded-sm hover:bg-slate-800 transition-all group/btn">
                                            <span className="text-[11px] md:text-xs font-black text-white uppercase tracking-[0.4em] group-hover/btn:tracking-[0.6em] transition-all">ENTER WAR ROOM ⚔️</span>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
