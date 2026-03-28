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
            <div className="w-full flex flex-col items-center justify-center p-20 border border-dashed border-slate-800 rounded-xl bg-slate-900/10">
                <span className="text-slate-600 font-black tracking-[0.5em] uppercase text-[10px] italic">
                    [ NO ACTIVE MATCH INTELLIGENCE SCHEDULED FOR THIS CYCLE ]
                </span>
            </div>
        );
    }

    return (
        <div className="w-full max-w-7xl mx-auto flex flex-col space-y-2">
            {matches.map((match, idx) => {
                const uniqueId = match.match_id || match.id || `match-${idx}`;
                const isExpanded = expandedId === uniqueId;
                const hasUpset = match.tags?.some((t: string) => t.includes("UPSET"));
                const isLocked = match.tags?.some((t: string) => t.includes("LOCKED") || t.includes("LOCK"));

                return (
                    <div key={uniqueId} className="w-full bg-[#020617] border border-slate-900 rounded-lg overflow-hidden transition-all hover:border-cyan-500/40 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.5)]">
                        <div
                            onClick={() => toggleExpand(uniqueId)}
                            className="flex items-center justify-between px-3 py-2 md:px-5 md:py-3 cursor-pointer group select-none relative"
                        >
                            {/* LEFT: TIME/STATUS (Small Monospace) */}
                            <div className="flex flex-col items-start min-w-[50px] md:min-w-[80px] border-r border-slate-900 pr-3">
                                <span className="text-[9px] md:text-sm font-black text-slate-500 uppercase tracking-widest leading-none mb-1 tabular-nums">
                                    {match.time || (match.date ? new Date(match.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : "19:00")}
                                </span>
                                <span className={`text-[7px] md:text-[9px] font-black uppercase tracking-widest ${match.status === 'LIVE' ? 'text-red-500 animate-pulse' : 'text-cyan-400'}`}>
                                    {match.status || 'FINAL'}
                                </span>
                            </div>

                            {/* MIDDLE: STACKED TEAMS (Identity Core) */}
                            <div className="flex-1 px-4 md:px-12">
                                <div className="flex flex-col gap-2 md:gap-3">
                                    {/* Home Team */}
                                    <div className="flex items-center gap-2 md:gap-4 group/team">
                                        <img
                                            src={match.home_logo || `/logos/${match.homeTeamId?.toLowerCase()}_hd.png`}
                                            alt={match.homeTeamName}
                                            className="w-5 h-5 md:w-8 md:h-8 object-contain flex-shrink-0 transition-all group-hover/team:scale-110"
                                            onError={(e) => (e.currentTarget.src = '/logos/default-shield.png')}
                                        />
                                        <div className="flex items-center gap-2">
                                            <span className="text-xl md:text-3xl lg:text-4xl font-black text-white italic uppercase tracking-tighter leading-none transition-all group-hover:text-cyan-400">
                                                {match.homeTeamId}
                                            </span>
                                            <span className="text-[8px] md:text-[10px] font-bold text-slate-700 uppercase hidden sm:inline tracking-widest">
                                                {match.homeTeamName}
                                            </span>
                                        </div>
                                        {match.home_score !== undefined && (
                                            <span className="ml-auto text-xl md:text-3xl font-black text-white italic tabular-nums">{match.home_score}</span>
                                        )}
                                    </div>

                                    {/* Away Team */}
                                    <div className="flex items-center gap-2 md:gap-4 group/team">
                                        <img
                                            src={match.away_logo || `/logos/${match.awayTeamId?.toLowerCase()}_hd.png`}
                                            alt={match.awayTeamName}
                                            className="w-5 h-5 md:w-8 md:h-8 object-contain flex-shrink-0 transition-all group-hover/team:scale-110"
                                            onError={(e) => (e.currentTarget.src = '/logos/default-shield.png')}
                                        />
                                        <div className="flex items-center gap-2">
                                            <span className="text-xl md:text-3xl lg:text-4xl font-black text-white italic uppercase tracking-tighter leading-none transition-all group-hover:text-cyan-400">
                                                {match.awayTeamId}
                                            </span>
                                            <span className="text-[8px] md:text-[10px] font-bold text-slate-700 uppercase hidden sm:inline tracking-widest">
                                                {match.awayTeamName}
                                            </span>
                                        </div>
                                        {match.away_score !== undefined && (
                                            <span className="ml-auto text-xl md:text-3xl font-black text-white italic tabular-nums">{match.away_score}</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT: AI SIGNAL LABELS (Extreme Density) */}
                            <div className="flex flex-col items-end gap-2 pr-1">
                                {hasUpset ? (
                                    <div className="px-2 md:px-3 py-1 bg-cyan-950/20 border border-cyan-500/50 rounded shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                                        <span className="text-[7px] md:text-[10px] font-black text-cyan-400 tracking-[0.2em] uppercase italic whitespace-nowrap">UPSET ALERT 🔥</span>
                                    </div>
                                ) : isLocked ? (
                                    <div className="px-2 md:px-3 py-1 bg-cyan-900/30 border border-cyan-400/60 rounded shadow-[0_0_10px_rgba(34,211,238,0.1)]">
                                        <span className="text-[7px] md:text-[10px] font-black text-cyan-300 tracking-[0.2em] uppercase italic whitespace-nowrap">LOCKED 🔒</span>
                                    </div>
                                ) : (
                                    <div className="px-2 py-1 border border-slate-900 rounded opacity-40">
                                        <span className="text-[7px] md:text-[9px] font-bold text-slate-600 uppercase tracking-tighter">SIG PENDING</span>
                                    </div>
                                )}
                                <div className="opacity-30 group-hover:opacity-100 transition-opacity">
                                    <ChevronDown size={14} className={`text-cyan-500 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                                </div>
                            </div>
                        </div>

                        {/* ACCORDION GLIDE (Progressive Disclosure) */}
                        {isExpanded && (
                            <div className="border-t border-slate-900 bg-slate-950/40 p-5 md:p-8 animate-in slide-in-from-top-2 duration-300 ease-out backdrop-blur-md">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-12">
                                    {/* TUG-OF-WAR BAR */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2">
                                            <Zap size={14} className="text-cyan-400 fill-cyan-400/20" />
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Alpha Confidence</span>
                                        </div>
                                        <div className="relative h-1.5 w-full bg-slate-900/30 rounded-full overflow-hidden border border-white/5">
                                            <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-600 to-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)]" style={{ width: `${(match.confidence || 0.5) * 100}%` }} />
                                        </div>
                                        <div className="flex justify-between text-xl md:text-2xl font-black italic">
                                            <span className="text-white">{(match.confidence * 100).toFixed(0)}% <span className="text-[9px] text-slate-700 not-italic uppercase ml-1">{match.homeTeamId}</span></span>
                                            <span className="text-slate-800">{(100 - match.confidence * 100).toFixed(0)}% <span className="text-[9px] text-slate-900 not-italic uppercase ml-1">{match.awayTeamId}</span></span>
                                        </div>
                                    </div>

                                    {/* INSTITUTIONAL EV */}
                                    <div className="space-y-4 border-x border-slate-900/40 px-0 md:px-8">
                                        <div className="flex items-center gap-2">
                                            <Activity size={14} className="text-emerald-400" />
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Converged EV</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-3xl md:text-4xl font-black text-emerald-400 italic leading-none">
                                                +{(match.ev * 100 || 8.4).toFixed(2)}%
                                            </span>
                                            <span className="text-[9px] font-bold text-slate-700 uppercase tracking-widest mt-2 italic">Institutional Alpha Active</span>
                                        </div>
                                    </div>

                                    {/* CTA & TAGS */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2">
                                            <TrendingUp size={14} className="text-cyan-400" />
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Signal Metadata</span>
                                        </div>
                                        <div className="flex flex-wrap gap-2 mb-4">
                                            {(match.tags || []).slice(0, 2).map((tag: string) => (
                                                <span key={tag} className="text-[8px] font-black text-cyan-400/60 border border-cyan-500/10 px-2 py-0.5 rounded-sm bg-cyan-950/5 uppercase tracking-tighter">
                                                    #{tag}
                                                </span>
                                            ))}
                                        </div>
                                        <Link href={`/matches/${uniqueId}`} className="block w-full text-center py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-[9px] font-black text-white uppercase tracking-[0.3em] transition-all hover:tracking-[0.4em]">
                                            WAR ROOM
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
