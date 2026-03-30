import Link from 'next/link';
import { ArrowLeft, Zap, Activity, Target, Users } from 'lucide-react';
import LogoFallback from '@/components/LogoFallback';

export const dynamic = 'force-dynamic';

// Fetch live match data from the signals API
async function getWarRoomData(id: string) {
   try {
      const base = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001';
      const res = await fetch(`${base}/api/matches/${id}`, {
         cache: 'no-store',
         signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json.success ? json.data : null;
   } catch {
      return null;
   }
}

export default async function WarRoomPage({ params }: { params: { id: string } }) {
   const { id } = await params;

   // Fetch live fused data (ESPN + FastAPI) — this is the real key_player source
   const liveData = await getWarRoomData(id);

   // Fallback DB match for team logos
   let dbMatch: any = null;
   try {
      const { prisma } = await import('@/lib/prisma');
      dbMatch = await (prisma as any).match.findFirst({
         where: { extId: id },
         include: { home_team: true, away_team: true, signals: true }
      });
   } catch { /* DB offline is acceptable */ }

   const hasLive = !!liveData;

   // Prefer live API data, fall back to DB
   const homeShort = liveData?.home_team?.short_name || dbMatch?.home_team?.short_name || id;
   const awayShort = liveData?.away_team?.short_name || dbMatch?.away_team?.short_name || '';
   const homeLogo = liveData?.home_team?.logo_url || dbMatch?.home_team?.logo_url;
   const awayLogo = liveData?.away_team?.logo_url || dbMatch?.away_team?.logo_url;
   const homeScore = liveData?.home_score ?? dbMatch?.homeScore;
   const awayScore = liveData?.away_score ?? dbMatch?.awayScore;
   const status = liveData?.status || dbMatch?.status || 'SCHEDULED';

   const signal = dbMatch?.signals || {};
   const stdArr = liveData?.standard_analysis || signal.standard_analysis || ['ANALYZING PRIMARY VECTORS...', 'COLLECTING DOMAIN DATA...', 'SYNTHESIZING ALPHA...'];
   const tactArr = liveData?.tactical_matchup || signal.tactical_matchup || ['EVALUATING SQUAD DEPTH...', 'MAPPING TRANSITION STATES...', 'DETERMINING EDGE...'];
   const xfArr = liveData?.x_factors || signal.x_factors || ['MONITORING ATMOSPHERICS...', 'CALIBRATING MOMENTUM...', 'ISOLATING OUTLIERS...'];

   const homeWinProb = liveData?.win_probabilities?.home_win_prob ?? 0.5;
   const awayWinProb = liveData?.win_probabilities?.away_win_prob ?? 0.5;
   const momentumIdx = liveData?.momentum_index ?? 0;

   // Key Players — real data from ESPN boxscore via /api/matches/[id]
   const hkp = liveData?.home_key_player;
   const akp = liveData?.away_key_player;

   const isLive = status === 'IN_PLAY' || status === 'LIVE';

   if (!liveData && !dbMatch) {
      return (
         <div className="min-h-screen bg-[#020617] flex items-center justify-center">
            <h1 className="text-2xl text-slate-500 font-mono uppercase tracking-[0.5em] animate-pulse">[ WAR ROOM OFFLINE: SIGNAL NOT FOUND ]</h1>
         </div>
      );
   }

   return (
      <div className="min-h-screen pb-20 bg-[#020617] text-slate-200 font-sans selection:bg-cyan-500/30">

         {/* HEADER */}
         <div className="w-full bg-[#070c14] border-b border-slate-900 pt-8 pb-10 px-6 md:px-12 mb-8">
            <div className="max-w-7xl mx-auto">
               <Link href="/" className="flex items-center gap-2 text-[9px] font-black text-slate-600 uppercase tracking-[0.4em] hover:text-cyan-400 transition-colors mb-8 group">
                  <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                  Radar Feed
               </Link>

               {/* Score Banner */}
               <div className="flex flex-wrap items-center justify-center w-full gap-4 md:gap-8 pt-4">
                  <div className="flex-1 flex items-center justify-center md:justify-end gap-4 md:gap-6 text-center min-w-[120px]">
                     <LogoFallback url={homeLogo} name={homeShort} shortName={homeShort} size={60} className="w-12 h-12 md:w-20 md:h-20" />
                     <div className="flex flex-col items-center md:items-end">
                        <h1 className="text-4xl md:text-5xl lg:text-7xl font-black text-white italic tracking-tighter uppercase leading-none">{homeShort}</h1>
                        {homeScore !== undefined && (
                           <span className="text-2xl md:text-4xl font-black text-cyan-400 font-mono">{homeScore}</span>
                        )}
                     </div>
                  </div>

                  <div className="flex flex-col items-center shrink-0 gap-1">
                     <span className="text-2xl font-black text-slate-800 italic">⚔️</span>
                     <span className={`text-[9px] font-black uppercase tracking-widest ${isLive ? 'text-red-400 animate-pulse' : 'text-slate-600'}`}>
                        {isLive && <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 mr-1 animate-ping" />}
                        {status}
                     </span>
                  </div>

                  <div className="flex-1 flex flex-row-reverse items-center justify-center md:justify-end gap-4 md:gap-6 text-center min-w-[120px]">
                     <LogoFallback url={awayLogo} name={awayShort} shortName={awayShort} size={60} className="w-12 h-12 md:w-20 md:h-20" />
                     <div className="flex flex-col items-center md:items-start">
                        <h1 className="text-4xl md:text-5xl lg:text-7xl font-black text-white italic tracking-tighter uppercase leading-none">{awayShort}</h1>
                        {awayScore !== undefined && (
                           <span className="text-2xl md:text-4xl font-black text-slate-400 font-mono">{awayScore}</span>
                        )}
                     </div>
                  </div>
               </div>

               {/* Win Probability Tug-of-War */}
               <div className="mt-8 max-w-2xl mx-auto">
                  <div className="flex justify-between text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 px-1">
                     <span>{homeShort} Alpha</span>
                     <span>Win Probability Intelligence</span>
                     <span>{awayShort}</span>
                  </div>
                  <div className="relative h-3 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                     <div
                        className="absolute inset-y-0 left-0 bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.5)] transition-all duration-700"
                        style={{ width: `${Math.max(5, homeWinProb * 100)}%` }}
                     />
                  </div>
                  <div className="flex justify-between text-[9px] font-mono text-slate-600 mt-1 px-1">
                     <span>{(homeWinProb * 100).toFixed(0)}%</span>
                     <span className="text-slate-700">MOMENTUM IDX: {momentumIdx.toFixed(3)}</span>
                     <span>{(awayWinProb * 100).toFixed(0)}%</span>
                  </div>
               </div>
            </div>
         </div>

         <main className="max-w-7xl mx-auto px-4 md:px-6 lg:px-12">

            {/* ── Phase 2: KEY PLAYERS BLOCK ── */}
            <section className="mb-6 bg-[#0a111a] border border-slate-800 rounded-2xl p-6 shadow-2xl relative group overflow-hidden">
               <div className="absolute top-0 left-0 w-1 h-full bg-violet-500 opacity-20 group-hover:opacity-100 transition-opacity" />
               <div className="flex items-center gap-3 mb-5">
                  <Users size={16} className="text-violet-400" />
                  <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] italic">Physical Intelligence — Key Assets</h2>
               </div>
               {/* Phase 1 Fix: flex-col on mobile, flex-row on md+ — no more squish */}
               <div className="flex flex-col md:flex-row gap-4 md:gap-8">
                  {/* Home Key Player */}
                  <div className="flex-1 border-l-2 border-cyan-500/40 pl-4">
                     <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">
                        #{hkp?.jersey_number || '—'} // {homeShort}
                     </div>
                     <div className="text-xl md:text-2xl font-black text-white italic uppercase leading-tight">
                        {hkp?.player_name && hkp.player_name !== '[ INTELLIGENCE PENDING ]'
                           ? hkp.player_name
                           : <span className="text-slate-600 text-sm animate-pulse">[ AWAITING BOXSCORE ]</span>
                        }
                     </div>
                     <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter mt-1">
                        {hkp?.physical_profile || '[ CLASSIFIED PHYSICALS ]'}
                     </div>
                     <div className="text-[10px] font-mono text-cyan-500/70 mt-1">
                        {hkp?.season_stats || '[ CALCULATING METRICS ]'} · {hkp?.role || 'STAR'}
                     </div>
                  </div>

                  <div className="hidden md:block w-px bg-slate-800 self-stretch" />

                  {/* Away Key Player */}
                  <div className="flex-1 border-l-2 border-slate-700/40 pl-4">
                     <div className="text-[9px] font-black text-slate-700 uppercase tracking-widest mb-1">
                        #{akp?.jersey_number || '—'} // {awayShort}
                     </div>
                     <div className="text-xl md:text-2xl font-black text-slate-400 italic uppercase leading-tight">
                        {akp?.player_name && akp.player_name !== '[ INTELLIGENCE PENDING ]'
                           ? akp.player_name
                           : <span className="text-slate-700 text-sm animate-pulse">[ AWAITING BOXSCORE ]</span>
                        }
                     </div>
                     <div className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter mt-1">
                        {akp?.physical_profile || '[ CLASSIFIED PHYSICALS ]'}
                     </div>
                     <div className="text-[10px] font-mono text-slate-600 mt-1">
                        {akp?.season_stats || '[ CALCULATING METRICS ]'} · {akp?.role || 'STAR'}
                     </div>
                  </div>
               </div>
            </section>

            {/* TACTICAL GRIDS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
               {/* 1. STANDARD ANALYSIS */}
               <section className="bg-[#0a111a] border border-slate-800 rounded-2xl p-6 shadow-2xl relative group overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500 opacity-20 group-hover:opacity-100 transition-opacity" />
                  <div className="flex items-center gap-3 mb-4">
                     <Activity size={16} className="text-cyan-400" />
                     <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] italic">Standard Intelligence</h2>
                  </div>
                  <div className="space-y-3">
                     {stdArr.map((node: string, i: number) => (
                        <div key={i} className="flex gap-3">
                           <span className="text-[8px] font-black text-cyan-500/40 mt-1">0{i + 1}</span>
                           <p className="text-[11px] font-bold text-slate-300 uppercase leading-relaxed tracking-tight">{node}</p>
                        </div>
                     ))}
                  </div>
               </section>

               {/* 2. TACTICAL MATCHUP */}
               <section className="bg-[#0a111a] border border-slate-800 rounded-2xl p-6 shadow-2xl relative group overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 opacity-20 group-hover:opacity-100 transition-opacity" />
                  <div className="flex items-center gap-3 mb-4">
                     <Zap size={16} className="text-emerald-400" />
                     <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] italic">Tactical Showdown</h2>
                  </div>
                  <div className="space-y-3">
                     {tactArr.map((node: string, i: number) => (
                        <div key={i} className="flex gap-3">
                           <span className="text-[8px] font-black text-emerald-500/40 mt-1">0{i + 1}</span>
                           <p className="text-[11px] font-bold text-slate-300 uppercase leading-relaxed tracking-tight">{node}</p>
                        </div>
                     ))}
                  </div>
               </section>

               {/* 3. X-FACTORS */}
               <section className="bg-[#0a111a] border border-slate-800 rounded-2xl p-6 shadow-2xl relative group overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-amber-500 opacity-20 group-hover:opacity-100 transition-opacity" />
                  <div className="flex items-center gap-3 mb-4">
                     <Target size={16} className="text-amber-400" />
                     <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] italic">Critical X-Factors</h2>
                  </div>
                  <div className="space-y-3">
                     {xfArr.map((node: string, i: number) => (
                        <div key={i} className="flex gap-3">
                           <span className="text-[8px] font-black text-amber-500/40 mt-1">0{i + 1}</span>
                           <p className="text-[11px] font-bold text-slate-300 uppercase leading-relaxed tracking-tight">{node}</p>
                        </div>
                     ))}
                  </div>
               </section>
            </div>

            <div className="mt-8 shadow-2xl">
               {/* ExecutionTerminal only mounts if dbMatch exists */}
               {dbMatch?.id && (
                  <div id="execution-terminal-mount">
                     {/* ExecutionTerminal is a client component that needs the match id */}
                     <div className="bg-[#0a111a] border border-slate-800 rounded-2xl p-6">
                        <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-2">Execution Terminal</div>
                        <div className="text-xs font-mono text-slate-500">Signal ID: {dbMatch.id}</div>
                     </div>
                  </div>
               )}
            </div>
         </main>
      </div>
   );
}
