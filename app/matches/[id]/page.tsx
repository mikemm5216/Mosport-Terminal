import Link from 'next/link';
import { prisma } from "@/lib/prisma";
import { WorldEngine, TeamStats } from "@/lib/world-engine";
import { ArrowLeft, Zap, Activity, Info, TrendingUp, Shield, Target } from 'lucide-react';
import { getShortName } from '@/lib/teams';
import { formatLocalTime } from '@/lib/timezone';
import ExecutionTerminal from '@/components/ExecutionTerminal';
import LogoFallback from '@/components/LogoFallback';

export default async function WarRoomPage({ params }: { params: { id: string } }) {
   const { id } = await params;

   // 1. DATA INGESTION (Hardened V16.0: Absolute Resilience)
   let match = null;
   try {
      match = await (prisma as any).match.findUnique({
         where: { id: id },
         include: {
            home_team: true,
            away_team: true,
            league: true,
            signals: true
         }
      });
   } catch (e) {
      console.warn("[WAR ROOM] Database unavailable, falling back to Alpha Intel.");
   }

   if (!match && id !== 'EPL-CRY-WHU-001') {
      return (
         <div className="min-h-screen bg-[#05090f] flex flex-col items-center justify-center p-8">
            <h1 className="text-2xl font-black text-white uppercase tracking-widest mb-4 italic">Intelligence Missing</h1>
            <Link href="/" className="text-cyan-400 font-mono text-xs uppercase tracking-widest hover:underline">Return to Radar</Link>
         </div>
      );
   }

   // V15.5 MOCK FALLBACK FOR DEMO
   const mockMatch = {
      id: 'EPL-CRY-WHU-001',
      homeTeamId: 'CRY',
      awayTeamId: 'WHU',
      sport: 'football',
      home_team: { full_name: 'Crystal Palace', short_name: 'CRY' },
      away_team: { full_name: 'West Ham United', short_name: 'WHU' },
      signals: [{ confidence: 0.82, edge: 0.12, ev: 0.15 }]
   };

   const displayMatch = match || mockMatch;
   const signal = displayMatch.signals?.[0] || { edge: 0.12, ev: 0.15, confidence: 0.65, tags: [] };

   // 2. WORLD ENGINE ANALYTICS (Hardened V16.0: Absolute Resilience)
   let homeHistory: any[] = [];
   let awayHistory: any[] = [];
   try {
      homeHistory = await prisma.matchHistory.findMany({ where: { team_id: displayMatch.homeTeamId }, orderBy: { date: 'desc' }, take: 20 });
      awayHistory = await prisma.matchHistory.findMany({ where: { team_id: displayMatch.awayTeamId }, orderBy: { date: 'desc' }, take: 20 });
   } catch (e) {
      console.warn("[WAR ROOM] History Data unavailable. Simulation running on Base Profiles.");
   }

   const homeStats: TeamStats = {
      id: displayMatch.homeTeamId || 'HOME',
      name: displayMatch.home_team?.full_name || 'Home Team',
      shortName: displayMatch.home_team?.short_name || 'HOME',
      momentum: WorldEngine.calcMomentum(homeHistory),
      strength: WorldEngine.calcStrength(homeHistory),
      fatigue: WorldEngine.calcFatigue(homeHistory),
      history: homeHistory,
   };

   const awayStats: TeamStats = {
      id: displayMatch.awayTeamId || 'AWAY',
      name: displayMatch.away_team?.full_name || 'Away Team',
      shortName: displayMatch.away_team?.short_name || 'AWAY',
      momentum: WorldEngine.calcMomentum(awayHistory),
      strength: WorldEngine.calcStrength(awayHistory),
      fatigue: WorldEngine.calcFatigue(awayHistory),
      history: awayHistory,
   };

   const simulation = WorldEngine.runMatchSimulation(homeStats, awayStats);
   const finalHomePct = Math.round(signal.confidence * 100);

   return (
      <div className="min-h-screen pb-20 bg-[#05090f] text-slate-200 font-sans selection:bg-cyan-500/30 overflow-x-hidden">

         {/* HEADER (High-Density V16.0) */}
         <div className="w-full bg-[#070c14] border-b border-slate-900 pt-8 pb-10 px-12">
            <div className="max-w-6xl mx-auto">
               <Link href="/" className="flex items-center gap-2 text-[9px] font-black text-slate-600 uppercase tracking-[0.4em] hover:text-cyan-400 transition-colors mb-12 group">
                  <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                  Radar Feed
               </Link>

               {/* V16.3 終極響應式 Header */}
               <div className="flex flex-col md:flex-row items-center justify-center md:justify-start gap-4 md:gap-12 mb-4 md:mb-8 pt-4">
                  <div className="flex flex-col md:flex-row items-center gap-2 md:gap-6 text-center md:text-left">
                     <LogoFallback url={displayMatch.home_team.logo_url} name={displayMatch.home_team.full_name} shortName={displayMatch.home_team.short_name} sport={displayMatch.sport} size={80} />
                     <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-white italic tracking-tighter uppercase leading-none mt-2 md:mt-0">
                        {displayMatch.home_team.short_name}
                     </h1>
                  </div>
                  <span className="text-lg md:text-2xl font-black text-slate-600 italic">VS</span>
                  <div className="flex flex-col md:flex-row-reverse items-center gap-2 md:gap-6 text-center md:text-right">
                     <LogoFallback url={displayMatch.away_team.logo_url} name={displayMatch.away_team.full_name} shortName={displayMatch.away_team.short_name} sport={displayMatch.sport} size={80} />
                     <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-white italic tracking-tighter uppercase leading-none mt-2 md:mt-0">
                        {displayMatch.away_team.short_name}
                     </h1>
                  </div>
               </div>

               {/* MATCH ENERGY INDEX (Compressed) */}
               <div className="space-y-4">
                  <div className="flex justify-center items-center gap-4">
                     <div className="h-px flex-1 bg-gradient-to-r from-transparent to-slate-900" />
                     <span className="text-[9px] font-black text-cyan-400 uppercase tracking-[0.5em] italic">Match Energy Index</span>
                     <div className="h-px flex-1 bg-gradient-to-l from-transparent to-slate-900" />
                  </div>

                  <div className="relative h-16 w-full bg-[#03060a] rounded-2xl border border-white/5 flex items-center p-2 overflow-hidden shadow-2xl">
                     <div
                        className="h-full bg-emerald-500 rounded-xl transition-all duration-[1500ms] flex items-center pl-8 shadow-[0_0_30px_rgba(16,185,129,0.3)]"
                        style={{ width: `${finalHomePct}%` }}
                     >
                        <span className="text-2xl font-black text-black italic">{finalHomePct}%</span>
                     </div>
                     <div className="w-1 h-full bg-white/10 z-10" />
                     <div className="h-full flex-1 flex items-center justify-end pr-8">
                        <span className="text-2xl font-black text-red-500 italic">{100 - finalHomePct}%</span>
                     </div>
                  </div>
               </div>
            </div>
         </div>

         {/* MAIN CONTENT GRID (High-Density V16.0) */}
         <main className="max-w-6xl mx-auto px-12 -mt-6 grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* PANEL LEFT: THE TRUTH MATRIX */}
            <section className="bg-[#0a111a] border border-slate-800 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden group">
               <div className="absolute top-0 left-0 w-1.5 h-full bg-cyan-400 shadow-[0_0_20px_cyan]" />

               <div className="flex items-center gap-3 mb-6">
                  <Activity size={18} className="text-cyan-400" />
                  <h2 className="text-lg font-black text-white uppercase italic tracking-widest">Standard Analysis</h2>
               </div>

               <p className="text-xl font-black text-white italic leading-snug uppercase tracking-tight mb-10">
                  {simulation.standardAnalysis || `${match.home_team.full_name} looks dominant at home. Expect them to control the tempo and capitalize on ${match.away_team.short_name}'s defensive gaps.`}
               </p>

               <div className="grid grid-cols-2 gap-6 pt-6 border-t border-slate-800/50">
                  <div className="space-y-1">
                     <span className="text-[8px] font-black text-slate-700 uppercase tracking-widest">Reliability</span>
                     <div className="text-xl font-black text-white italic">{(signal.confidence * 10).toFixed(1)}/10</div>
                  </div>
                  <div className="space-y-1">
                     <span className="text-[8px] font-black text-slate-700 uppercase tracking-widest">Bias Pick</span>
                     <div className="text-xl font-black text-cyan-400 italic uppercase">{displayMatch.home_team.short_name}</div>
                  </div>
               </div>
            </section>

            {/* PANEL RIGHT: TACTICAL SHOWDOWN (High-Density) */}
            <section className="bg-[#0a111a] border border-slate-800 rounded-[2rem] p-8 shadow-2xl space-y-6 relative">
               <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-3">
                     < Shield size={16} className="text-slate-600" />
                     <h2 className="text-lg font-black text-white uppercase italic tracking-widest">Tactical Showdown</h2>
                  </div>
                  <span className="text-[9px] font-black text-slate-800 uppercase tracking-widest">Profiles Active</span>
               </div>

               <div className="relative space-y-4">
                  {/* HOME RATING */}
                  <div className="flex items-center gap-4">
                     <div className="w-16 h-16 rounded-xl bg-slate-900 border border-cyan-500/50 flex flex-col items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.1)]">
                        <span className="text-2xl font-black text-white">{(homeStats.strength * 10).toFixed(0)}</span>
                        <span className="text-[8px] font-black text-slate-700 uppercase italic">ST</span>
                     </div>
                     <div className="flex flex-col">
                        <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-0.5">Athletic Intelligence...</span>
                        <span className="text-[11px] font-black text-cyan-400 uppercase italic">{displayMatch.home_team.short_name} [ST]</span>
                     </div>
                  </div>

                  {/* VS Divider (Mini) */}
                  <div className="absolute left-1/2 -ml-4 top-1/2 -mt-4 w-8 h-8 rounded-full bg-[#05090f] border border-slate-900 flex items-center justify-center z-10 opacity-30">
                     <span className="text-[8px] font-black text-slate-700 italic">VS</span>
                  </div>

                  {/* AWAY RATING */}
                  <div className="flex items-center gap-4 justify-end text-right">
                     <div className="flex flex-col">
                        <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-0.5">Athletic Intelligence...</span>
                        <span className="text-[11px] font-black text-amber-500 uppercase italic">{displayMatch.away_team.short_name} [ST]</span>
                     </div>
                     <div className="w-16 h-16 rounded-xl bg-slate-900 border border-amber-500/50 flex flex-col items-center justify-center">
                        <span className="text-2xl font-black text-white">{(awayStats.strength * 10).toFixed(0)}</span>
                        <span className="text-[8px] font-black text-slate-700 uppercase italic">ST</span>
                     </div>
                  </div>
               </div>

               {/* TACTICAL ENGINE LOG (Slim) */}
               <div className="mt-6 p-4 bg-slate-950 rounded-[1.5rem] border border-slate-900 shadow-inner">
                  <span className="text-[8px] font-black text-slate-800 uppercase tracking-widest block mb-2">Tactical Engine Log</span>
                  <p className="text-[9px] text-slate-700 uppercase font-black italic leading-tight tracking-tighter">
                     Dictionary V2.0 Active. Optimized for High-Density Audit.
                  </p>
               </div>
            </section>

         </main>

         {/* EXECUTION TERMINAL (Compacted) */}
         <div className="mt-8 px-12">
            <ExecutionTerminal signalId={displayMatch.id} />
         </div>
      </div>
   );
}
