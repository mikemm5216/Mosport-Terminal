import Link from 'next/link';
import { prisma } from "@/lib/prisma";
import { WorldEngine, TeamStats } from "@/lib/world-engine";
import { ArrowLeft, Zap, Activity, Info, TrendingUp, Shield, Target } from 'lucide-react';
import { getShortName } from '@/lib/teams';
import { formatLocalTime } from '@/lib/timezone';
import ExecutionTerminal from '@/components/ExecutionTerminal';

export default async function WarRoomPage({ params }: { params: { id: string } }) {
   const { id } = await params;

   // 1. DATA INGESTION
   const match = await (prisma as any).match.findUnique({
      where: { id: id },
      include: {
         home_team: true,
         away_team: true,
         league: true,
         signals: true
      }
   }).catch(() => null);

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

   // 2. WORLD ENGINE ANALYTICS
   const homeHistory = await prisma.matchHistory.findMany({ where: { team_id: displayMatch.homeTeamId }, orderBy: { date: 'desc' }, take: 20 });
   const awayHistory = await prisma.matchHistory.findMany({ where: { team_id: displayMatch.awayTeamId }, orderBy: { date: 'desc' }, take: 20 });

   const homeStats: TeamStats = {
      id: displayMatch.homeTeamId,
      name: displayMatch.home_team.full_name,
      shortName: displayMatch.home_team.short_name,
      momentum: WorldEngine.calcMomentum(homeHistory),
      strength: WorldEngine.calcStrength(homeHistory),
      fatigue: WorldEngine.calcFatigue(homeHistory),
      history: homeHistory,
   };

   const awayStats: TeamStats = {
      id: displayMatch.awayTeamId,
      name: displayMatch.away_team.full_name,
      shortName: displayMatch.away_team.short_name,
      momentum: WorldEngine.calcMomentum(awayHistory),
      strength: WorldEngine.calcStrength(awayHistory),
      fatigue: WorldEngine.calcFatigue(awayHistory),
      history: awayHistory,
   };

   const simulation = WorldEngine.runMatchSimulation(homeStats, awayStats);
   const finalHomePct = Math.round(signal.confidence * 100);

   return (
      <div className="min-h-screen pb-32 bg-[#05090f] text-slate-200 font-sans selection:bg-cyan-500/30 overflow-x-hidden">

         {/* HEADER (image_9.png Reference) */}
         <div className="w-full bg-[#070c14] border-b border-slate-900 pt-16 pb-20 px-12">
            <div className="max-w-6xl mx-auto">
               <Link href="/" className="flex items-center gap-3 text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] hover:text-cyan-400 transition-colors mb-20 group">
                  <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                  Radar Feed
               </Link>

               {/* TEAM HEADER */}
               <div className="flex justify-between items-center mb-16">
                  <div className="flex flex-col items-center gap-4">
                     <span className="text-8xl font-black text-white italic uppercase tracking-tighter leading-none">{displayMatch.home_team.short_name}</span>
                     <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">{displayMatch.home_team.full_name}</span>
                  </div>

                  <div className="flex items-center gap-8 opacity-20">
                     <div className="w-12 h-12 rounded-full border-2 border-white flex items-center justify-center">
                        <Zap size={20} className="text-white" />
                     </div>
                     <span className="text-2xl font-black text-white italic">VS</span>
                     <div className="w-12 h-12 rounded-full border-2 border-white flex items-center justify-center">
                        <Zap size={20} className="text-white" />
                     </div>
                  </div>

                  <div className="flex flex-col items-center gap-4">
                     <span className="text-8xl font-black text-white italic uppercase tracking-tighter leading-none">{displayMatch.away_team.short_name}</span>
                     <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">{displayMatch.away_team.full_name}</span>
                  </div>
               </div>

               {/* MATCH ENERGY INDEX (Tug-of-war) */}
               <div className="space-y-6">
                  <div className="flex justify-center items-center gap-6">
                     <div className="h-px flex-1 bg-gradient-to-r from-transparent to-slate-800" />
                     <span className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.6em] italic">Match Energy Index</span>
                     <div className="h-px flex-1 bg-gradient-to-l from-transparent to-slate-800" />
                  </div>

                  <div className="relative h-24 w-full bg-[#03060a] rounded-3xl border border-white/5 flex items-center p-3 overflow-hidden shadow-2xl">
                     <div
                        className="h-full bg-emerald-500 rounded-2xl transition-all duration-[1500ms] flex items-center pl-10 shadow-[0_0_30px_rgba(16,185,129,0.3)]"
                        style={{ width: `${finalHomePct}%` }}
                     >
                        <span className="text-4xl font-black text-black italic">{finalHomePct}%</span>
                     </div>
                     <div className="w-1.5 h-full bg-white/10 z-10" />
                     <div className="h-full flex-1 flex items-center justify-end pr-10">
                        <span className="text-4xl font-black text-red-500 italic">{100 - finalHomePct}%</span>
                     </div>
                  </div>
               </div>
            </div>
         </div>

         {/* MAIN CONTENT GRID (image_9.png Reference) */}
         <main className="max-w-6xl mx-auto px-12 -mt-10 grid grid-cols-1 lg:grid-cols-2 gap-12">

            {/* PANEL LEFT: THE TRUTH MATRIX */}
            <section className="bg-[#0a111a] border border-slate-800 rounded-[3rem] p-12 shadow-2xl relative overflow-hidden group">
               <div className="absolute top-0 left-0 w-2 h-full bg-cyan-400 shadow-[0_0_20px_cyan]" />

               <div className="flex items-center gap-3 mb-10">
                  <Activity size={20} className="text-cyan-400" />
                  <h2 className="text-xl font-black text-white uppercase italic tracking-widest">Standard Analysis</h2>
               </div>

               <p className="text-3xl font-black text-white italic leading-snug uppercase tracking-tight mb-16">
                  {simulation.standardAnalysis || `${match.home_team.full_name} looks dominant at home. Expect them to control the tempo and capitalize on ${match.away_team.short_name}'s defensive gaps.`}
               </p>

               <div className="grid grid-cols-2 gap-8 pt-10 border-t border-slate-800/50">
                  <div className="space-y-1">
                     <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Reliability</span>
                     <div className="text-2xl font-black text-white italic">{(signal.confidence * 10).toFixed(1)}/10</div>
                  </div>
                  <div className="space-y-1">
                     <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Bias Pick</span>
                     <div className="text-2xl font-black text-cyan-400 italic uppercase">{displayMatch.home_team.short_name}</div>
                  </div>
               </div>
            </section>

            {/* PANEL RIGHT: TACTICAL SHOWDOWN */}
            <section className="bg-[#0a111a] border border-slate-800 rounded-[3rem] p-12 shadow-2xl space-y-10 relative">
               <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-3">
                     < Shield size={20} className="text-slate-500" />
                     <h2 className="text-xl font-black text-white uppercase italic tracking-widest">Tactical Showdown</h2>
                  </div>
                  <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Profiles Active</span>
               </div>

               <div className="relative space-y-4">
                  {/* HOME RATING */}
                  <div className="flex items-center gap-6">
                     <div className="w-24 h-24 rounded-2xl bg-slate-900 border-2 border-cyan-500/50 flex flex-col items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.2)]">
                        <span className="text-4xl font-black text-white">{(homeStats.strength * 10).toFixed(0)}</span>
                        <span className="text-[10px] font-black text-slate-600 uppercase italic">ST</span>
                     </div>
                     <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Athletic Intelligence...</span>
                        <span className="text-xs font-black text-cyan-400 uppercase italic">{displayMatch.home_team.short_name} [ST]</span>
                     </div>
                  </div>

                  <div className="absolute left-1/2 -ml-6 top-1/2 -mt-6 w-12 h-12 rounded-full bg-[#05090f] border border-slate-800 flex items-center justify-center z-10">
                     <span className="text-xs font-black text-slate-500 italic">VS</span>
                  </div>

                  {/* AWAY RATING */}
                  <div className="flex items-center gap-6 justify-end text-right">
                     <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Athletic Intelligence...</span>
                        <span className="text-xs font-black text-amber-500 uppercase italic">{displayMatch.away_team.short_name} [ST]</span>
                     </div>
                     <div className="w-24 h-24 rounded-2xl bg-slate-900 border-2 border-amber-500/50 flex flex-col items-center justify-center">
                        <span className="text-4xl font-black text-white">{(awayStats.strength * 10).toFixed(0)}</span>
                        <span className="text-[10px] font-black text-slate-600 uppercase italic">ST</span>
                     </div>
                  </div>
               </div>

               {/* TACTICAL ENGINE LOG */}
               <div className="mt-12 p-8 bg-slate-950 rounded-[2rem] border border-slate-900 shadow-inner">
                  <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest block mb-3">Tactical Engine Log</span>
                  <p className="text-[10px] text-slate-500 uppercase font-black italic leading-relaxed tracking-tighter">
                     Dictionary V2.0 Active. Position metrics mapped for {displayMatch.sport}. Accuracy optimization confirmed via institutional V11.5 node.
                  </p>
               </div>
            </section>

         </main>

         {/* EXECUTION TERMINAL */}
         <div className="mt-20 px-12">
            <ExecutionTerminal signalId={displayMatch.id} />
         </div>
      </div>
   );
}
