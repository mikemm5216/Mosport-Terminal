import Link from 'next/link';
import { prisma } from "@/lib/prisma";
import { WorldEngine, TeamStats } from "@/lib/world-engine";
import { ArrowLeft, Zap, Activity, User, Info, TrendingUp, TrendingDown, Target, Shield, CheckCircle, Eye, XCircle, BarChart3, Clock } from 'lucide-react';
import { getShortName } from '@/lib/teams';
import { formatLocalTime } from '@/lib/timezone';
import { generateFootballSignalV11_5 } from "@/lib/api/football_signal_engine_v11_5";
import { generateBaseballSignalV11_5 } from "@/lib/api/baseball_signal_engine_v11_5";
import ExecutionTerminal from '@/components/ExecutionTerminal';

export default async function WarRoomPage({ params }: { params: { id: string } }) {
   const { id } = await params;

   // 1. DATA INGESTION (V11.5 / V13 REFINED)
   const match = await (prisma as any).match.findUnique({
      where: { id: id },
      include: {
         home_team: true,
         away_team: true,
         league: true,
         snapshots: {
            orderBy: { created_at: 'desc' },
            take: 10 // For CLV Trend
         },
         odds: {
            orderBy: { fetched_at: 'desc' },
            take: 1
         }
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

   // 2. V11.5 ENGINE EXECUTION (SERVER-SIDE TRUTH)
   const homeHistory = await prisma.matchHistory.findMany({ where: { team_id: match.homeTeamId }, orderBy: { date: 'desc' }, take: 20 });
   const awayHistory = await prisma.matchHistory.findMany({ where: { team_id: match.awayTeamId }, orderBy: { date: 'desc' }, take: 20 });

   const pModel = [0.75, 0.15, 0.10]; // Mocking model probs for demo if not in DB
   const currentOdds = (match.odds?.[0]?.odds_json as any)?.main || [2.0, 3.5, 4.0];

   let signalData: any;
   if (match.sport === 'football') {
      signalData = generateFootballSignalV11_5(match.id, pModel as [number, number, number], currentOdds, match.updatedAt, match.date);
   } else if (match.sport === 'baseball') {
      signalData = generateBaseballSignalV11_5(match.id, [pModel[0], pModel[2]], [currentOdds[0], currentOdds[2]], match.updatedAt, match.date);
   } else {
      // Fallback for NBA/others
      signalData = {
         signalId: match.id,
         edge: 0.062,
         ev: 0.12,
         confidence: 0.65,
         probs: { win: 0.75, draw: 0.15, loss: 0.10 },
         marketFairProbs: { win: 0.70, draw: 0.15, loss: 0.15 },
         tags: ["SMART_VALUE"],
         modelVersion: "V11.5",
         signal: "STRONG"
      };
   }

   // 3. STRATEGY CLUSTER (V12.0 / V15 Refined)
   const cluster = await (prisma as any).strategyBacktestResult.findFirst({
      where: {
         league: match.league?.id || 'GLOBAL',
         strategyType: 'WEIGHTED'
      }
   }) || {
      simulatedROI: 0.084,
      sharpeRatio: 1.42,
      maxDrawdown: 0.12,
      robustness: "ELITE_ELITE"
   };

   // 4. WORLD ENGINE DERIVATIVES (PSYCHO/BIO)
   const homeStats: TeamStats = {
      id: match.homeTeamId,
      name: match.homeTeamName,
      shortName: match.homeTeamName.substring(0, 3).toUpperCase(),
      momentum: WorldEngine.calcMomentum(homeHistory),
      strength: WorldEngine.calcStrength(homeHistory),
      fatigue: WorldEngine.calcFatigue(homeHistory),
      history: homeHistory,
   };

   const awayStats: TeamStats = {
      id: match.awayTeamId,
      name: match.awayTeamName,
      shortName: match.awayTeamName.substring(0, 3).toUpperCase(),
      momentum: WorldEngine.calcMomentum(awayHistory),
      strength: WorldEngine.calcStrength(awayHistory),
      fatigue: WorldEngine.calcFatigue(awayHistory),
      history: awayHistory,
   };

   const simulation = WorldEngine.runMatchSimulation(homeStats, awayStats);

   // CLV Trend Logic (Renamed to Trend Analysis)
   const trendPath = match.snapshots.map((s: any) => (s.state_json as any)?.edge || 0).reverse();
   const isStrengthening = trendPath.length > 1 && trendPath[trendPath.length - 1] > trendPath[0];

   return (
      <div className="min-h-screen pb-32 bg-slate-950 text-slate-200 font-sans selection:bg-cyan-500/30">
         {/* HEADER: MOSPORT MEDIA V15.0 */}
         <nav className="w-full border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 px-4">
            <div className="max-w-7xl mx-auto h-16 flex items-center justify-between">
               <Link href="/" className="flex items-center gap-2 group">
                  <ArrowLeft size={16} className="text-slate-500 group-hover:text-cyan-400 transition-colors" />
                  <span className="text-[10px] font-black tracking-widest uppercase text-slate-400">MATCH INTEL</span>
               </Link>
               <div className="flex items-center gap-4">
                  <div className="flex flex-col items-end">
                     <span className="text-[10px] font-black text-white italic tracking-tighter uppercase">{match.homeTeamName} VS {match.awayTeamName}</span>
                     <span className="text-[8px] text-slate-500 font-mono tracking-widest">{match.id}</span>
                  </div>
                  <div className="w-1 h-8 bg-slate-800" />
                  <span className="text-[9px] font-black text-cyan-400 bg-cyan-400/10 px-2 py-1 rounded border border-cyan-400/20">PREDICTIVE AI</span>
               </div>
            </div>
         </nav>

         <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">

            {/* WIN PROBABILITY TUG-OF-WAR */}
            <section className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-8">
               <div className="flex justify-between items-center mb-6">
                  <div className="flex flex-col">
                     <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">Win Probability</span>
                     <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">Strategic Equilibrium</h2>
                  </div>
                  <div className="text-right">
                     <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Upset Alert</span>
                     <span className={`text-xs font-bold ${signalData.ev > 0.1 ? 'text-amber-400 animate-pulse' : 'text-slate-600'}`}>
                        {signalData.ev > 0.1 ? 'HIGH POTENTIAL' : 'STABLE MATCHUP'}
                     </span>
                  </div>
               </div>

               <div className="relative h-16 w-full bg-slate-800/40 rounded-full border border-slate-700/50 flex items-center px-2 overflow-hidden">
                  {/* TUG OF WAR BARS */}
                  <div className="h-12 bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-l-full flex items-center justify-start pl-6 transition-all duration-1000" style={{ width: `${signalData.probs.win * 100}%` }}>
                     <span className="text-lg font-black text-black">{(signalData.probs.win * 100).toFixed(0)}%</span>
                  </div>
                  <div className="w-1 h-full bg-white/20 z-10" />
                  <div className="h-12 bg-gradient-to-l from-slate-600 to-slate-400 rounded-r-full flex items-center justify-end pr-6 flex-1 transition-all duration-1000">
                     <span className="text-lg font-black text-black">{((1 - signalData.probs.win) * 100).toFixed(0)}%</span>
                  </div>

                  {/* TEAM OVERLAYS */}
                  <div className="absolute inset-0 flex justify-between items-center px-12 pointer-events-none">
                     <span className="text-[10px] font-black text-white tracking-[0.3em] uppercase opacity-40">{match.homeTeamName.substring(0, 3)}</span>
                     <span className="text-[10px] font-black text-white tracking-[0.3em] uppercase opacity-40">{match.awayTeamName.substring(0, 3)}</span>
                  </div>
               </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
               {/* LEFT: PSYCHO & BIO ENGINE */}
               <div className="lg:col-span-2 space-y-8">
                  {/* PSYCHO ENGINE PANEL */}
                  <div className="bg-slate-950 border border-slate-800 rounded-lg overflow-hidden">
                     <div className="bg-slate-900/50 px-6 py-3 border-b border-slate-800 flex items-center gap-3">
                        <Activity size={18} className="text-cyan-400" />
                        <h3 className="text-xs font-black tracking-[0.2em] uppercase text-slate-400">Psycho Engine: Momentum Analysis</h3>
                     </div>
                     <div className="p-6 grid grid-cols-2 gap-8">
                        <div className="space-y-4">
                           <div className="flex justify-between items-center">
                              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Team Momentum</span>
                              <span className="text-xs font-bold text-white">{(homeStats.momentum * 10).toFixed(1)} / 10</span>
                           </div>
                           <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                              <div className="h-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)] transition-all duration-700" style={{ width: `${homeStats.momentum * 100}%` }} />
                           </div>
                           <p className="text-[10px] text-slate-400 italic leading-relaxed">
                              {homeStats.momentum > 0.6 ? "High surge detected. Mentally primed for dominance." : "Stable psychological baseline maintained."}
                           </p>
                        </div>
                        <div className="space-y-4">
                           <div className="flex justify-between items-center">
                              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Energy Status</span>
                              <span className={`text-xs font-bold ${homeStats.fatigue > 0.7 ? 'text-red-400' : 'text-emerald-400'}`}>
                                 {homeStats.fatigue > 0.7 ? 'FATIGUE ALERT' : 'OPTIMAL'}
                              </span>
                           </div>
                           <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                              <div className={`h-full transition-all duration-700 ${homeStats.fatigue > 0.7 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${(1 - homeStats.fatigue) * 100}%` }} />
                           </div>
                           <p className="text-[10px] text-slate-400 italic leading-relaxed">
                              {homeStats.fatigue > 0.7 ? "Physical breakdown imminent. High rotation risk." : "Full bio-battery recovery confirmed."}
                           </p>
                        </div>
                     </div>
                  </div>

                  {/* BIO ENGINE PANEL: X-FACTOR MATCHUPS */}
                  <div className="bg-slate-950 border border-slate-800 rounded-lg overflow-hidden">
                     <div className="bg-slate-900/50 px-6 py-3 border-b border-slate-800 flex items-center gap-3">
                        <Zap size={18} className="text-amber-400" />
                        <h3 className="text-xs font-black tracking-[0.2em] uppercase text-slate-400">Bio Engine: X-Factor Matchups</h3>
                     </div>
                     <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-slate-900/40 rounded border border-slate-800 flex flex-col items-center text-center">
                           <Shield size={24} className="text-slate-500 mb-3" />
                           <span className="text-[9px] font-black text-white uppercase tracking-widest mb-1">Defense Guard</span>
                           <span className="text-xs font-bold text-emerald-400">+12% EDGE</span>
                           <span className="text-[8px] text-slate-500 mt-2 uppercase">Perimeter Lockdown</span>
                        </div>
                        <div className="p-4 bg-slate-900/40 rounded border border-slate-800 flex flex-col items-center text-center">
                           <Target size={24} className="text-cyan-400 mb-3" />
                           <span className="text-[9px] font-black text-white uppercase tracking-widest mb-1">Impact Scoring</span>
                           <span className="text-xs font-bold text-cyan-400">SUPERIOR</span>
                           <span className="text-[8px] text-slate-500 mt-2 uppercase">Deep Range Dominance</span>
                        </div>
                        <div className="p-4 bg-slate-900/40 rounded border border-slate-800 flex flex-col items-center text-center">
                           <Activity size={24} className="text-amber-400 mb-3" />
                           <span className="text-[9px] font-black text-white uppercase tracking-widest mb-1">Transition Speed</span>
                           <span className="text-xs font-bold text-amber-400">ELITE</span>
                           <span className="text-[8px] text-slate-500 mt-2 uppercase">Fast Break Conversion</span>
                        </div>
                     </div>
                  </div>
               </div>

               {/* RIGHT: INTEL SUMMARY & TRENDS */}
               <div className="space-y-8">
                  <div className="bg-slate-900/20 border border-slate-800/60 rounded-lg p-6 flex flex-col justify-between h-full">
                     <div>
                        <div className="flex items-center gap-2 mb-6">
                           <Info size={16} className="text-slate-500" />
                           <span className="text-[10px] font-black text-white uppercase tracking-widest">Storyline Alert</span>
                        </div>
                        <h4 className="text-xl font-black text-white italic uppercase tracking-tighter mb-4 leading-tight">
                           {simulation.primaryTag.replace(/_/g, ' ')}
                        </h4>
                        <p className="text-xs text-slate-400 leading-relaxed font-medium uppercase italic">
                           {simulation.standardAnalysis}
                        </p>
                     </div>

                     <div className="mt-12 pt-8 border-t border-slate-800">
                        <div className="flex justify-between items-center mb-6">
                           <div>
                              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Hype Score</span>
                              <span className="text-2xl font-black text-cyan-400 italic">{(signalData.confidence * 100).toFixed(1)} / 100</span>
                           </div>
                           <div className="text-right">
                              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Value Index</span>
                              <span className="text-2xl font-black text-white italic">+{(signalData.ev * 100).toFixed(1)}%</span>
                           </div>
                        </div>

                        <div className="space-y-3">
                           <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest block">Strategic Intelligence Trend</span>
                           <div className="w-full h-12 bg-slate-950 rounded flex items-end px-2 gap-1 border border-slate-800/40">
                              {trendPath.map((v: number, i: number) => (
                                 <div key={i} className={`flex-1 transition-all duration-500 ${isStrengthening ? 'bg-cyan-500/40' : 'bg-slate-700/40'}`} style={{ height: `${Math.max(10, v * 300)}%` }} />
                              ))}
                           </div>
                           <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest text-center block">Historical Trajectory Audit</span>
                        </div>
                     </div>
                  </div>
               </div>
            </div>

         </main>

         {/* PANEL 3: EXECUTION TERMINAL (STICKY BOTTOM) */}
         <ExecutionTerminal signalId={signalData.signalId || match.id} />
      </div>
   );
}
