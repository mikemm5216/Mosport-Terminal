"use client"

import { useMemo, useState } from 'react';
import Link from 'next/link';
import EntityLogo from '@/src/components/EntityLogo';
import { ENTITY_REGISTRY } from "@/src/config/entityRegistry";

// Narrative theme types for dynamic coloring
export type NarrativeTheme = 'energy' | 'drama' | 'record' | 'standard';

export const narrativeThemes: Record<string, { border: string, text: string, label: string }> = {
  fatigue: {
    border: 'border-cyan-400',
    text: 'text-cyan-400',
    label: 'Energy Domination'
  },
  scandal: {
    border: 'border-orange-500',
    text: 'text-orange-500',
    label: 'Off-Court Storm'
  },
  news_driven: {
    border: 'border-purple-400',
    text: 'text-purple-400',
    label: 'Critical Intel'
  },
  standard: {
    border: 'border-slate-500',
    text: 'text-slate-400',
    label: 'System Analysis'
  }
}

// 產生隊伍縮寫 (例如 Los Angeles Lakers -> LAL)
function getTeamInitials(name: string) {
  if (!name) return "UNK";
  const words = name.split(" ");
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.substring(0, 3).toUpperCase();
}

export default function MatchCard({ match }: { match: any }) {

  // 解析 JSON feature 取出電量
  const { homeBattery, awayBattery } = useMemo(() => {
    let hb = 50;
    let ab = 50;
    if (match?.snapshots && match.snapshots.length > 0) {
      const featureData = match.snapshots[0].feature_json;
      // 試著從不同可能的欄位名稱提取，若無則預設 50/50 
      const rawHb = featureData?.bio_battery_home ?? featureData?.h_bio ?? featureData?.home_energy;
      const rawAb = featureData?.bio_battery_away ?? featureData?.a_bio ?? featureData?.away_energy;

      if (typeof rawHb === 'number') hb = rawHb;
      if (typeof rawAb === 'number') ab = rawAb;
    }

    // 將預測或原始數值轉為加總100的比例，以作為 UI 長條圖顯示
    const total = hb + ab;
    if (total > 0) {
      return {
        homeBattery: Math.round((hb / total) * 100),
        awayBattery: Math.round((ab / total) * 100)
      };
    }
    return { homeBattery: 50, awayBattery: 50 };
  }, [match]);

  const homeTeamName = (match?.home_team_id && ENTITY_REGISTRY[match?.home_team_id]?.name) || match?.home_team?.short_name || match?.home_team?.team_name || match?.home_team?.full_name || match?.homeTeamName || "Home Team";
  const awayTeamName = (match?.away_team_id && ENTITY_REGISTRY[match?.away_team_id]?.name) || match?.away_team?.short_name || match?.away_team?.team_name || match?.away_team?.full_name || match?.awayTeamName || "Away Team";

  const homeCity = (match?.home_team_id && ENTITY_REGISTRY[match?.home_team_id]?.shortName) || match?.home_team?.home_city || "City";
  const awayCity = (match?.away_team_id && ENTITY_REGISTRY[match?.away_team_id]?.shortName) || match?.away_team?.home_city || "City";

  const homeInitials = getTeamInitials(homeTeamName);
  const awayInitials = getTeamInitials(awayTeamName);

  // 判斷賽程狀態與時間
  const matchDate = match?.match_date ? new Date(match.match_date) : new Date();
  const timeStr = matchDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = matchDate.toLocaleDateString([], { month: 'short', day: 'numeric' });

  // 取得敘事引擎產生的結論
  const narrativeText = match?.narrative || "System evaluating pre-match intelligence and physical factors... Node connection verified.";
  const narrativeType = match?.narrative_type || "standard";
  const theme = narrativeThemes[narrativeType] || narrativeThemes.standard;


  return (
    <Link href={`/match/${match?.match_id}`} className="block w-full relative group">

      {/* Date floating badge (optional design touch) */}
      <div className="absolute -top-3 left-6 z-10 px-3 py-1 bg-slate-950 border border-slate-700/50 rounded-full text-[10px] font-mono text-slate-400 group-hover:border-cyan-500/30 transition-colors">
        {dateStr} {timeStr}
      </div>

      <div
        className="
          bg-slate-900 
          border border-slate-700 
          rounded-xl sm:rounded-2xl 
          pt-8 sm:pt-10 p-4 sm:p-6 md:p-8
          transition-all 
          duration-300 
          ease-out
          hover:-translate-y-2 
          hover:shadow-2xl 
          hover:shadow-slate-900/50
          hover:border-slate-500
          cursor-pointer
        "
      >
        {/* Top Info Bar */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <span className="text-sm sm:text-base text-slate-400 uppercase tracking-widest font-medium pr-4">
            {match?.sport || match?.league?.league_name || "PRO LEAGUE"}
          </span>
          <span className="text-[10px] sm:text-xs text-slate-400 font-mono shrink-0 px-2 py-0.5 bg-slate-800 rounded">
            {match?.status === "COMPLETED" ? (
              <span className="text-emerald-400">FIN ({match.home_score}-{match.away_score})</span>
            ) : (
              "UPCOMING"
            )}
          </span>
        </div>

        {/* Teams VS Section */}
        <div className="flex flex-row items-center justify-between mb-6 sm:mb-8 gap-2 sm:gap-4 w-full">
          {/* Left Team */}
          <div className="flex flex-row items-center flex-1 justify-start gap-4 h-full">
            <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center shrink-0 shadow-lg overflow-hidden bg-slate-800 border-2 border-slate-700/50">
              <EntityLogo entityHash={match?.home_team_id} className="w-full h-full object-contain mix-blend-plus-lighter" />
            </div>
            <div className="flex flex-col items-start min-w-0">
              <span className="text-lg md:text-2xl lg:text-3xl font-extrabold text-white text-left leading-tight whitespace-normal break-words">
                {homeTeamName}
              </span>
              <span className="text-[10px] sm:text-xs text-slate-500 mt-1 uppercase tracking-widest text-left break-words">{homeCity}</span>
            </div>
          </div>

          {/* VS / Score Badge (Patch 17.15) */}
          <div className="flex flex-col items-center px-4 shrink-0 justify-center">
            {match?.status === "COMPLETED" || match?.status === "post" ? (
              <div className="flex flex-col items-center">
                <div className="text-3xl md:text-4xl font-black text-white font-mono tracking-tighter">
                  {match.home_score ?? 0} <span className="text-slate-600 px-1">-</span> {match.away_score ?? 0}
                </div>
                <span className="text-[9px] text-emerald-400 mt-1 uppercase tracking-widest font-black">FINAL</span>
              </div>
            ) : (
              <div className="px-3 py-1 bg-slate-800 rounded-full border border-slate-700">
                <span className="text-xs font-bold text-slate-400 tracking-wider">VS</span>
              </div>
            )}
          </div>

          {/* Right Team */}
          <div className="flex flex-row items-center flex-1 justify-end gap-4 h-full">
            <div className="flex flex-col items-end min-w-0">
              <span className="text-lg md:text-2xl lg:text-3xl font-extrabold text-white text-right leading-tight whitespace-normal break-words">
                {awayTeamName}
              </span>
              <span className="text-[10px] sm:text-xs text-slate-500 mt-1 uppercase tracking-widest text-right break-words">{awayCity}</span>
            </div>
            <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center shrink-0 shadow-lg overflow-hidden bg-slate-800 border-2 border-slate-700/50">
              <EntityLogo entityHash={match?.away_team_id} className="w-full h-full object-contain mix-blend-plus-lighter" />
            </div>
          </div>
        </div>

        {/* Bio-Battery Section / Final Score Settlement (Patch 17.14) */}
        {match?.status === "COMPLETED" ? (
          <div className="mb-4 sm:mb-6 bg-slate-950/50 p-3 sm:p-4 rounded-xl border border-slate-800/50 flex flex-col items-center justify-center">
            <span className="text-[10px] text-slate-500 font-bold tracking-widest uppercase mb-1">FINAL SCORE</span>
            <div className="text-3xl font-black text-white font-mono">
              {match.home_score ?? 0} <span className="text-slate-600 px-2">-</span> {match.away_score ?? 0}
            </div>
            {/* Historical Prediction Settlement */}
            {match.predicted_home_win_rate && (
              <div className="mt-2 text-[10px] text-slate-400 font-mono flex items-center gap-1.5 border-t border-slate-800/50 pt-2 w-full justify-center">
                <span className="text-cyan-500">SYS PRED:</span>
                <span>{Math.round(match.predicted_home_win_rate * 100)}% {homeInitials}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="mb-4 sm:mb-6 bg-slate-950/50 p-3 sm:p-4 rounded-xl border border-slate-800/50">
            {/* Battery Labels */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs sm:text-sm">🔋</span>
                <span className="text-xs sm:text-sm font-bold text-emerald-400">{homeBattery}%</span>
              </div>
              <div className="flex items-center justify-center">
                <span className="text-[10px] text-slate-600 font-mono tracking-widest uppercase">Bio-Battery / Rest</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs sm:text-sm font-bold text-red-400">{awayBattery}%</span>
                <span className="text-xs sm:text-sm">🪫</span>
              </div>
            </div>

            {/* Dual Progress Bar */}
            <div className="relative h-2 sm:h-3 bg-slate-800 rounded-full overflow-hidden shadow-inner flex">
              <div
                className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-1000 ease-out"
                style={{ width: `${homeBattery}%` }}
              />
              <div
                className="h-full bg-gradient-to-l from-red-600 to-red-400 transition-all duration-1000 ease-out"
                style={{ width: `${awayBattery}%` }}
              />
              <div className="absolute left-1/2 top-0 w-[1px] h-full bg-slate-300/20 z-10 -translate-x-1/2" />
            </div>

            {/* Team Labels Under Bar */}
            <div className="flex items-center justify-between mt-2">
              <span className="text-[10px] sm:text-xs text-slate-500 font-semibold tracking-wide">{homeInitials}</span>
              <span className="text-[10px] sm:text-xs text-slate-500 font-semibold tracking-wide">{awayInitials}</span>
            </div>
          </div>
        )}

        {/* Bottom Narrative Box - Intelligence Panel Style */}
        <div className={`bg-slate-800/50 rounded-r-xl rounded-l-sm p-3 sm:p-4 border-l-4 ${theme.border} relative overflow-hidden group-hover:bg-slate-800 transition-colors`}>
          <div className={`absolute -right-4 -top-4 w-24 h-24 bg-current opacity-[0.03] rounded-full blur-2xl ${theme.text}`} />
          <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-widest ${theme.text}`}>
            {theme.label}
          </span>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mt-2 font-medium">
            {narrativeText}
          </p>
        </div>

        {/* Watermark for Shareability */}
        <div className="flex justify-between items-end mt-4 sm:mt-5 pt-3 border-t border-slate-800/50">
          <div className="flex gap-2">
            {match?.signal_pick && (
              <span className="px-2 py-0.5 bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-[10px] uppercase rounded tracking-wider shadow-[0_0_10px_rgba(99,102,241,0.2)]">
                PICK: {match.signal_pick}
              </span>
            )}
            {match?.signal_conf && (
              <span className="px-2 py-0.5 bg-slate-800 border border-slate-700 text-slate-400 text-[10px] font-mono rounded tracking-wider">
                CONF: {match.signal_conf}%
              </span>
            )}
          </div>
          <span className="text-[8px] sm:text-[9px] text-slate-600 tracking-wider font-mono">
            SYS.MOSPORT.IO
          </span>
        </div>
      </div>
    </Link>
  )
}
