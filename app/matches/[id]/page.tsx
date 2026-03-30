import Link from 'next/link';
import { prisma } from "@/lib/prisma";
import { ArrowLeft, Zap, Activity, Target } from 'lucide-react';
import ExecutionTerminal from '@/components/ExecutionTerminal';
import LogoFallback from '@/components/LogoFallback';

export default async function WarRoomPage({ params }: { params: { id: string } }) {
   const { id } = await params;

   // 1. DATA INGESTION
   let match = null;
   try {
      match = await (prisma as any).match.findUnique({
         where: { id: id },
         include: {
            home_team: true,
            away_team: true,
            signals: true
         }
      });
   } catch (e) {
      console.warn("[WAR ROOM] Database unavailable.");
   }

   // Dynamic Route Fallback 404 removed for UI verification (Patch 17.1 mandate).

   // ALPHA INTEL FALLBACK FOR DEMO
   const mockMatch = {
      id: 'EPL-CRY-WHU-001',
      home_team: { full_name: 'Crystal Palace', short_name: 'CRY', logo_url: '/logos/cry_hd.png' },
      away_team: { full_name: 'West Ham United', short_name: 'WHU', logo_url: '/logos/whu_hd.png' },
      signals: [{
         standard_analysis: ["Analysis 1", "Analysis 2", "Analysis 3"],
         tactical_matchup: ["Tactical 1", "Tactical 2", "Tactical 3"],
         x_factors: ["Factor 1", "Factor 2", "Factor 3"]
      }]
   };

   const displayMatch = match || mockMatch;
   const signal = displayMatch.signals?.[0] || {};

   return (
      <div className="min-h-screen pb-20 bg-[#020617] text-slate-200 font-sans selection:bg-cyan-500/30 overflow-x-hidden">
         {/* V17 INTEL HEADER */}
         <div className="w-full bg-[#070c14] border-b border-slate-900 pt-8 pb-10 px-12 mb-8">
            <div className="max-w-7xl mx-auto">
               <Link href="/" className="flex items-center gap-2 text-[9px] font-black text-slate-600 uppercase tracking-[0.4em] hover:text-cyan-400 transition-colors mb-8 group">
                  <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                  Radar Feed
               </Link>

               <div className="flex flex-row items-center justify-center w-full gap-4 md:gap-8 pt-4">
                  <div className="flex-1 flex items-center justify-end gap-6 text-center">
                     <LogoFallback url={displayMatch.home_team?.logo_url} name={displayMatch.home_team?.full_name} shortName={displayMatch.home_team?.short_name} size={80} />
                     <h1 className="text-5xl md:text-7xl font-black text-white italic tracking-tighter uppercase leading-none">{displayMatch.home_team?.short_name}</h1>
                  </div>
                  <span className="text-2xl font-black text-slate-800 italic px-2">⚔️</span>
                  <div className="flex-1 flex flex-row-reverse items-center justify-end gap-6 text-center">
                     <LogoFallback url={displayMatch.away_team?.logo_url} name={displayMatch.away_team?.full_name} shortName={displayMatch.away_team?.short_name} size={80} />
                     <h1 className="text-5xl md:text-7xl font-black text-white italic tracking-tighter uppercase leading-none">{displayMatch.away_team?.short_name}</h1>
                  </div>
               </div>
            </div>
         </div>

         {/* V17 WAR ROOM MAIN GRID (3 Columns - Perfectly Symmetrical) */}
         <main className="max-w-7xl mx-auto px-6 md:px-12">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
               {/* 1. STANDARD ANALYSIS */}
               <section className="bg-[#0a111a] border border-slate-800 rounded-2xl p-6 shadow-2xl relative group overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500 opacity-20 group-hover:opacity-100 transition-opacity" />
                  <div className="flex items-center gap-3 mb-4">
                     <Activity size={16} className="text-cyan-400" />
                     <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] italic">Standard Intelligence</h2>
                  </div>
                  <div className="space-y-3">
                     {(signal.standard_analysis || ["ANALYZING PRIMARY VECTORS...", "COLLECTING DOMAIN DATA...", "SYNTHESIZING ALPHA..."]).map((node: string, i: number) => (
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
                     {(signal.tactical_matchup || ["EVALUATING SQUAD DEPTH...", "MAPPING TRANSITION STATES...", "DETERMINING EDGE..."]).map((node: string, i: number) => (
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
                     {(signal.x_factors || ["MONITORING ATMOSPHERICS...", "CALIBRATING MOMENTUM...", "ISOLATING OUTLIERS..."]).map((node: string, i: number) => (
                        <div key={i} className="flex gap-3">
                           <span className="text-[8px] font-black text-amber-500/40 mt-1">0{i + 1}</span>
                           <p className="text-[11px] font-bold text-slate-300 uppercase leading-relaxed tracking-tight">{node}</p>
                        </div>
                     ))}
                  </div>
               </section>
            </div>

            <div className="mt-8 shadow-2xl">
               <ExecutionTerminal signalId={displayMatch.id} />
            </div>
         </main>
      </div>
   );
}
