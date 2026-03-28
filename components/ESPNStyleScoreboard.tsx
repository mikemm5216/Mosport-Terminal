"use client";

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Zap, Activity, TrendingUp } from 'lucide-react';

export default function ESPNStyleScoreboard({ matches }: { matches: any[] }) {
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const toggleExpand = (id: string) => {
        setExpandedId(prev => (prev === id ? null : id));
    };

    return (
        <div className="w-full max-w-7xl mx-auto flex flex-col space-y-3">
            {matches.map((match, idx) => {
                const isExpanded = expandedId === match.match_id;
                const hasUpset = match.tags?.some((t: string) => t.includes("UPSET"));
                const isLocked = match.tags?.some((t: string) => t.includes("LOCKED") || t.includes("LOCK"));

                return (
                    <div key={match.match_id || idx} className="w-full bg-[#020617] border border-slate-900 rounded-lg overflow-hidden shadow-[0_10px_30px_-15px_rgba(0,0,0,0.5)] transition-all hover:border-cyan-500/40">
                        <div
                            onClick={() => toggleExpand(match.match_id)}
                            className="flex items-center justify-between p-3 md:p-5 cursor-pointer group select-none"
                        >
                            {/* 左側：Time/Status (ESPN Monospace Style) */}
                            <div className="flex flex-col items-start min-w-[65px] md:min-w-[100px] border-r border-slate-800 pr-4">
                                <span className="text-[10px] md:text-sm font-black text-slate-500 uppercase tracking-widest leading-none mb-1 tabular-nums">
                                    {match.time || (match.match_date ? new Date(match.match_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : "19:00")}
                                </span>
                                <span className={`text-[8px] md:text-[10px] font-bold uppercase tracking-tighter ${match.status === 'LIVE' ? 'text-red-500 animate-pulse' : 'text-cyan-400'}`}>
                                    {match.status || 'PRE'}
                                </span>
                            </div>

                            {/* 中間：Stacked Teams (Identity Core) */}
                            <div className="flex-1 px-4 md:px-10">
                                <div className="flex flex-col gap-3 md:gap-5">
                                    {/* Home Team */}
                                    <div className="flex items-center gap-3 md:gap-6">
                                        <img
                                            src={match.home_logo || `/logos/${match.home_short_name?.toLowerCase()}.png`}
                                            alt={match.home_team_name}
                                            className="w-5 h-5 md:w-9 md:h-9 object-contain flex-shrink-0 grayscale brightness-200 contrast-125"
                                        />
                                        <div className="flex items-baseline gap-3">
                                            <span className="text-xl md:text-3xl lg:text-4xl font-black text-white italic uppercase tracking-tighter leading-none">
                                                {match.home_short_name || match.home_team_name}
                                            </span>
                                            <span className="text-[9px] md:text-[11px] font-bold text-slate-600 uppercase hidden sm:inline tracking-wide">
                                                {match.home_team_name}
                                            </span>
                                        </div>
                                        {match.home_score !== undefined && (
                                            <span className="ml-auto text-xl md:text-4xl font-black text-white italic tabular-nums">{match.home_score}</span>
                                        )}
                                    </div>
                                    {/* Away Team */}
                                    <div className="flex items-center gap-3 md:gap-6">
                                        <img
                                            src={match.away_logo || `/logos/${match.away_short_name?.toLowerCase()}.png`}
                                            alt={match.away_team_name}
                                            className="w-5 h-5 md:w-9 md:h-9 object-contain flex-shrink-0 grayscale brightness-200 contrast-125"
                                        />
                                        <div className="flex items-baseline gap-3">
                                            <span className="text-xl md:text-3xl lg:text-4xl font-black text-white italic uppercase tracking-tighter leading-none">
                                                {match.away_short_name || match.away_team_name}
                                            </span>
                                            <span className="text-[9px] md:text-[11px] font-bold text-slate-600 uppercase hidden sm:inline tracking-wide">
                                                {match.away_team_name}
                                            </span>
                                        </div>
                                        {match.away_score !== undefined && (
                                            <span className="ml-auto text-xl md:text-4xl font-black text-white italic tabular-nums">{match.away_score}</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* 右側：Extreme Density Decision Matrix */}
                            <div className="flex flex-col items-end gap-3 pr-2">
                                {hasUpset ? (
                                    <div className="px-2 md:px-4 py-1 md:py-1.5 bg-cyan-950/20 border border-cyan-500/50 rounded shadow-[0_0_15px_rgba(6,182,212,0.3)] group-hover:shadow-[0_0_20px_rgba(6,182,212,0.5)] transition-all">
                                        <span className="text-[8px] md:text-[11px] font-black text-cyan-400 tracking-[0.1em] md:tracking-[0.2em] uppercase italic whitespace-nowrap">UPSET ALERT 🔥</span>
                                    </div>
                                ) : isLocked ? (
                                    <div className="px-2 md:px-4 py-1 md:py-1.5 bg-cyan-900/30 border border-cyan-400/60 rounded shadow-[0_0_10px_rgba(34,211,238,0.2)]">
                                        <span className="text-[8px] md:text-[11px] font-black text-cyan-300 tracking-[0.1em] md:tracking-[0.2em] uppercase italic whitespace-nowrap">LOCKED 🔒</span>
                                    </div>
                                ) : (
                                    <div className="px-3 py-1 border border-slate-800 rounded opacity-60">
                                        <span className="text-[8px] md:text-[10px] font-bold text-slate-500 uppercase tracking-tighter">SIG PENDING</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-4 opacity-40 group-hover:opacity-100 transition-opacity">
                                    <ChevronDown size={16} className={`text-cyan-500 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                                </div>
                            </div>
                        </div>

                        {/* PROGRESSIVE DISCLOSURE (Accordion Glide) */}
                        {isExpanded && (
                            <div className="border-t border-slate-900 bg-black/60 p-6 md:p-10 animate-in slide-in-from-top-4 duration-500 ease-out backdrop-blur-sm">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-16">
                                    {/* Model Probabilities */}
                                    <div className="space-y-5">
                                        <div className="flex items-center gap-3">
                                            <Zap size={16} className="text-cyan-400 fill-cyan-400/20" />
                                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Alpha Probability</span>
                                        </div>
                                        <div className="relative h-2 w-full bg-slate-900/50 rounded-full overflow-hidden border border-slate-800">
                                            <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-600 to-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.5)]" style={{ width: `${(match.confidence || 0.5) * 100}%` }} />
                                        </div>
                                        <div className="flex justify-between text-lg md:text-2xl font-black italic tracking-tighter">
                                            <span className="text-white">{(match.confidence * 100).toFixed(0)}% <span className="text-[10px] text-slate-600 not-italic uppercase ml-1">LAL</span></span>
                                            <span className="text-slate-700">{((1 - match.confidence) * 100).toFixed(0)}% <span className="text-[10px] text-slate-800 not-italic uppercase ml-1">GSW</span></span>
                                        </div>
                                    </div>

                                    {/* Expected Edge */}
                                    <div className="space-y-5 border-x border-slate-900/50 px-0 md:px-8">
                                        <div className="flex items-center gap-3">
                                            <Activity size={16} className="text-emerald-400" />
                                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Institutional EV</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-4xl md:text-5xl font-black text-emerald-400 italic leading-none drop-shadow-[0_0_10px_rgba(52,211,153,0.3)]">
                                                +{(match.ev * 100 || 8.4).toFixed(2)}%
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.1em] mt-2">Converged over 10,000 simulations</span>
                                        </div>
                                    </div>

                                    {/* CLV & Tags */}
                                    <div className="space-y-5">
                                        <div className="flex items-center gap-3">
                                            <TrendingUp size={16} className="text-cyan-400" />
                                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Risk Variance</span>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {(match.tags || []).map((tag: string) => (
                                                <span key={tag} className="text-[9px] font-black text-cyan-400/80 border border-cyan-500/20 px-3 py-1 rounded-sm bg-cyan-950/10 uppercase tracking-widest italic">
                                                    #{tag}
                                                </span>
                                            ))}
                                            <span className="text-[9px] font-black text-slate-500 border border-slate-800 px-3 py-1 rounded-sm bg-slate-900/30 uppercase tracking-widest">
                                                CLV: +{(match.clv * 100 || 0).toFixed(1)}%
                                            </span>
                                        </div>
                                        <Link href={`/matches/${match.match_id}`} className="inline-flex items-center gap-2 mt-2 px-5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-[10px] font-black text-white uppercase tracking-widest transition-colors group/link">
                                            ENTER WAR ROOM <Zap size={10} className="text-cyan-400 group-hover/link:animate-pulse" />
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
