"use client";

import Link from 'next/link';
import LogoFallback from './LogoFallback';

export default function ESPNStyleScoreboard({ matches }: { matches: any[] }) {
    return (
        <div className="w-full max-w-7xl mx-auto">

            {/* Header Section */}
            <div className="mb-8 border-b-2 border-amber-500/40 pb-6">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    <h2 className="text-[11px] font-black text-amber-500 uppercase tracking-[0.3em]">Global Scoreboard</h2>
                </div>
                <p className="text-slate-500 text-xs font-mono tracking-widest uppercase">Premium Match Feed</p>
            </div>

            {/* Matches Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {matches.map((match, idx) => (
                    <Link
                        key={match.match_id || idx}
                        href={`/matches/${match.match_id}`}
                        className="group relative overflow-hidden"
                    >
                        {/* Card Background with gradient on hover */}
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 to-slate-950 border border-slate-800/60 rounded-xl group-hover:from-slate-800/80 group-hover:to-slate-900 group-hover:border-amber-500/40 transition-all duration-300" />
                        
                        {/* Animated background glow on hover */}
                        <div className="absolute -inset-full top-0 left-0 h-96 w-96 bg-gradient-to-br from-amber-500/5 to-transparent rounded-full blur-3xl group-hover:from-amber-500/10 transition-all duration-500 pointer-events-none" />

                        <div className="relative p-6 flex items-center justify-between gap-6">

                            {/* Left: Teams Section */}
                            <div className="flex-1 flex items-center gap-4">
                                <div className="flex flex-col gap-3">
                                    {/* Home Team */}
                                    <div className="flex items-center gap-4">
                                        <div className="flex-shrink-0 w-12 h-12 bg-slate-950/80 rounded-lg border border-slate-700/50 group-hover:border-amber-500/50 p-2 flex items-center justify-center group-hover:shadow-[0_0_20px_rgba(251,146,60,0.2)] transition-all">
                                            <LogoFallback
                                                url={match.home_logo_url || match.home_logo}
                                                name={match.home_team_name}
                                                shortName={match.home_short_name}
                                                sport={match.sport}
                                                size={32}
                                            />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-white font-black text-sm md:text-base tracking-tight italic uppercase leading-tight">
                                                {match.home_team_name}
                                            </span>
                                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{match.home_short_name || 'HOME'}</span>
                                        </div>
                                    </div>

                                    {/* Away Team */}
                                    <div className="flex items-center gap-4">
                                        <div className="flex-shrink-0 w-12 h-12 bg-slate-950/80 rounded-lg border border-slate-700/50 group-hover:border-amber-500/50 p-2 flex items-center justify-center group-hover:shadow-[0_0_20px_rgba(251,146,60,0.2)] transition-all">
                                            <LogoFallback
                                                url={match.away_logo_url || match.away_logo}
                                                name={match.away_team_name}
                                                shortName={match.away_short_name}
                                                sport={match.sport}
                                                size={32}
                                            />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-white font-black text-sm md:text-base tracking-tight italic uppercase leading-tight">
                                                {match.away_team_name}
                                            </span>
                                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{match.away_short_name || 'AWAY'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Center: Scores */}
                            <div className="flex flex-col items-center gap-3 border-l border-r border-slate-700/50 px-6 py-2">
                                <div className="text-center">
                                    {match.home_score !== undefined ? (
                                        <div className="text-4xl font-black text-white tracking-tighter">{match.home_score}</div>
                                    ) : (
                                        <div className="text-2xl text-amber-500 font-black">-</div>
                                    )}
                                </div>
                                <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">vs</span>
                                <div className="text-center">
                                    {match.away_score !== undefined ? (
                                        <div className="text-4xl font-black text-white tracking-tighter">{match.away_score}</div>
                                    ) : (
                                        <div className="text-2xl text-amber-500 font-black">-</div>
                                    )}
                                </div>
                            </div>

                            {/* Right: Match Info & Status */}
                            <div className="flex flex-col items-end justify-center gap-3 text-right min-w-fit">
                                <div className="flex flex-col items-end">
                                    <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">
                                        {match.time || "19:00"}
                                    </span>
                                    <span className="text-[8px] text-slate-600 font-bold uppercase tracking-widest mt-0.5">
                                        {match.status || "SCHEDULED"}
                                    </span>
                                </div>

                                {/* Tag Pills */}
                                <div className="flex flex-col gap-1">
                                    {match.tags?.includes("UPSET ALERT") && (
                                        <span className="text-[7px] font-black text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-400/40 uppercase tracking-wider italic whitespace-nowrap">
                                            🔥 UPSET ALERT
                                        </span>
                                    )}
                                    {match.tags?.includes("SYSTEM LOCK") && (
                                        <span className="text-[7px] font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-400/40 uppercase tracking-wider italic whitespace-nowrap">
                                            🔒 SYSTEM LOCK
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
