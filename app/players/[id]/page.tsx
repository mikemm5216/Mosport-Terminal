import Link from 'next/link';
import { prisma } from "@/lib/prisma";
import { ArrowLeft, Zap, Target, Activity, Shield, Info, TrendingUp, AlertCircle } from 'lucide-react';

export default async function PlayerDossierPage({ params }: { params: { id: string } }) {
   const { id } = await params;

   const player = await (prisma as any).player.findUnique({
      where: { player_id: id },
      include: {
         stats_nba: true,
         stats_mlb: true,
         stats_soccer: true
      }
   });

   if (!player) {
      return (
         <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8">
            <h1 className="text-2xl font-black text-white uppercase tracking-widest mb-4">Dossier Locked</h1>
            <Link href="/" className="text-cyan-400 font-mono text-xs uppercase tracking-widest hover:underline">Return to Hub</Link>
         </div>
      );
   }

   // Mock Bio-Radar Data
   const bioData = [
      { label: 'POWER', value: 88 },
      { label: 'SPEED', value: 94 },
      { label: 'DURABILITY', value: 72 },
      { label: 'CLUTCH', value: 96 },
      { label: 'IQ', value: 85 },
      { label: 'PRECISION', value: 91 }
   ];

   return (
      <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-cyan-500/30 overflow-x-hidden pb-40">

         {/* NAV: PLAYER INTEL HEADER */}
         <nav className="w-full border-b border-slate-900 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-50 px-8">
            <div className="max-w-7xl mx-auto h-24 flex items-center justify-between">
               <Link href="/" className="flex items-center gap-6 group">
                  <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center border border-slate-800 group-hover:border-cyan-500/50 transition-all shadow-2xl">
                     <ArrowLeft size={20} className="text-slate-400 group-hover:text-cyan-400" />
                  </div>
                  <div className="flex flex-col">
                     <span className="text-[10px] font-black tracking-[0.4em] uppercase text-slate-500 italic">Personnel Index</span>
                     <span className="text-xl font-black text-white italic uppercase tracking-tighter">Back to Radar</span>
                  </div>
               </Link>
               <div className="flex flex-col items-end">
                  <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase leading-none">{player.display_name}</h1>
                  <span className="text-[10px] font-black text-emerald-400 tracking-[0.5em] uppercase mt-2">ATHLETIC DOSSIER ACTIVE</span>
               </div>
            </div>
         </nav>

         <main className="max-w-6xl mx-auto px-8 py-16 grid grid-cols-1 lg:grid-cols-12 gap-16">

            {/* LEFT: BIO-ATHLETIC RADAR */}
            <div className="lg:col-span-5 space-y-12">
               <section className="bg-slate-900/40 border border-slate-800 rounded-[3rem] p-10 shadow-2xl relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent pointer-events-none" />

                  <div className="flex items-center gap-4 mb-12">
                     <Activity size={24} className="text-cyan-400" />
                     <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">Bio-Athletic Radar</h2>
                  </div>

                  <div className="relative w-full aspect-square flex items-center justify-center bg-slate-950/30 rounded-full border border-slate-800/50 p-12">
                     {/* Grid */}
                     {[0.2, 0.4, 0.6, 0.8, 1].map(r => (
                        <div key={r} className="absolute border border-slate-800/30 rounded-full" style={{ width: `${r * 100}%`, height: `${r * 100}%` }} />
                     ))}

                     <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_15px_rgba(6,182,212,0.4)]">
                        <polygon
                           points={bioData.map((d, i) => {
                              const angle = (i / bioData.length) * 2 * Math.PI - Math.PI / 2;
                              const r = (d.value / 100) * 45;
                              return `${50 + r * Math.cos(angle)},${50 + r * Math.sin(angle)}`;
                           }).join(' ')}
                           className="fill-cyan-400/20 stroke-cyan-400 stroke-[0.5] transition-all duration-700"
                        />
                        {bioData.map((_, i) => {
                           const angle = (i / bioData.length) * 2 * Math.PI - Math.PI / 2;
                           return <line key={i} x1="50" y1="50" x2={50 + 45 * Math.cos(angle)} y2={50 + 45 * Math.sin(angle)} className="stroke-slate-800 stroke-[0.2]" />;
                        })}
                     </svg>

                     {/* Labels */}
                     {bioData.map((d, i) => {
                        const angle = (i / bioData.length) * 2 * Math.PI - Math.PI / 2;
                        return (
                           <div key={i} className="absolute text-[9px] font-black text-slate-400 uppercase tracking-widest" style={{
                              left: `${50 + 52 * Math.cos(angle)}%`,
                              top: `${50 + 52 * Math.sin(angle)}%`,
                              transform: 'translate(-50%, -50%)'
                           }}>
                              {d.label}
                           </div>
                        );
                     })}
                  </div>

                  <div className="mt-12 grid grid-cols-2 gap-4">
                     <div className="p-6 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col items-center">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Clutch Factor</span>
                        <span className="text-3xl font-black text-amber-500 italic">96.8</span>
                     </div>
                     <div className="p-6 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col items-center">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">System Tier</span>
                        <span className="text-3xl font-black text-white italic uppercase">S+</span>
                     </div>
                  </div>
               </section>
            </div>

            {/* RIGHT: ATHLETIC INTELLIGENCE & STATS */}
            <div className="lg:col-span-7 space-y-12">

               <section className="bg-slate-950 border border-slate-800 rounded-[3rem] p-12 space-y-10 shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                     <Target size={180} className="text-white" />
                  </div>

                  <div className="flex items-center gap-4">
                     <Zap size={24} className="text-amber-400" />
                     <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">Performance Dominance</h2>
                  </div>

                  <div className="space-y-8">
                     <div className="p-8 bg-slate-900/40 rounded-3xl border border-slate-800 flex flex-col gap-4">
                        <div className="flex justify-between items-center">
                           <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest italic">Position Maturity</span>
                           <TrendingUp size={16} className="text-emerald-500" />
                        </div>
                        <p className="text-lg font-black text-white italic uppercase leading-relaxed tracking-tighter">
                           Exhibits world-class rotational awareness and high-volume output in high-leverage scenarios.
                        </p>
                        <div className="pt-4 border-t border-slate-800 flex items-center gap-3">
                           <Info size={14} className="text-slate-600" />
                           <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic leading-none">V13 Core: High Statistical Robustness Detected</span>
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="p-6 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col gap-1">
                           <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Physics Core</span>
                           <span className="text-xl font-black text-white italic">{player.position_main}</span>
                        </div>
                        <div className="p-6 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col gap-1">
                           <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Active Status</span>
                           <span className="text-xl font-black text-emerald-400 italic">NOMINAL</span>
                        </div>
                        <div className="p-6 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col gap-1">
                           <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Nationality</span>
                           <span className="text-xl font-black text-white italic">{player.nationality || 'GOS'}</span>
                        </div>
                     </div>
                  </div>
               </section>

               {/* RECENT INTEL LOGS */}
               <section className="space-y-6">
                  <div className="flex items-center gap-3 px-4">
                     <AlertCircle size={16} className="text-slate-700" />
                     <span className="text-[11px] font-black text-slate-600 uppercase tracking-[0.3em] italic">Personnel Audit Logs</span>
                  </div>
                  <div className="p-8 bg-slate-900/20 border-2 border-dashed border-slate-900 rounded-[3rem] text-center italic">
                     <span className="text-xs text-slate-700 font-bold uppercase tracking-widest">[ AWAITING HIGH-DEFINITION SNAPSHOTS ]</span>
                  </div>
               </section>

            </div>

         </main>

         {/* FOOTER: TERMINAL AUTH */}
         <footer className="w-full max-w-7xl mx-auto px-8 py-12 border-t border-slate-900/50 flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex flex-col">
               <span className="text-[11px] font-black text-white uppercase tracking-[0.3em] italic">MOSPORT PERSONNEL VAULT</span>
               <span className="text-[9px] text-slate-700 font-bold uppercase tracking-[0.2em] mt-1">Personnel Dossier V15.4 Active</span>
            </div>
            <div className="flex gap-12">
               <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">SCAN: READY</span>
               <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">INTEL: OPTIMAL</span>
               <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest hover:underline cursor-pointer">REQUEST DEEP SCAN</span>
            </div>
         </footer>

      </div>
   );
}
