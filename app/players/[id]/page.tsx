import Link from 'next/link';
import { prisma } from "@/lib/prisma";
import { ArrowLeft, Zap, Target, Activity, Shield, Info, TrendingUp, AlertCircle, Battery } from 'lucide-react';

export default async function PlayerDossierPage({ params }: { params: { id: string } }) {
   const { id } = await params;

   // 1. DATA INGESTION
   const player = await (prisma as any).player.findUnique({
      where: { player_id: id },
      include: {
         stats_nba: true,
         stats_mlb: true,
         stats_soccer: true
      }
   });

   if (!player && id !== 'P_OHTANI_GENESIS') {
      return (
         <div className="min-h-screen bg-[#05090f] flex flex-col items-center justify-center p-8">
            <h1 className="text-2xl font-black text-white uppercase tracking-widest mb-4">Dossier Locked</h1>
            <Link href="/" className="text-cyan-400 font-mono text-xs uppercase tracking-widest hover:underline">Return to Hub</Link>
         </div>
      );
   }

   // V15.5 MOCK FALLBACK FOR DEMO
   const mockPlayer = {
      player_id: 'P_OHTANI_GENESIS',
      display_name: 'SHOHEI OHTANI',
      position_main: 'DH / P',
      nationality: 'Japan',
      stats_mlb: { avg: 0.310, hr: 54, rbi: 130, era: 0, w: 0, so: 0 }
   };

   const displayPlayer = player || mockPlayer;

   // Mock Bio-Radar Data (image_7.png Reference)
   const bioData = [
      { label: 'POWER', value: 92 },
      { label: 'SPEED', value: 88 },
      { label: 'AGILITY', value: 85 },
      { label: 'DURABILITY', value: 78 },
      { label: 'CLUTCH', value: 96 },
      { label: 'PRECISION', value: 94 }
   ];

   const stats = displayPlayer.stats_mlb || { avg: 0.310, hr: 54, rbi: 130, era: 0, w: 0, so: 0 };

   return (
      <div className="min-h-screen bg-[#05090f] text-slate-200 font-sans selection:bg-cyan-500/30 overflow-x-hidden pb-40">

         {/* NAV: TOP BAR (image_7.png style) */}
         <nav className="w-full bg-[#070c14]/90 backdrop-blur-md border-b border-slate-900 px-12">
            <div className="max-w-7xl mx-auto h-20 flex items-center justify-between">
               <div className="flex items-center gap-10">
                  <div className="flex items-center gap-3">
                     <div className="w-6 h-6 bg-cyan-400 rounded flex items-center justify-center">
                        <Shield size={14} className="text-black" />
                     </div>
                     <span className="text-sm font-black text-white uppercase tracking-[0.2em] italic">Mosport</span>
                  </div>
                  <div className="flex items-center gap-8 border-l border-slate-800 pl-8">
                     <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-white cursor-pointer transition-colors flex items-center gap-2">
                        <Activity size={14} /> Radar
                     </span>
                     <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-white cursor-pointer transition-colors flex items-center gap-2">
                        <Shield size={14} /> Teams
                     </span>
                     <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-white cursor-pointer transition-colors flex items-center gap-2">
                        <TrendingUp size={14} /> Reports
                     </span>
                  </div>
               </div>
            </div>
         </nav>

         <main className="max-w-7xl mx-auto px-12 py-16 flex flex-col gap-12">

            <Link href="/" className="flex items-center gap-3 text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] hover:text-cyan-400 transition-colors group">
               <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
               Back to Radar
            </Link>

            {/* HERO SECTION (image_7.png BOX) */}
            <div className="w-full bg-[#0a111a] border border-slate-800 rounded-[3rem] p-16 flex items-center gap-16 relative overflow-hidden shadow-2xl">
               <div className="absolute top-0 right-0 p-16 opacity-5 pointer-events-none">
                  <Target size={240} className="text-white" />
               </div>

               {/* PLAYER NUMBER BOX */}
               <div className="w-40 h-40 bg-[#070c14] rounded-[2rem] border-2 border-cyan-500/50 flex items-center justify-center shadow-[0_0_50px_rgba(6,182,212,0.2)]">
                  <span className="text-8xl font-black text-white italic leading-none">17</span>
               </div>

               <div className="flex flex-col gap-4">
                  <h1 className="text-8xl font-black text-white italic uppercase tracking-tighter leading-none">{displayPlayer.display_name}</h1>
                  <div className="flex items-center gap-6">
                     <span className="text-xl font-black text-cyan-400 uppercase italic tracking-widest">{displayPlayer.position_main}</span>
                     <div className="w-1.5 h-1.5 rounded-full bg-slate-800" />
                     <span className="text-xl font-black text-slate-600 uppercase italic tracking-widest">LOS ANGELES DODGERS</span>
                  </div>
               </div>
            </div>

            {/* DATA GRID SECTION */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">

               {/* LEFT: TACTICAL OUTPUT GRID (image_7.png 6-grid) */}
               <div className="lg:col-span-8 space-y-12">
                  <div className="flex items-center gap-4 px-4">
                     <Activity size={24} className="text-emerald-400" />
                     <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">Tactical Output [2026]</h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                     <StatCard label="AVG" value={stats.avg?.toString() || '0.31'} />
                     <StatCard label="HR" value={stats.hr?.toString() || '54'} />
                     <StatCard label="RBI" value={stats.rbi?.toString() || '130'} />
                     <StatCard label="ERA" value={stats.era > 0 ? stats.era.toString() : 'null'} />
                     <StatCard label="W" value={stats.w > 0 ? stats.w.toString() : 'null'} />
                     <StatCard label="SO" value={stats.so > 0 ? stats.so.toString() : 'null'} />
                  </div>

                  {/* BIO-BATTERY PANEL (image_7.png BOTTOM LEFT) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="bg-[#0a111a] border border-slate-800 rounded-[2.5rem] p-10 space-y-8 shadow-xl">
                        <div className="flex items-center gap-4">
                           <Battery size={20} className="text-red-400" />
                           <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] italic">Bio-Battery & Status</span>
                        </div>
                        <div className="space-y-4">
                           <div className="flex justify-between items-end">
                              <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Fatigue Load</span>
                              <span className="text-xs font-black text-red-500 italic">24% (Optimal)</span>
                           </div>
                           <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                              <div className="h-full bg-red-400 w-1/4 shadow-[0_0_10px_rgba(248,113,113,0.4)]" />
                           </div>
                        </div>
                     </div>

                     <div className="bg-[#0a111a] border border-slate-800 rounded-[2.5rem] p-10 space-y-8 shadow-xl">
                        <div className="flex items-center gap-4">
                           <TrendingUp size={20} className="text-cyan-400" />
                           <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] italic">Recent Momentum</span>
                        </div>
                        <div className="flex items-end gap-2 h-16">
                           {[40, 60, 45, 90, 80, 100].map((h, i) => (
                              <div key={i} className="flex-1 bg-cyan-400/20 hover:bg-cyan-400 transition-colors rounded-t-lg" style={{ height: `${h}%` }} />
                           ))}
                        </div>
                     </div>
                  </div>
               </div>

               {/* RIGHT: BIO-RADAR (SVG) */}
               <div className="lg:col-span-4 bg-[#0a111a] border border-slate-800 rounded-[3rem] p-12 shadow-2xl relative overflow-hidden h-fit sticky top-32">
                  <div className="flex items-center gap-4 mb-12">
                     <Target size={24} className="text-cyan-400" />
                     <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">Bio-Athletic Radar</h2>
                  </div>

                  <div className="relative w-full aspect-square flex items-center justify-center py-12">
                     <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_20px_rgba(6,182,212,0.4)]">
                        <polygon
                           points={bioData.map((d, i) => {
                              const angle = (i / bioData.length) * 2 * Math.PI - Math.PI / 2;
                              const r = (d.value / 100) * 45;
                              return `${50 + r * Math.cos(angle)},${50 + r * Math.sin(angle)}`;
                           }).join(' ')}
                           className="fill-cyan-400/20 stroke-cyan-400 stroke-[1] transition-all duration-1000"
                        />
                        {bioData.map((_, i) => {
                           const angle = (i / bioData.length) * 2 * Math.PI - Math.PI / 2;
                           return <line key={i} x1="50" y1="50" x2={50 + 45 * Math.cos(angle)} y2={50 + 45 * Math.sin(angle)} className="stroke-slate-800 stroke-[0.2]" />;
                        })}
                     </svg>

                     {/* Stat Values at points */}
                     {bioData.map((d, i) => {
                        const angle = (i / bioData.length) * 2 * Math.PI - Math.PI / 2;
                        return (
                           <div key={i} className="absolute text-[8px] font-black text-slate-500 uppercase tracking-widest" style={{
                              left: `${50 + 52 * Math.cos(angle)}%`,
                              top: `${50 + 52 * Math.sin(angle)}%`,
                              transform: 'translate(-50%, -50%)'
                           }}>
                              {d.label}
                           </div>
                        );
                     })}
                  </div>

                  <div className="mt-12 space-y-4">
                     <div className="flex justify-between items-center p-6 bg-slate-950 rounded-2xl border border-slate-900">
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Composite Rating</span>
                        <span className="text-3xl font-black text-white italic">94.2</span>
                     </div>
                  </div>
               </div>

            </div>
         </main>
      </div>
   );
}

function StatCard({ label, value }: { label: string, value: string }) {
   return (
      <div className="bg-[#0a111a] border border-slate-800 rounded-[2.5rem] p-10 flex flex-col items-center justify-center gap-4 transition-all hover:border-cyan-500/30 hover:shadow-2xl group">
         <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] italic group-hover:text-slate-400 transition-colors">{label}</span>
         <span className="text-7xl font-black text-white italic leading-none tracking-tighter shadow-2xl">{value}</span>
      </div>
   );
}
