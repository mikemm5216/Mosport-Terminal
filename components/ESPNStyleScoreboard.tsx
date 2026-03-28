"use client";

import Link from 'next/link';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export default function ESPNStyleScoreboard({ matches }: { matches: any[] }) {
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const toggleExpand = (id: string) => {
        setExpandedId(prev => (prev === id ? null : id));
    };

    return (
        <div className="w-full max-w-7xl mx-auto">
            {/* Header Section */}
            <div className="mb-6 border-b-2 border-blue-500/40 pb-4">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    <h2 className="text-[11px] font-black text-blue-500 uppercase tracking-[0.3em]">Global Scoreboard</h2>
                </div>
                <p className="text-slate-500 text-xs font-mono tracking-widest uppercase">Premium Match Feed</p>
            </div>

            {/* Horizontal Match Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
                {matches.map((match, idx) => {
                    const matchId = match.match_id || idx.toString();
                    const isExpanded = expandedId === matchId;

                    return (
                        <div
                            key={matchId}
                            className="group cursor-pointer"
                        >
                            {/* Match Card Item - ESPN Card Style */}
                            <button
                                onClick={() => toggleExpand(matchId)}
                                className="w-full relative overflow-hidden rounded-lg"
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-slate-900/60 to-slate-950 border border-slate-800/60 rounded-lg group-hover:from-slate-800/70 group-hover:to-slate-900/70 group-hover:border-blue-500/40 transition-all duration-300" />
                                <div className="absolute -inset-full top-0 left-0 h-64 w-64 bg-gradient-to-br from-blue-500/5 to-transparent rounded-full blur-3xl group-hover:from-blue-500/10 transition-all duration-500 pointer-events-none" />

                                <div className="relative px-3 py-4 flex flex-col gap-3">
                                    {/* Top: Time & Status */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-col text-[9px] font-mono text-slate-400 tracking-wider">
                                            <span className="font-black text-blue-400">{match.time || "19:00"}</span>
                                            <span className="text-[7px] text-slate-600">{match.status || "SCHEDULED"}</span>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            {match.tags?.includes("UPSET ALERT") && (
                                                <span className="text-[7px] font-black text-blue-300 bg-blue-500/20 px-2 py-0.5 rounded border border-blue-400/50 uppercase tracking-wider italic whitespace-nowrap">
                                                    UPSET 🔥
                                                </span>
                                            )}
                                            {match.tags?.includes("SYSTEM LOCK") && (
                                                <span className="text-[7px] font-black text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-400/50 uppercase tracking-wider italic whitespace-nowrap">
                                                    LOCKED 🔒
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Middle: Stacked Teams */}
                                    <div className="flex flex-col gap-2">
                                        {/* Home Team */}
                                        <div className="flex items-center gap-3">
                                            <img
                                                src={`/logos/${match.home_short_name?.toLowerCase() || 'default'}.png`}
                                                alt={match.home_team_name}
                                                className="w-5 h-5 object-contain opacity-80 group-hover:opacity-100 transition-opacity"
                                                onError={(e) => {
                                                    e.currentTarget.style.display = 'none';
                                                }}
                                            />
                                            <span className="text-xl md:text-2xl font-black text-white italic uppercase tracking-tight">
                                                {match.home_short_name || 'HOME'}
                                            </span>
                                            {match.home_score !== undefined && (
                                                <span className="text-lg md:text-xl font-black text-blue-300 ml-auto">
                                                    {match.home_score}
                                                </span>
                                            )}
                                        </div>

                                        {/* Away Team */}
                                        <div className="flex items-center gap-3">
                                            <img
                                                src={`/logos/${match.away_short_name?.toLowerCase() || 'default'}.png`}
                                                alt={match.away_team_name}
                                                className="w-5 h-5 object-contain opacity-80 group-hover:opacity-100 transition-opacity"
                                                onError={(e) => {
                                                    e.currentTarget.style.display = 'none';
                                                }}
                                            />
                                            <span className="text-xl md:text-2xl font-black text-white italic uppercase tracking-tight">
                                                {match.away_short_name || 'AWAY'}
                                            </span>
                                            {match.away_score !== undefined && (
                                                <span className="text-lg md:text-xl font-black text-blue-300 ml-auto">
                                                    {match.away_score}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Bottom: Expand Toggle */}
                                    <div className="flex items-center justify-center pt-1">
                                        <ChevronDown
                                            size={16}
                                            className={`text-slate-500 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                                        />
                                    </div>
                                </div>
                            </button>

                            {/* Expandable AI Details Panel */}
                            {isExpanded && (
                                <div className="relative overflow-hidden mt-1">
                                    <div className="absolute inset-0 bg-gradient-to-br from-slate-950/80 to-slate-900/80 border border-slate-800/40 rounded-lg" />
                                    <div className="relative px-4 py-4 border-t border-slate-800/50">
                                        {/* Tug-of-war Dominance Bar */}
                                        <div className="mb-4">
                                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Match Energy Index</div>
                                            <div className="w-full h-2 bg-slate-950 rounded-full border border-slate-800 overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-1000"
                                                    style={{
                                                        width: `${match.home_dominance || 50}%`
                                                    }}
                                                />
                                            </div>
                                            <div className="flex justify-between text-[8px] text-slate-500 mt-1 font-mono">
                                                <span>{match.home_dominance || 50}%</span>
                                                <span>{100 - (match.home_dominance || 50)}%</span>
                                            </div>
                                        </div>

                                        {/* V11.5 Metrics */}
                                        <div className="grid grid-cols-3 gap-3">
                                            <div className="bg-slate-900/50 rounded p-2 border border-slate-800/50">
                                                <div className="text-[7px] text-slate-500 uppercase tracking-widest font-black mb-1">Model Prob</div>
                                                <div className="text-sm font-black text-blue-300">{(match.modelProbs || 0.52).toFixed(2)}</div>
                                            </div>
                                            <div className="bg-slate-900/50 rounded p-2 border border-slate-800/50">
                                                <div className="text-[7px] text-slate-500 uppercase tracking-widest font-black mb-1">Edge</div>
                                                <div className="text-sm font-black text-emerald-300">{(match.edge || 0.05).toFixed(3)}</div>
                                            </div>
                                            <div className="bg-slate-900/50 rounded p-2 border border-slate-800/50">
                                                <div className="text-[7px] text-slate-500 uppercase tracking-widest font-black mb-1">EV</div>
                                                <div className="text-sm font-black text-cyan-300">{(match.ev || 0.15).toFixed(2)}</div>
                                            </div>
                                        </div>

                                        {/* Signal Description */}
                                        {match.signal_description && (
                                            <div className="mt-3 p-2 bg-slate-900/50 rounded border border-slate-800/50">
                                                <div className="text-[8px] text-slate-400 font-mono leading-relaxed">
                                                    {match.signal_description}
                                                </div>
                                            </div>
                                        )}

                                        {/* View Full Match Link */}
                                        <Link
                                            href={`/matches/${matchId}`}
                                            className="block mt-3 text-center text-[9px] font-black text-blue-400 hover:text-blue-300 uppercase tracking-widest py-2 rounded border border-blue-500/30 hover:border-blue-500/60 transition-all"
                                        >
                                            View Full Match Details →
                                        </Link>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
