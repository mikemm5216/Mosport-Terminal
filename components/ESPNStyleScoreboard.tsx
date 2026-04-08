"use client";

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Activity, Zap, Shield } from 'lucide-react';
import EntityLogo from '@/src/components/EntityLogo';

// ─── League Color Palette ──────────────────────────────────────────────────────
// Design principle: slate-950 background stays sacred.
// Colors appear ONLY as left-border accent + faint background glow + badge.
const LEAGUE_THEME: Record<string, {
    border: string;         // left-border on row
    glow: string;           // very faint bg on hover accordion
    badge: string;          // text color of league badge
    badgeBg: string;        // badge background
    barColor: string;       // win-prob bar fill
    barShadow: string;      // bar glow
}> = {
    NBA: {
        border: "border-l-cyan-500",
        glow: "bg-cyan-950/10",
        badge: "text-cyan-400",
        badgeBg: "bg-cyan-950/30 border-cyan-500/30",
        barColor: "bg-cyan-500",
        barShadow: "shadow-[0_0_12px_rgba(6,182,212,0.5)]",
    },
    MLB: {
        border: "border-l-rose-600",
        glow: "bg-rose-950/10",
        badge: "text-rose-400",
        badgeBg: "bg-rose-950/30 border-rose-600/30",
        barColor: "bg-rose-500",
        barShadow: "shadow-[0_0_12px_rgba(225,29,72,0.5)]",
    },
    EPL: {
        border: "border-l-violet-500",
        glow: "bg-violet-950/10",
        badge: "text-violet-400",
        badgeBg: "bg-violet-950/30 border-violet-500/30",
        barColor: "bg-violet-500",
        barShadow: "shadow-[0_0_12px_rgba(139,92,246,0.5)]",
    },
    UCL: {
        border: "border-l-emerald-400",
        glow: "bg-emerald-950/10",
        badge: "text-emerald-400",
        badgeBg: "bg-emerald-950/30 border-emerald-400/30",
        barColor: "bg-emerald-500",
        barShadow: "shadow-[0_0_12px_rgba(52,211,153,0.5)]",
    },
    DEFAULT: {
        border: "border-l-slate-700",
        glow: "bg-slate-950/10",
        badge: "text-slate-400",
        badgeBg: "bg-slate-800/30 border-slate-700/30",
        barColor: "bg-slate-500",
        barShadow: "",
    },
};

