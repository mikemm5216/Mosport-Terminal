"use client";

import Link from 'next/link';
import LogoFallback from './LogoFallback';

export default function ESPNStyleScoreboard({ matches }: { matches: any[] }) {
    return (
        <div className="w-full max-w-7xl mx-auto bg-[#0a0f1a] border border-slate-900 rounded-2xl overflow-hidden shadow-2xl">

            {/* 標題列：完全致敬 ESPN 的簡潔區塊標題 */}
            <div className="bg-[#0f172a] border-b border-slate-800 px-6 py-3">
                <h2 className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.3em] flex items-center gap-2 italic">
                    <div className="w-1 h-1 rounded-full bg-cyan-400 animate-pulse" />
                    Global Scoreboard // Alpha Feed
                </h2>
            </div>

            {/* 賽事列表 Grid：手機單欄，桌機雙欄 (跟 ESPN Soccer 一樣) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 border-t border-slate-900">
                {matches.map((match, idx) => (
                    <Link
                        key={match.match_id || idx}
                        href={`/matches/${match.match_id}`}
                        className={`flex items-center justify-between p-5 hover:bg-white/[0.03] transition-all group cursor-pointer border-slate-900/50 ${idx % 2 === 0 ? 'lg:border-r' : ''} border-b`}
                    >

                        {/* 左側：上下堆疊的球隊 (完美致敬 ESPN) */}
                        <div className="flex flex-col gap-3">
                            {/* 主隊列 */}
                            <div className="flex items-center gap-3">
                                <LogoFallback
                                    url={match.home_logo_url || match.home_logo}
                                    name={match.home_team_name}
                                    shortName={match.home_short_name}
                                    sport={match.sport}
                                    size={24}
                                />
                                <span className="text-white font-black text-sm md:text-base tracking-tight italic uppercase">
                                    {match.home_team_name}
                                </span>
                                {match.home_score !== undefined && <span className="text-white font-black text-lg ml-auto">{match.home_score}</span>}
                            </div>
                            {/* 客隊列 */}
                            <div className="flex items-center gap-3">
                                <LogoFallback
                                    url={match.away_logo_url || match.away_logo}
                                    name={match.away_team_name}
                                    shortName={match.away_short_name}
                                    sport={match.sport}
                                    size={24}
                                />
                                <span className="text-white font-black text-sm md:text-base tracking-tight italic uppercase">
                                    {match.away_team_name}
                                </span>
                                {match.away_score !== undefined && <span className="text-white font-black text-lg ml-auto">{match.away_score}</span>}
                            </div>
                        </div>

                        {/* 右側：賽事狀態與 AI 標籤 */}
                        <div className="flex flex-col items-end justify-center gap-2 border-l border-slate-800/50 pl-6 min-w-[100px]">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic leading-none">
                                {match.time || "19:00"}
                            </span>

                            <div className="flex gap-1">
                                {match.tags?.includes("UPSET ALERT") && (
                                    <span className="text-[8px] font-black text-amber-400 bg-amber-400/5 px-2 py-0.5 rounded border border-amber-400/20 uppercase tracking-wider italic">
                                        🔥 UPSET
                                    </span>
                                )}
                                {match.tags?.includes("SYSTEM LOCK") && (
                                    <span className="text-[8px] font-black text-cyan-400 bg-cyan-400/5 px-2 py-0.5 rounded border border-cyan-400/20 uppercase tracking-wider italic">
                                        🔒 LOCK
                                    </span>
                                )}
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
