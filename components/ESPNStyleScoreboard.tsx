"use client";

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Zap, Activity, TrendingUp } from 'lucide-react';

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
                    <div key={uniqueId} className="w-full bg-[#020617] border border-slate-900 rounded-md overflow-hidden transition-all hover:border-cyan-500/40 shadow-lg">
                        <div
                            onClick={() => toggleExpand(uniqueId)}
                            className="flex items-center justify-between px-3 py-2 md:px-4 md:py-2.5 cursor-pointer group select-none relative"
                        >
                            {/* LEFT: TIME/STATUS */}
                            <div className="flex flex-col items-start min-w-[45px] md:min-w-[70px] border-r border-slate-900 pr-3">
                                <span className="text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-tighter tabular-nums mb-0.5">
                                    {match.time || (match.start_time ? new Date(match.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : "19:00")}
                                </span>
                                <span className={`text-[8px] md:text-[9px] font-black uppercase tracking-widest ${match.status === 'live' ? 'text-red-500 animate-pulse' : 'text-cyan-400'}`}>
                                    {match.status?.toUpperCase() || 'FINAL'}
                                </span>
                            </div>

                            {/* MIDDLE: STACKED TEAMS */}
                            <div className="flex-1 px-4 md:px-10">
                                <div className="flex flex-col gap-1.5 md:gap-2">
                                    {/* Home Team */}
                                    <div className="flex items-center gap-3 md:gap-4 group/team">
                                        <img
                                            src={match.home_team?.logo_url || `/logos/${match.home_team?.short_name?.toLowerCase()}_hd.png`}
                                            alt={match.home_team?.short_name}
                                            className="w-5 h-5 md:w-7 md:h-7 object-contain flex-shrink-0 transition-transform group-hover/team:scale-110"
                                        />
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg md:text-2xl lg:text-3xl font-black text-white italic uppercase tracking-tighter leading-none transition-colors group-hover:text-cyan-400">
                                                {match.home_team?.short_name}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Away Team */}
                                    <div className="flex items-center gap-3 md:gap-4 group/team">
                                        <img
                                            src={match.away_team?.logo_url || `/logos/${match.away_team?.short_name?.toLowerCase()}_hd.png`}
                                            alt={match.away_team?.short_name}
                                            className="w-5 h-5 md:w-7 md:h-7 object-contain flex-shrink-0 transition-transform group-hover/team:scale-110"
                                        />
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg md:text-2xl lg:text-3xl font-black text-white italic uppercase tracking-tighter leading-none transition-colors group-hover:text-cyan-400">
                                                {match.away_team?.short_name}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT: AI SIGNAL */}
                            <div className="flex flex-col items-end gap-1.5 pr-1">
                                {hasUpset ? (
                                    <div className="px-1.5 md:px-2 py-0.5 bg-cyan-950/20 border border-cyan-500/50 rounded shadow-[0_0_10px_rgba(6,182,212,0.2)]">
                                        <span className="text-[7px] md:text-[9px] font-black text-cyan-400 tracking-widest uppercase italic">UPSET ALERT 🔥</span>
                                    </div>
                                ) : (
                                    <div className="px-1.5 py-0.5 border border-slate-900 rounded opacity-30">
                                        <span className="text-[7px] md:text-[8px] font-bold text-slate-600 uppercase tracking-tighter italic">QUANT ALPHA</span>
                                    </div>
                                )}
                                <ChevronDown size={14} className={`text-cyan-500 transition-transform duration-300 opacity-20 group-hover:opacity-100 ${isExpanded ? 'rotate-180' : ''}`} />
                            </div>
                        </div>

                        {/* ACCORDION (Progressive Disclosure) */}
                        {isExpanded && (
                            <div className="border-t border-slate-900 bg-slate-950/40 p-4 md:p-6 animate-in slide-in-from-top-1 duration-200 backdrop-blur-md">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {/* ALPHA PROBABILITIES */}
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <Activity size={12} className="text-cyan-400" />
                                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Win Probability</span>
                                        </div>
                                        <div className="flex items-center justify-between text-lg md:text-xl font-black italic">
                                            <span className="text-white">{(match.win_probabilities?.home_win_prob * 100).toFixed(0)}% <span className="text-[8px] text-slate-600 not-italic ml-1 uppercase">{match.home_team?.short_name}</span></span>
                                            <span className="text-slate-500">{(match.win_probabilities?.away_win_prob * 100).toFixed(0)}% <span className="text-[8px] text-slate-600 not-italic ml-1 uppercase">{match.away_team?.short_name}</span></span>
                                        </div>
                                        <div className="relative h-1 w-full bg-slate-900 rounded-full overflow-hidden">
                                            <div className="absolute inset-y-0 left-0 bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]" style={{ width: `${(match.win_probabilities?.home_win_prob || 0.5) * 100}%` }} />
                                        </div>
                                    </div>

                                    {/* WAR ROOM GRID PREVIEW */}
                                    <div className="space-y-2 border-x border-slate-900/50 px-0 md:px-6">
                                        <div className="flex items-center gap-2">
                                            <Zap size={12} className="text-cyan-400 fill-cyan-400/20" />
                                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Tactical Matchup</span>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            {(match.tactical_matchup || ["ANALYZING INTELLIGENCE SCALE..."]).slice(0, 3).map((node: string, i: number) => (
                                                <span key={i} className="text-[9px] font-bold text-slate-400 italic leading-tight border-l-2 border-cyan-500/30 pl-2">
                                                    {node}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* MOMENTUM & LINK */}
                                    <div className="space-y-3 flex flex-col justify-between">
                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <TrendingUp size={12} className="text-emerald-400" />
                                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Momentum Index</span>
                                            </div>
                                            <span className="text-2xl md:text-3xl font-black text-emerald-400 italic">
                                                {(match.momentum_index * 100 || 74).toFixed(0)}
                                            </span>
                                        </div>
                                        <Link href={`/matches/${uniqueId}`} className="block w-full text-center py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-sm text-[8px] font-black text-white uppercase tracking-[0.4em] transition-all hover:tracking-[0.5em] mt-2">
                                            ENTER WAR ROOM
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
