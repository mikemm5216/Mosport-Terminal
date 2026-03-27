import Link from 'next/link';
import { prisma } from "@/lib/prisma";
import { ArrowLeft, User, Activity, Zap, Target, Star, TrendingUp, Info } from 'lucide-react';

export default async function PlayerDossierPage({ params }: { params: { id: string } }) {
   const { id } = await params;

   const player = await prisma.player.findUnique({
      where: { player_id: id },
      include: {
         stats_nba: true,
         stats_mlb: true,
         stats_soccer: true,
         rosters: {
            include: { team: true },
            orderBy: { season_year: 'desc' },
            take: 1
         }
      }
   });

   if (!player) {
      return (
         <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8">
            <h1 className="text-2xl font-black text-white uppercase tracking-widest mb-4">Dossier Classified</h1>
            <Link href="/" className="text-cyan-400 font-mono text-xs uppercase tracking-widest hover:underline">Return to Radar</Link>
         </div>
      );
   }

   const team = player.rosters[0]?.team;

   // MOCK BIO-RADAR & CLUTCH (V15.0 LOGIC)
   // In production, these would be derived from Stats_XXX
   const bio = {
      physical: 88,
      skill: 92,
      iq: 95,
      impact: 84,
      stamina: 79
   };

   const clutchFactor = 94.1;

   return (
      <div className="min-h-screen pb-32 bg-slate-950 text-slate-200 font-sans selection:bg-cyan-500/30">
         {/* HEADER */}
         <nav className="w-full border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 px-4">
            <div className="max-w-7xl mx-auto h-16 flex items-center justify-between">
               <Link href="/" className="flex items-center gap-2 group">
                  <ArrowLeft size={16} className="text-slate-500 group-hover:text-cyan-400 transition-colors" />
                  <span className="text-[10px] font-black tracking-widest uppercase text-slate-400">ATHLETE DOSSIER</span>
               </Link>
               <div className="flex items-center gap-4">
                  <span className="text-[9px] font-black text-cyan-400 bg-cyan-400/10 px-2 py-1 rounded border border-cyan-400/20 uppercase tracking-tighter italic">ELITE PROFILE</span>
               </div>
            </div>
         </nav>

         <main className="max-w-5xl mx-auto px-4 py-12">

            {/* PLAYER HERO SECTION */}
            <div className="flex flex-col lg:flex-row items-center lg:items-end gap-8 mb-16 relative">
               <div className="w-64 h-64 bg-slate-900 border-2 border-slate-800 rounded-lg overflow-hidden flex items-center justify-center relative group">
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent opacity-60" />
                  <User size={120} className="text-slate-700 group-hover:scale-110 transition-transform duration-500" />
                  <div className="absolute bottom-4 left-4 flex flex-col">
                     <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">ACTIVE STATUS</span>
                     <span className="text-xs font-bold text-emerald-400 italic uppercase tracking-tighter">VERIFIED ARCHIVE</span>
                  </div>
               </div>

               <div className="flex-1 text-center lg:text-left">
                  <div className="flex items-center justify-center lg:justify-start gap-4 mb-4">
                     <span className="px-2 py-0.5 bg-slate-800 text-[10px] font-black tracking-widest uppercase rounded">#{player.rosters[0]?.jersey_number || '00'}</span>
                     <span className="px-2 py-0.5 bg-slate-800 text-[10px] font-black tracking-widest uppercase rounded">{player.position_main}</span>
                     {team && <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{team.full_name}</span>}
                  </div>
                  <h1 className="text-6xl md:text-8xl font-black text-white italic uppercase tracking-tighter leading-none mb-2">
                     {player.display_name}
                  </h1>
                  <p className="text-xs text-slate-500 font-mono tracking-[0.4em] uppercase">{player.nationality || 'GLOBAL'} ATHLETE DNA</p>
               </div>

               {/* CLUTCH FACTOR GAUGE */}
               <div className="lg:absolute lg:top-0 lg:right-0 bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col items-center">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Clutch Factor Index</span>
                  <div className="relative w-24 h-24 flex items-center justify-center">
                     <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                        <path className="text-slate-800 fill-none stroke-current" strokeWidth="3" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        <path className="text-amber-400 fill-none stroke-current transition-all duration-1000" strokeWidth="3" strokeDasharray={`${clutchFactor}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                     </svg>
                     <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-xl font-black text-white">{clutchFactor.toFixed(0)}</span>
                        <span className="text-[8px] font-black text-amber-400 uppercase">APEX</span>
                     </div>
                  </div>
                  <span className="text-[8px] text-slate-500 uppercase mt-4 text-center">High-Leverage Execution Rate</span>
               </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
               {/* BIO-RADAR PANEL */}
               <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden p-8 flex flex-col items-center">
                  <div className="w-full flex items-center gap-3 mb-12">
                     <Star size={18} className="text-cyan-400" />
                     <h3 className="text-xs font-black tracking-[0.2em] uppercase text-white">Bio-Radar: Ability Matrix</h3>
                  </div>

                  <div className="relative w-64 h-64">
                     <svg className="w-full h-full p-2 overflow-visible" viewBox="0 0 100 100">
                        {[20, 40, 60, 80, 100].map(r => (
                           <circle key={r} cx="50" cy="50" r={r / 2} fill="none" stroke="#1e293b" strokeWidth="0.5" />
                        ))}
                        {[0, 72, 144, 216, 288].map(a => (
                           <line key={a} x1="50" y1="50" x2={50 + 50 * Math.cos((a - 90) * Math.PI / 180)} y2={50 + 50 * Math.sin((a - 90) * Math.PI / 180)} stroke="#1e293b" strokeWidth="0.5" />
                        ))}
                        <path
                           d={`
                              M ${50 + (bio.physical / 2) * Math.cos((-90) * Math.PI / 180)} ${50 + (bio.physical / 2) * Math.sin((-90) * Math.PI / 180)}
                              L ${50 + (bio.skill / 2) * Math.cos((-18) * Math.PI / 180)} ${50 + (bio.skill / 2) * Math.sin((-18) * Math.PI / 180)}
                              L ${50 + (bio.iq / 2) * Math.cos((54) * Math.PI / 180)} ${50 + (bio.iq / 2) * Math.sin((54) * Math.PI / 180)}
                              L ${50 + (bio.impact / 2) * Math.cos((126) * Math.PI / 180)} ${50 + (bio.impact / 2) * Math.sin((126) * Math.PI / 180)}
                              L ${50 + (bio.stamina / 2) * Math.cos((198) * Math.PI / 180)} ${50 + (bio.stamina / 2) * Math.sin((198) * Math.PI / 180)}
                              Z
                           `}
                           fill="rgba(34,211,238,0.2)"
                           stroke="#22d3ee"
                           strokeWidth="2"
                           className="transition-all duration-1000"
                        />
                     </svg>
                     <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase text-slate-500">Physical</span>
                     <span className="absolute top-1/4 -right-12 text-[10px] font-black uppercase text-slate-500">Skill</span>
                     <span className="absolute bottom-0 -right-4 text-[10px] font-black uppercase text-slate-500">IQ</span>
                     <span className="absolute bottom-0 -left-2 text-[10px] font-black uppercase text-slate-500">Impact</span>
                     <span className="absolute top-1/4 -left-12 text-[10px] font-black uppercase text-slate-500">Stamina</span>
                  </div>
               </div>

               {/* SEASON INTEL & STATS */}
               <div className="lg:col-span-2 space-y-8">
                  <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-8">
                     <div className="flex items-center gap-3 mb-8">
                        <TrendingUp size={18} className="text-emerald-400" />
                        <h3 className="text-xs font-black tracking-[0.2em] uppercase text-white">Season Trajectory Dossier</h3>
                     </div>

                     <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {player.stats_nba && (
                           <>
                              <div className="bg-slate-950 p-4 border border-slate-800 rounded">
                                 <span className="text-[9px] font-black text-slate-500 uppercase block mb-1">PTS/G</span>
                                 <span className="text-2xl font-black text-white">{player.stats_nba.pts || '0.0'}</span>
                              </div>
                              <div className="bg-slate-950 p-4 border border-slate-800 rounded">
                                 <span className="text-[9px] font-black text-slate-500 uppercase block mb-1">REB/G</span>
                                 <span className="text-2xl font-black text-white">{player.stats_nba.reb || '0.0'}</span>
                              </div>
                              <div className="bg-slate-950 p-4 border border-slate-800 rounded">
                                 <span className="text-[9px] font-black text-slate-500 uppercase block mb-1">AST/G</span>
                                 <span className="text-2xl font-black text-white">{player.stats_nba.ast || '0.0'}</span>
                              </div>
                              <div className="bg-slate-950 p-4 border border-slate-800 rounded flex items-center justify-center">
                                 <span className="text-[10px] font-black text-cyan-400 uppercase italic">LEVEL: ELITE</span>
                              </div>
                           </>
                        )}
                        {!player.stats_nba && (
                           <div className="col-span-4 py-8 text-center text-slate-600 font-black text-xs uppercase tracking-widest border-2 border-dashed border-slate-800/40 rounded italic">
                              [ REAL-TIME SEASON DATA PENDING ]
                           </div>
                        )}
                     </div>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-8 relative overflow-hidden">
                     <div className="absolute top-0 right-0 p-4 opacity-5">
                        <Info size={120} />
                     </div>
                     <span className="text-[10px] font-black text-white uppercase tracking-widest block mb-4">Strategic Interpretation</span>
                     <p className="max-w-xl text-sm text-slate-400 leading-relaxed uppercase italic font-medium">
                        This athlete presents a unique **High-IQ / Low-Friction** hybrid profile. Data indicates a superior ability to process high-velocity scenarios while maintaining 90th percentile skill output. Optimized for high-leverage deployments in the final quadrant.
                     </p>
                  </div>
               </div>
            </div>
         </main>
      </div>
   );
}
