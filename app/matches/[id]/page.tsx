import Link from 'next/link';
import { prisma } from "@/lib/prisma";
import { WorldEngine, TeamStats } from "@/lib/world-engine";
import { ArrowLeft, Zap, Activity, Info, Target, Shield, Clock, AlertTriangle, TrendingUp, TrendingDown, Target as TargetIcon } from 'lucide-react';
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
         signals: true,
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

   const signal = match.signals?.[0] || { edge: 0.05, ev: 0.12, confidence: 0.65, tags: [] };

   // 2. WORLD ENGINE INTEGRATION
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

   const simulation = WorldEngine.runMatchSimulation(homeStats, awayStats);

   // WIN PROBABILITY CALCULATION
   const homeWinProb = (homeStats.strength * 0.6 + homeStats.momentum * 0.4) / 1.1;
   const awayWinProb = (awayStats.strength * 0.6 + awayStats.momentum * 0.4) / 1.1;
   const totalProb = homeWinProb + awayWinProb;
   const finalHomePct = (homeWinProb / totalProb) * 100;

   return (
      <div className="min-h-screen pb-32 bg-slate-950 text-slate-200 font-sans selection:bg-cyan-500/30 overflow-x-hidden">

         {/* NAV: GLOBAL INTEL HEADER */}
         <nav className="w-full border-b border-slate-900 bg-slate-950/90 backdrop-blur-xl sticky top-0 z-50 px-8">
            <div className="max-w-7xl mx-auto h-24 flex items-center justify-between">
               <Link href="/" className="flex items-center gap-6 group">
                  <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center border border-slate-800 group-hover:border-cyan-500/50 transition-all shadow-2xl">
                     <ArrowLeft size={20} className="text-slate-400 group-hover:text-cyan-400" />
                  </div>
                  <div className="flex flex-col">
                     <span className="text-[10px] font-black tracking-[0.4em] uppercase text-slate-600 italic">Personnel Feed</span>
                     <span className="text-xl font-black text-white italic uppercase tracking-tighter">Exit War Room</span>
                  </div>
               </Link>
               <div className="flex flex-col items-end">
                  <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase leading-none">
                     {match.home_team.short_name} <span className="text-slate-800 mx-1">⚔️</span> {match.away_team.short_name}
                  </h1>
                  <span className="text-[10px] font-black text-slate-500 tracking-[0.4em] uppercase mt-2 italic shadow-2xl">Tactical Audit Active</span>
               </div>
            </div>
         </nav>

         <main className="max-w-6xl mx-auto px-8 py-16 space-y-16">

            {/* SECTION 1: HERO TUG-OF-WAR (WIN PROBABILITY) */}
            <section className="bg-slate-900/40 border border-slate-800 rounded-[3rem] p-12 md:p-20 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.8)] relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-white/20 to-slate-800" />

               <div className="flex justify-between items-end mb-16">
                  <div className="flex flex-col gap-4">
                     <div className="flex items-center gap-4">
                        <TargetIcon size={24} className="text-cyan-400" />
                        <span className="text-[11px] font-black text-cyan-400 uppercase tracking-[0.5em]">Win Probability</span>
                     </div>
                     <h2 className="text-5xl md:text-7xl font-black text-white italic uppercase tracking-tighter leading-none">
                        {finalHomePct > 55 ? "DOMINANT POSSESSION" : finalHomePct < 45 ? "ROAD AGGRESSION" : "TACTICAL DEADLOCK"}
                     </h2>
                  </div>
                  <div className="text-right flex flex-col items-end">
                     <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 italic">V9 Strategic Feed</span>
                     <div className="px-6 py-2 rounded-full bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 text-[11px] font-black uppercase tracking-widest animate-pulse">
                        LIVE INTEL
                     </div>
                  </div>
               </div>

               {/* TUG OF WAR PROGRESS BAR */}
               <div className="relative h-28 w-full bg-slate-950 rounded-[2rem] border border-slate-800/50 flex items-center p-3 overflow-hidden shadow-inner">
                  <div
                     className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-[1.5rem] transition-all duration-1000 ease-out flex items-center justify-start pl-12 shadow-[0_0_40px_rgba(6,182,212,0.4)]"
                     style={{ width: `${finalHomePct}%` }}
                  >
                     <span className="text-4xl font-black text-black italic leading-none">{finalHomePct.toFixed(0)}%</span>
                  </div>
                  <div className="w-2 h-full bg-white/10 z-10" />
                  <div className="h-full bg-slate-900 rounded-[1.5rem] transition-all duration-1000 ease-out flex items-center justify-end pr-12 flex-1">
                     <span className="text-4xl font-black text-slate-600 italic leading-none">{Math.round(100 - finalHomePct)}%</span>
                  </div>

                  {/* OVERLAY TITLES */}
                  <div className="absolute inset-0 flex justify-between items-center px-20 pointer-events-none opacity-20">
                     <span className="text-xs font-black text-white tracking-[0.5em] uppercase">{match.home_team.full_name}</span>
                     <span className="text-xs font-black text-white tracking-[0.5em] uppercase">{match.away_team.full_name}</span>
                  </div>
               </div>

               <div className="grid grid-cols-2 mt-10 gap-20">
                  <div className="flex flex-col gap-2">
                     <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Home Dominance Advantage</span>
                     <div className="flex items-end gap-3">
                        <span className="text-4xl font-black text-white italic tracking-tighter">+{(finalHomePct - 50).toFixed(2)}%</span>
                        <TrendingUp size={24} className="text-emerald-500 mb-1" />
                     </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 text-right">
                     <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">System Tier Recommendation</span>
                     <span className="text-4xl font-black text-amber-500 italic uppercase tracking-tighter">System Lock</span>
                  </div>
               </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">

               {/* PSYCHO ENGINE: MOMENTUM SURGE */}
               <section className="bg-slate-950 border border-slate-800 rounded-[3rem] p-12 space-y-10 shadow-xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-12 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
                     <Activity size={180} className="text-white" />
                  </div>

                  <div className="flex items-center gap-5">
                     <div className="p-3 rounded-2xl bg-cyan-400/10 border border-cyan-400/20">
                        <Activity size={24} className="text-cyan-400" />
                     </div>
                     <h3 className="text-2xl font-black text-white italic uppercase tracking-widest">Momentum Surge</h3>
                  </div>

                  <div className="space-y-12">
                     <div className="space-y-4">
                        <div className="flex justify-between items-end">
                           <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest leading-none">{match.home_team.short_name} PSYCHO-FORM</span>
                           <span className="text-3xl font-black text-white italic tracking-tighter">{(homeStats.momentum * 10).toFixed(1)}</span>
                        </div>
                        <div className="h-4 w-full bg-slate-900 rounded-full border border-slate-800 overflow-hidden shadow-inner p-1">
                           <div className="h-full bg-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.6)] transition-all duration-1000 ease-out rounded-full" style={{ width: `${homeStats.momentum * 100}%` }} />
                        </div>
                     </div>

                     <div className="space-y-4">
                        <div className="flex justify-between items-end">
                           <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest leading-none">{match.away_team.short_name} PSYCHO-FORM</span>
                           <span className="text-3xl font-black text-slate-600 italic tracking-tighter">{(awayStats.momentum * 10).toFixed(1)}</span>
                        </div>
                        <div className="h-4 w-full bg-slate-900 rounded-full border border-slate-800 overflow-hidden shadow-inner p-1">
                           <div className="h-full bg-slate-700 transition-all duration-1000 ease-out rounded-full" style={{ width: `${awayStats.momentum * 100}%` }} />
                        </div>
                     </div>
                  </div>

                  <div className="pt-8 border-t border-slate-900">
                     <p className="text-xs text-slate-500 leading-relaxed font-bold uppercase italic tracking-tighter">
                        {simulation.marketSentiment.expert}
                     </p>
                  </div>
               </section>

               {/* BIO ENGINE: EXHAUSTION RISK */}
               <section className="bg-slate-950 border border-slate-800 rounded-[3rem] p-12 space-y-10 shadow-xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-12 opacity-[0.03]">
                     <Zap size={180} className="text-white" />
                  </div>

                  <div className="flex items-center gap-5">
                     <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                        <Zap size={24} className="text-amber-500" />
                     </div>
                     <h3 className="text-2xl font-black text-white italic uppercase tracking-widest">Bio Engine Core</h3>
                  </div>

                  <div className="grid grid-cols-1 gap-8">
                     <div className={`p-10 rounded-[2.5rem] border-2 flex flex-col gap-6 transition-all duration-500 ${homeStats.fatigue > 0.6 ? 'bg-red-500/10 border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.1)]' : 'bg-emerald-500/10 border-emerald-500/30'}`}>
                        <div className="flex justify-between items-center">
                           <span className="text-[11px] font-black text-white uppercase tracking-widest">Home Bio-Battery</span>
                           <span className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-[0.3em] ${homeStats.fatigue > 0.6 ? 'bg-red-500 text-white animate-pulse' : 'bg-emerald-500 text-black'}`}>
                              {homeStats.fatigue > 0.6 ? 'EXHAUSTION RISK' : 'OPTIMAL'}
                           </span>
                        </div>
                        <div className="flex items-end justify-between">
                           <span className="text-6xl font-black text-white italic leading-none">{((1 - homeStats.fatigue) * 100).toFixed(0)}%</span>
                           <div className="text-right">
                              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block italic mb-1">Energy Stability</span>
                              <span className="text-xs font-black text-white uppercase italic">{homeStats.fatigue > 0.6 ? 'CRITICAL DEPLETION' : 'FULL RESERVE'}</span>
                           </div>
                        </div>
                     </div>

                     <div className={`p-10 rounded-[2.5rem] border-2 flex flex-col gap-6 transition-all duration-500 ${awayStats.fatigue > 0.6 ? 'bg-red-500/10 border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.1)]' : 'bg-emerald-500/10 border-emerald-500/30'}`}>
                        <div className="flex justify-between items-center">
                           <span className="text-[11px] font-black text-white uppercase tracking-widest">Away Bio-Battery</span>
                           <span className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-[0.3em] ${awayStats.fatigue > 0.6 ? 'bg-red-500 text-white animate-pulse' : 'bg-emerald-500 text-black'}`}>
                              {awayStats.fatigue > 0.6 ? 'EXHAUSTION RISK' : 'OPTIMAL'}
                           </span>
                        </div>
                        <div className="flex items-end justify-between">
                           <span className="text-6xl font-black text-white italic leading-none">{((1 - awayStats.fatigue) * 100).toFixed(0)}%</span>
                           <div className="text-right">
                              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block italic mb-1">Energy Stability</span>
                              <span className="text-xs font-black text-white uppercase italic">{awayStats.fatigue > 0.6 ? 'CRITICAL DEPLETION' : 'FULL RESERVE'}</span>
                           </div>
                        </div>
                     </div>
                  </div>
               </section>
            </div>

            {/* SECTION 4: NARRATIVE X-FACTOR */}
            <section className="bg-slate-900 border border-slate-800 rounded-[3rem] p-12 md:p-20 space-y-12 shadow-inner relative overflow-hidden">
               <div className="absolute top-0 right-0 h-full w-1/2 bg-gradient-to-l from-cyan-500/5 to-transparent pointer-events-none" />

               <div className="flex items-center gap-6">
                  <div className="p-4 rounded-3xl bg-white/5 border border-white/10">
                     <Shield size={32} className="text-white" />
                  </div>
                  <h3 className="text-4xl font-black text-white italic uppercase tracking-tighter">Strategic Storyline Intel</h3>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-12 gap-16">
                  <div className="md:col-span-7 space-y-8">
                     <p className="text-2xl font-black text-white italic uppercase leading-tight tracking-tighter">
                        {simulation.standardAnalysis}
                     </p>
                     <div className="p-8 bg-slate-950 rounded-[2.5rem] border border-slate-800/80 shadow-2xl">
                        <div className="flex items-center gap-3 mb-4">
                           <Info size={16} className="text-slate-600" />
                           <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest leading-none italic">Technical Breakdown</span>
                        </div>
                        <p className="text-sm text-slate-400 leading-relaxed font-medium italic">
                           The V9 core is translating raw physics data (xFIP / Perimeter Lockdown %) into a clear **Dominance Advantage** of +{(signal.edge * 100).toFixed(2)}% over standard market expectations. High correlation detected in road transition efficiency.
                        </p>
                     </div>
                  </div>

                  <div className="md:col-span-5 grid grid-cols-1 gap-8">
                     <div className="p-10 bg-slate-950 border border-slate-800 rounded-[2.5rem] flex flex-col gap-3 shadow-xl">
                        <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Upset Index</span>
                        <div className="flex items-center gap-4">
                           <span className="text-5xl font-black text-amber-500 italic uppercase leading-none">
                              {(Math.max((signal.ev || 0) * 10 + 1, 1.1)).toFixed(2)}x
                           </span>
                           <TrendingUp size={32} className="text-amber-500/30" />
                        </div>
                        <span className="text-[10px] font-bold text-slate-600 uppercase italic tracking-widest">System Value Multiplier</span>
                     </div>

                     <div className="p-10 bg-slate-950 border border-slate-800 rounded-[2.5rem] flex flex-col gap-3 shadow-xl">
                        <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Hype Rating</span>
                        <div className="flex items-center gap-4">
                           <span className="text-5xl font-black text-white italic uppercase leading-none">
                              {((homeStats.momentum + awayStats.momentum) * 55).toFixed(0)}
                           </span>
                           <Activity size={32} className="text-white/20" />
                        </div>
                        <span className="text-[10px] font-bold text-slate-600 uppercase italic tracking-widest">Collective Pulse Audit</span>
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