function getTheme(league?: string) {
    if (!league) return LEAGUE_THEME.DEFAULT;
    return LEAGUE_THEME[league.toUpperCase()] ?? LEAGUE_THEME.DEFAULT;
}

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
        <div className="w-full max-w-7xl mx-auto flex flex-col space-y-1.5 px-2 md:px-0 h-[800px] overflow-y-auto pr-2 custom-scrollbar">
            {matches.map((match, idx) => {
                const uniqueId = match.match_id || match.id || `match-${idx}`;
                const isExpanded = expandedId === uniqueId;
                const league = match.league || match.sport;
                const theme = getTheme(league);
                const isLive = match.status === 'IN_PLAY' || match.status === 'live' || match.status === 'LIVE';
                const winProb = match.predictedHomeWinRate ?? -1.0;
                const hasUpset = match.signal_label?.includes("UPSET") || (match.confidence > 0.8 && (winProb !== -1.0 && winProb < 0.4));

                return
                <div
                    key={uniqueId}
                    className={``w-full flex-shrink-0 min-h-[120px] bg - [#020617] border border - slate - 900 border - l - 2 ${ theme.border } rounded - md overflow - hidden transition - all hover: border - cyan - 500 / 20 shadow - lg group`}
                    >
            <div
                onClick={() => toggleExpand(uniqueId)}
                className="flex items-center justify-between px-3 py-3 md:px-6 md:py-4 cursor-pointer select-none relative"
            >
                {/* 1. TIME / STATUS (LEFT) — Phase 3: Live Pulse */}
                <div className="flex flex-col items-start min-w-[60px] md:min-w-[80px]">
                    <span className="text-[10px] md:text-sm font-black text-slate-500 uppercase tracking-tighter tabular-nums leading-none mb-1">
                        {match.time || (match.start_time || match.match_date ? new Date(match.start_time || match.match_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : "TBD")}
                    </span>
                    <span className="flex items-center gap-1">
                        {/* ── Phase 3: Red pulse dot for IN_PLAY ── */}
                        {isLive && (
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_6px_rgba(239,68,68,0.8)]" />
                        )}
                        <span className={`text - [8px] md: text - [10px] font - black uppercase tracking - widest leading - none ${ isLive ? 'text-red-500' : theme.badge } `}>
                            {match.status?.toUpperCase() || 'FINAL'}
                        </span>
                    </span>
                </div>

                {/* 2. TEAMS (HORIZONTAL PIVOT - Patch 17.18 Gap Refinement) */}
                <div className="flex-1 grid grid-cols-[minmax(0,1fr)_24px_70px_24px_minmax(0,1fr)] md:grid-cols-[minmax(0,1fr)_48px_140px_48px_minmax(0,1fr)] gap-3 md:gap-8 items-center px-2 md:px-8">
                    {/* HOME TEAM (RIGHT) - Patch 17.20 Typography Downscale */}
                    <div className="text-right flex items-center justify-end overflow-hidden pr-2 md:pr-4">
                        <span className="text-xl md:text-3xl lg:text-4xl font-black text-white italic uppercase tracking-tighter leading-tight">
                            {match.home_team?.short_name || match.homeTeamName || match.home_team_id}
                        </span>
                    </div>

                    {/* HOME LOGO */}
                    <div className="justify-self-center">
                        <EntityLogo
                            entityHash={match.home_team_hash || match.home_team_id}
                            className="w-16 h-16 md:w-20 md:h-20 drop-shadow-[0_0_8px_rgba(255,255,255,0.15)]"
                        />
                    </div>

                    {/* SCORE / TIME (CENTER) */}
                    <div className="justify-self-center flex flex-col items-center min-w-[70px] md:min-w-[140px]">
                        {match.status === "COMPLETED" || match.status === "post" || match.status?.toLowerCase() === "final" ? (
                            <div className="text-xl md:text-4xl font-black text-white font-mono tracking-tighter tabular-nums flex items-center">
                                {match.home_score ?? 0}<span className="text-slate-700 mx-1 md:mx-2">-</span>{match.away_score ?? 0}
                            </div>
                        ) : match.status === "IN_PLAY" || isLive ? (
                            <div className="flex flex-col items-center">
                                <div className="text-xl md:text-4xl font-black text-red-500 font-mono tracking-tighter tabular-nums flex items-center">
                                    {match.home_score ?? 0}<span className="text-slate-700 mx-1 md:mx-2">-</span>{match.away_score ?? 0}
                                </div>
                                <span className="text-[8px] md:text-[10px] text-red-500 font-black animate-pulse tracking-[0.3em] mt-1">LIVE</span>
                            </div>
                        ) : (
                            <div className="text-sm md:text-2xl font-black text-slate-400 font-mono tracking-tight tabular-nums bg-slate-900/50 px-2 md:px-4 py-1 rounded">
                                {match.time || (match.start_time || match.match_date ? new Date(match.start_time || match.match_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : "TBD")}
                            </div>
                        )}
                    </div>

                    {/* AWAY LOGO */}
                    <div className="justify-self-center">
                        <EntityLogo
                            entityHash={match.away_team_hash || match.away_team_id}
                            className="w-16 h-16 md:w-20 md:h-20 drop-shadow-[0_0_8px_rgba(255,255,255,0.15)]"
                        />
                    </div>

                    {/* AWAY TEAM (LEFT) */}
                    <div className="text-left flex items-center justify-start overflow-hidden pl-2 md:pl-4">
                        <span className="text-xl md:text-3xl lg:text-4xl font-black text-white italic uppercase tracking-tighter leading-tight">
                            {match.away_team?.short_name || match.awayTeamName || match.away_team_id}
                        </span>
                    </div>
                </div>

                {/* 3. RIGHT: League badge + alerts */}
                <div className="flex flex-col items-end gap-1.5 min-w-[60px] md:min-w-[100px]">
                    {/* Phase 2: League badge with theme color */}
                    {league && (
                        <span className={`px - 1.5 py - 0.5 border rounded text - [7px] md: text - [9px] font - black tracking - widest uppercase ${ theme.badge } ${ theme.badgeBg } `}>
                            {league}
                        </span>
                    )}
                    {hasUpset ? (
                        <div className="px-1.5 md:px-2 py-0.5 bg-cyan-950/20 border border-cyan-500/50 rounded flex items-center gap-1">
                            <div className="w-1 h-1 rounded-full bg-cyan-400 animate-ping" />
                            <span className="text-[7px] md:text-[10px] font-black text-cyan-400 tracking-widest uppercase italic whitespace-nowrap">UPSET</span>
                        </div>
                    ) : (
                        <ChevronDown size={14} className={`transition - transform duration - 300 opacity - 20 group - hover:opacity-100 ${theme.badge} ${isExpanded ? 'rotate-180' : ''}`} />
                    )}
        </div>
            </div >

        {/* ACCORDION (Patch 17.16 - CTO Refactoring) */ }
    {
        isExpanded && (
            <div className={`border-t border-slate-900 ${theme.glow} p-6 animate-in slide-in-from-top-1 duration-200`}>
                {match.status === "COMPLETED" || match.status === "post" || match.status?.toLowerCase() === "final" ? (
                    <div className="text-center py-10 flex flex-col items-center justify-center space-y-4">
                        <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                            <Shield size={20} className="text-emerald-500" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-emerald-400 font-black tracking-[0.4em] text-xs md:text-sm uppercase italic">MATCH CONCLUDED</span>
                            <span className="text-slate-500 text-[9px] md:text-[11px] mt-2 font-mono uppercase tracking-widest">
                                FINAL SCORE LOCKED // AI PREDICTION ACCURACY TABULATED
                            </span>
                        </div>
                        <Link href={`/match/${uniqueId}`} className="mt-4 px-6 py-2 bg-slate-900 border border-slate-800 rounded-sm hover:bg-slate-800 transition-all">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">VIEW SETTLEMENT DETAILS</span>
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-5xl mx-auto">
                        {/* BLOCK 1: WIN PROBABILITY */}
                        <div className="space-y-4 max-w-sm mx-auto w-full">
                            <div className="flex items-center gap-2 justify-center md:justify-start">
                                <Activity size={12} className={theme.badge} />
                                <span className="text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest italic leading-tight">Win Probability Intelligence</span>
                            </div>

                            {winProb === -1.0 ? (
                                <div className="flex flex-col items-center justify-center py-6 bg-red-950/20 border border-red-500/20 rounded">
                                    <span className="text-red-500 font-mono font-black animate-pulse tracking-widest text-[10px] md:text-xs mb-1">
                                        [ MODEL OFFLINE ]
                                    </span>
                                    <span className="text-red-900 text-[7px] md:text-[8px] font-black uppercase tracking-widest text-center px-4">
                                        NEURAL LINK TERMINATED // NO DETERMINISTIC ALPHA
                                    </span>
                                </div>
                            ) : typeof winProb === 'number' && !isNaN(winProb) ? (
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center px-1">
                                        <span className={`text-[10px] md:text-xs font-black italic uppercase tracking-widest ${theme.badge}`}>{match.home_team?.short_name || match.homeTeamName} Alpha</span>
                                        <span className="text-cyan-400 font-mono text-xs md:text-sm font-black">{(winProb * 100).toFixed(0)}%</span>
                                    </div>
                                    <div className="h-4 md:h-6 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800 shadow-inner flex">
                                        <div
                                            className={`h-full ${theme.barColor} rounded-l-full transition-all duration-1000`}
                                            style={{ width: `${winProb * 100}%` }}
                                        />
                                        <div
                                            className="h-full bg-slate-800 transition-all duration-1000"
                                            style={{ width: `${(1 - winProb) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-10 bg-slate-900/50 rounded animate-pulse">
                                    <span className="text-[9px] font-black text-slate-700 uppercase tracking-[0.3em] font-mono">[ CALCULATING... ]</span>
                                </div>
                            )}
                        </div>

                        {/* BLOCK 2: KEY PLAYERS */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 justify-center md:justify-start">
                                <Zap size={12} className={theme.badge} />
                                <span className="text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest italic leading-tight">Physical Intelligence</span>
                            </div>
                            <div className="flex flex-col gap-4">
                                <div className="grid grid-cols-2 gap-4">
                                    {/* Home Key Player */}
                                    <div className="border-l-2 border-current pl-3" style={{ color: 'inherit' }}>
                                        <div className="text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-tighter leading-none mb-1">
                                            #{match.home_key_player?.jersey_number || '—'} // {match.home_team?.short_name || match.homeTeamName}
                                        </div>
                                        <div className="text-base md:text-lg font-black text-white italic uppercase leading-none truncate">
                                            {match.home_key_player?.player_name || '[ GATHERING ]'}
                                        </div>
                                    </div>
                                    {/* Away Key Player */}
                                    <div className="border-l-2 border-slate-800 pl-3">
                                        <div className="text-[9px] md:text-[10px] font-black text-slate-600 uppercase tracking-tighter leading-none mb-1">
                                            #{match.away_key_player?.jersey_number || '—'} // {match.away_team?.short_name || match.awayTeamName}
                                        </div>
                                        <div className="text-base md:text-lg font-black text-slate-400 italic uppercase leading-none truncate">
                                            {match.away_key_player?.player_name || '[ GATHERING ]'}
                                        </div>
                                    </div>
                                </div>

                                <Link href={`/match/${uniqueId}`} className="flex items-center justify-center gap-2 w-full py-2 bg-slate-900 border border-slate-800 rounded-sm hover:bg-slate-800 transition-all group/btn mt-2">
                                    <span className="text-[10px] md:text-[11px] font-black text-white uppercase tracking-[0.3em] group-hover/btn:tracking-[0.4em] transition-all">ENTER WAR ROOM ⚔️</span>
                                </Link>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        )
    }
        </div >
    );
})}
        </div >
    );
}
