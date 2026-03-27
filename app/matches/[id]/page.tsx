import Link from 'next/link';
import { prisma } from "@/lib/prisma";
import { WorldEngine, TeamStats } from "@/lib/world-engine";
import { ArrowLeft, Zap, Activity, User, Info, Target, Shield, Clock, AlertTriangle, TrendingUp } from 'lucide-react';
import { getShortName } from '@/lib/teams';
import { formatLocalTime } from '@/lib/timezone';
import ExecutionTerminal from '@/components/ExecutionTerminal';

export default async function WarRoomPage({ params }: { params: { id: string } }) {
   const { id } = await params;

   // 1. DATA INGESTION (RELATIONAL ENRICHMENT)
   const match = await (prisma as any).match.findUnique({
      where: { id: id },
      include: {
         home_team: true,
         away_team: true,
         league: true,
         snapshots: { orderBy: { created_at: 'desc' }, take: 10 },
         odds: { orderBy: { fetched_at: 'desc' }, take: 1 }
      }
   });

   if (!match) {
      return (
         <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8">
            <h1 className="text-2xl font-black text-white uppercase tracking-widest mb-4">Intelligence Missing</h1>
            <Link href="/" className="text-cyan-400 font-mono text-xs uppercase tracking-widest hover:underline">Return to Radar</Link>
         </div>
      );
   }

   // 2. WORLD ENGINE INTEGRATION (ATHLETIC METRICS)
   const homeHistory = await prisma.matchHistory.findMany({ where: { team_id: match.homeTeamId }, orderBy: { date: 'desc' }, take: 20 });
   const awayHistory = await prisma.matchHistory.findMany({ where: { team_id: match.awayTeamId }, orderBy: { date: 'desc' }, take: 20 });

   const homeStats: TeamStats = {
      id: match.homeTeamId,
      name: match.home_team.full_name,
      shortName: match.home_team.short_name,
      momentum: WorldEngine.calcMomentum(homeHistory),
      strength: WorldEngine.calcStrength(homeHistory),
      fatigue: WorldEngine.calcFatigue(homeHistory),
      history: homeHistory,
   };

   const awayStats: TeamStats = {
      id: match.awayTeamId,
      name: match.away_team.full_name,
      shortName: match.away_team.short_name,
      momentum: WorldEngine.calcMomentum(awayHistory),
      strength: WorldEngine.calcStrength(awayHistory),
      fatigue: WorldEngine.calcFatigue(awayHistory),
      history: awayHistory,
   };

   // 3. STORYLINE SIMULATION (NARRATIVE GENERATION)
   const simulation = WorldEngine.runMatchSimulation(homeStats, awayStats);
   const momentumHome = homeStats.momentum;
   const momentumAway = awayStats.momentum;

   // Probabilities are demoted to a simple tug-of-war visualization
   const winProbHome = (homeStats.strength * 0.6 + homeStats.momentum * 0.4) / 1.5;
   const winProbAway = (awayStats.strength * 0.6 + awayStats.momentum * 0.4) / 1.5;
   const totalProb = winProbHome + winProbAway;
   const finalHomeProb = winProbHome / totalProb;

   return (
      <div className="min-h-screen pb-32 bg-slate-950 text-slate-200 font-sans selection:bg-cyan-500/30 overflow-x-hidden">

         {/* NAV: GLOBAL INTEL HEADER */}
         <nav className="w-full border-b border-slate-900 bg-slate-950/90 backdrop-blur-xl sticky top-0 z-50 px-6">
            <div className="max-w-7xl mx-auto h-20 flex items-center justify-between">
               <Link href="/" className="flex items-center gap-4 group">
                  <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center border border-slate-800 group-hover:border-cyan-500/50 transition-all">
                     <ArrowLeft size={18} className="text-slate-400 group-hover:text-cyan-400" />
                  </div>
                  <span className="text-[11px] font-black tracking-[0.3em] uppercase text-slate-400 italic">Global Feed</span>
               </Link>
               <div className="flex flex-col items-end">
                  <h1 className="text-2xl font-black text-white italic tracking-tighter uppercase leading-none">
                     {match.home_team.short_name} <span className="text-slate-700 mx-1">V</span> {match.away_team.short_name}
                  </h1>
                  <span className="text-[9px] font-black text-slate-500 tracking-[0.4em] uppercase mt-1">War Room Analysis</span>
               </div>
            </div>
         </nav>

         <main className="max-w-5xl mx-auto px-6 py-12 space-y-12">

            {/* SECTION 1: HERO TUG-OF-WAR (WIN PROBABILITY) */}
            <section className="bg-slate-900/40 border border-slate-800 rounded-[3rem] p-10 md:p-16 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.7)]">
               <div className="flex justify-between items-end mb-12">
                  <div className="flex flex-col gap-2">
                     <div className="flex items-center gap-3">
                        <Target size={18} className="text-cyan-400" />
                        <span className="text-[11px] font-black text-cyan-400 uppercase tracking-[0.4em]">Win Probability</span>
                     </div>
                     <h2 className="text-4xl md:text-6xl font-black text-white italic uppercase tracking-tighter leading-none">
                        {finalHomeProb > 0.6 ? "HOME DOMINANCE" : finalHomeProb < 0.4 ? "ROAD PRESSURE" : "DEADLOCK ALERT"}
                     </h2>
                  </div>
                  <div className="text-right flex flex-col items-end">
                     <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1 italic">V9 Core Status</span>
                     <div className="px-4 py-1.5 rounded-full bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 text-[10px] font-black uppercase tracking-widest animate-pulse">
                        LIVE FEED
                     </div>
                  </div>
               </div>

               <div className="relative h-24 w-full bg-slate-950 rounded-full border border-slate-800/50 flex items-center p-2 overflow-hidden shadow-inner">
                  <div
                     className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-l-full transition-all duration-1000 ease-out flex items-center justify-start pl-10"
                     style={{ width: `${finalHomeProb * 100}%` }}
                  >
                     <span className="text-3xl font-black text-black italic">{(finalHomeProb * 100).toFixed(0)}%</span>
                  </div>
                  <div className="w-1.5 h-full bg-slate-950/50 z-10" />
                  <div className="h-full bg-slate-800 rounded-r-full transition-all duration-1000 ease-out flex items-center justify-end pr-10 flex-1">
                     <span className="text-3xl font-black text-slate-400 italic">{((1 - finalHomeProb) * 100).toFixed(0)}%</span>
                  </div>
               </div>

               <div className="flex justify-between mt-6 px-10">
                  <div className="flex flex-col items-start gap-1">
                     <span className="text-xl font-black text-white italic uppercase">{match.home_team.full_name}</span>
                     <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Primary Favorite</span>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                     <span className="text-xl font-black text-slate-400 italic uppercase">{match.away_team.full_name}</span>
                     <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Underdog Alert</span>
                  </div>
               </div>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">

               {/* SECTION 2: MOMENTUM BAR (PSYCHO ENGINE) */}
               <section className="bg-slate-950 border border-slate-800 rounded-[2.5rem] overflow-hidden p-10 space-y-8">
                  <div className="flex items-center gap-4">
                     <Activity size={24} className="text-cyan-400" />
                     <h3 className="text-xl font-black text-white italic uppercase tracking-widest">Momentum Engine</h3>
                  </div>

                  <div className="space-y-10">
                     <div className="space-y-4">
                        <div className="flex justify-between items-end">
                           <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{match.home_team.short_name} Surge</span>
                           <span className="text-2xl font-black text-white italic tracking-tighter">{(momentumHome * 10).toFixed(1)}</span>
                        </div>
                        <div className="h-4 w-full bg-slate-900 rounded-full border border-slate-800 overflow-hidden shadow-inner">
                           <div className="h-full bg-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.6)] transition-all duration-1000 ease-out" style={{ width: `${momentumHome * 100}%` }} />
                        </div>
                     </div>

                     <div className="space-y-4 pt-4">
                        <div className="flex justify-between items-end">
                           <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{match.away_team.short_name} Surge</span>
                           <span className="text-2xl font-black text-slate-400 italic tracking-tighter">{(momentumAway * 10).toFixed(1)}</span>
                        </div>
                        <div className="h-4 w-full bg-slate-900 rounded-full border border-slate-800 overflow-hidden shadow-inner">
                           <div className="h-full bg-slate-700 transition-all duration-1000 ease-out" style={{ width: `${momentumAway * 100}%` }} />
                        </div>
                     </div>
                  </div>

                  <div className="pt-8 border-t border-slate-900">
                     <div className="flex items-start gap-4 p-5 bg-cyan-400/5 rounded-2xl border border-cyan-400/10">
                        <TrendingUp size={20} className="text-cyan-400 shrink-0 mt-1" />
                        <p className="text-xs text-slate-400 leading-relaxed font-bold uppercase italic">
                           {simulation.marketSentiment.expert}
                        </p>
                     </div>
                  </div>
               </section>

               {/* SECTION 3: FATIGUE ALERT (BIO ENGINE) */}
               <section className="bg-slate-950 border border-slate-800 rounded-[2.5rem] overflow-hidden p-10 space-y-8">
                  <div className="flex items-center gap-4">
                     <Zap size={24} className="text-amber-500" />
                     <h3 className="text-xl font-black text-white italic uppercase tracking-widest">Bio Engine Core</h3>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                     <div className={`p-8 rounded-[2rem] border-2 flex flex-col gap-4 transition-all duration-500 ${homeStats.fatigue > 0.6 ? 'bg-red-500/10 border-red-500/30' : 'bg-emerald-500/10 border-emerald-500/30'}`}>
                        <div className="flex justify-between items-center">
                           <span className="text-[11px] font-black text-white uppercase tracking-widest">Home Battery</span>
                           <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] ${homeStats.fatigue > 0.6 ? 'bg-red-500 text-white' : 'bg-emerald-500 text-black'}`}>
                              {homeStats.fatigue > 0.6 ? 'FATIGUE ALERT' : 'OPTIMAL'}
                           </span>
                        </div>
                        <div className="flex items-end justify-between">
                           <span className="text-4xl font-black text-white italic leading-none">{((1 - homeStats.fatigue) * 100).toFixed(0)}%</span>
                           <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">ENERGY RESERVE</span>
                        </div>
                     </div>

                     <div className={`p-8 rounded-[2rem] border-2 flex flex-col gap-4 transition-all duration-500 ${awayStats.fatigue > 0.6 ? 'bg-red-500/10 border-red-500/30' : 'bg-emerald-500/10 border-emerald-500/30'}`}>
                        <div className="flex justify-between items-center">
                           <span className="text-[11px] font-black text-white uppercase tracking-widest">Away Battery</span>
                           <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] ${awayStats.fatigue > 0.6 ? 'bg-red-500 text-white' : 'bg-emerald-500 text-black'}`}>
                              {awayStats.fatigue > 0.6 ? 'FATIGUE ALERT' : 'OPTIMAL'}
                           </span>
                        </div>
                        <div className="flex items-end justify-between">
                           <span className="text-4xl font-black text-white italic leading-none">{((1 - awayStats.fatigue) * 100).toFixed(0)}%</span>
                           <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">ENERGY RESERVE</span>
                        </div>
                     </div>
                  </div>

                  {homeStats.fatigue > 0.7 || awayStats.fatigue > 0.7 ? (
                     <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                        <AlertTriangle size={20} className="text-red-500 animate-bounce" />
                        <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Bio-Physical Threshold Breach Detected</span>
                     </div>
                  ) : (
                     <div className="flex items-center gap-3 p-4 bg-slate-900 border border-slate-800 rounded-xl">
                        <CheckCircle size={20} className="text-slate-700" />
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest italic">System Nominal: No Physical Warnings</span>
                     </div>
                  )}
               </section>
            </div>

            {/* SECTION 4: NARRATIVE INTELLIGENCE */}
            <section className="bg-slate-900 border border-slate-800 rounded-[3rem] p-10 md:p-16 space-y-8">
               <div className="flex items-center gap-4">
                  <Shield size={24} className="text-yellow-500" />
                  <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">Storyline Intel</h3>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="space-y-6">
                     <p className="text-lg font-black text-white italic uppercase leading-relaxed tracking-tighter">
                        {simulation.standardAnalysis}
                     </p>
                     <div className="p-6 bg-slate-950 rounded-2xl border border-slate-800 italic text-slate-400 text-sm leading-relaxed font-medium">
                        "The V9 engine is detecting an {simulation.confidence > 0.6 ? 'extreme' : 'moderate'} correlation between {match.home_team.short_name}'s home form and recent defensive surges."
                     </div>
                  </div>
                  <div className="grid grid-cols-1 gap-6">
                     <div className="p-8 bg-slate-950 border border-slate-800 rounded-[2rem] flex flex-col gap-2">
                        <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Upset Index</span>
                        <span className="text-4xl font-black text-amber-500 italic uppercase">
                           {(Math.max((awayStats.strength / homeStats.strength) * 2, 1.1)).toFixed(1)}x
                        </span>
                        <span className="text-[9px] font-bold text-slate-600 uppercase italic">Likelihood vs Market Cap</span>
                     </div>
                     <div className="p-8 bg-slate-950 border border-slate-800 rounded-[2rem] flex flex-col gap-2">
                        <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Hype Rating</span>
                        <span className="text-4xl font-black text-white italic uppercase">
                           {((momentumHome + momentumAway) * 50).toFixed(0)}
                        </span>
                        <span className="text-[9px] font-bold text-slate-600 uppercase italic">Community & Social Volume</span>
                     </div>
                  </div>
               </div>
            </section>

         </main>

         {/* PANEL 3: EXECUTION TERMINAL (STICKY BOTTOM) */}
         <ExecutionTerminal signalId={match.id} />
      </div>
   );
}
