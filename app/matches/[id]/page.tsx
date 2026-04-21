import Link from 'next/link';
import { ArrowLeft, Zap, Target, Activity, Shield, TrendingUp, AlertCircle, ChevronRight, Cpu } from 'lucide-react';
import EntityLogo from '@/src/components/EntityLogo';

export const dynamic = 'force-dynamic';

async function getWarRoomData(id: string) {
   try {
      const base = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
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
   const liveData = await getWarRoomData(id);

   if (!liveData) {
      return (
         <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-8">
            <h1 className="text-2xl font-black text-white uppercase tracking-[0.5em] animate-pulse glow-text mb-4">[ WAR ROOM OFFLINE ]</h1>
            <span className="text-slate-600 font-mono text-[10px] uppercase tracking-widest mb-8">SIGNAL_ID: {id} // STATUS: NOT_FOUND</span>
            <Link href="/" className="text-primary-container font-headline font-bold text-xs uppercase tracking-widest hover:underline">Return to Nexus</Link>
         </div>
      );
   }

   const hTeam = liveData.home_team;
   const aTeam = liveData.away_team;
   const hScore = liveData.home_score;
   const aScore = liveData.away_score;
   const hProb = liveData.win_probabilities?.home_win_prob || 0.5;
   const aProb = liveData.win_probabilities?.away_win_prob || 0.5;

   return (
      <div className="space-y-8 animate-in fade-in duration-700">

         {/* BREADCRUMB */}
         <div className="flex items-center gap-3 text-[10px] font-black text-slate-600 uppercase tracking-[0.4em]">
            <Link href="/" className="hover:text-primary-container transition-colors">Nexus</Link>
            <ChevronRight size={10} />
            <span className="text-slate-400">War Room</span>
            <ChevronRight size={10} />
            <span className="text-primary-container glow-text">{id}</span>
         </div>

         {/* MASSIVE SCOREBOARD */}
         <div className="w-full bg-[#0d1424] border border-white/5 rounded-[2.5rem] p-12 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none">
               <Target size={200} className="text-white" />
            </div>

            <div className="flex items-center justify-between gap-12 relative z-10">
               {/* Home Team */}
               <div className="flex-1 flex flex-col items-center gap-6">
                  <div className="w-32 h-32 bg-surface rounded-3xl border border-white/5 flex items-center justify-center p-4 relative group">
                     <div className="absolute inset-0 bg-primary-container/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                     <EntityLogo
                        entityHash={hTeam.short_name === 'LAD' ? 'Mpt_A1X9' : 'UNKNOWN'}
                        className="w-full h-full object-contain grayscale brightness-200 mix-blend-plus-lighter"
                     />
                  </div>
                  <div className="text-center space-y-2">
                     <h2 className="text-6xl font-headline font-black text-white italic tracking-tighter uppercase leading-none">{hTeam.short_name}</h2>
                     <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Home Territory</span>
                  </div>
               </div>

               {/* Score & VS */}
               <div className="flex flex-col items-center gap-4">
                  <div className="flex items-center gap-12 text-[120px] font-black font-headline text-white italic tracking-tighter leading-none select-none">
                     <span className={hScore >= aScore ? 'glow-text text-primary-container' : 'text-slate-700'}>{hScore}</span>
                     <div className="flex flex-col items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-800" />
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-800" />
                     </div>
                     <span className={aScore >= hScore ? 'glow-text text-primary-container' : 'text-slate-700'}>{aScore}</span>
                  </div>
                  <div className="px-6 py-2 bg-primary-container/10 border border-primary-container/20 rounded-full">
                     <span className="text-xs font-black text-primary-container uppercase tracking-[0.3em]">{liveData.status}</span>
                  </div>
               </div>

               {/* Away Team */}
               <div className="flex-1 flex flex-col items-center gap-6">
                  <div className="w-32 h-32 bg-surface rounded-3xl border border-white/5 flex items-center justify-center p-4 relative group">
                     <div className="absolute inset-0 bg-primary-container/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                     <EntityLogo
                        entityHash={aTeam.short_name === 'LAD' ? 'Mpt_A1X9' : 'UNKNOWN'}
                        className="w-full h-full object-contain grayscale brightness-200 mix-blend-plus-lighter"
                     />
                  </div>
                  <div className="text-center space-y-2">
                     <h2 className="text-6xl font-headline font-black text-white italic tracking-tighter uppercase leading-none">{aTeam.short_name}</h2>
                     <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Away Expedition</span>
                  </div>
               </div>
            </div>
         </div>

         {/* DATA GRID SECTION */}
         <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

            {/* LEFT: LIVE INTELLIGENCE PIPE */}
            <div className="lg:col-span-8 space-y-6">
               <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-3">
                     <Activity size={18} className="text-primary-container animate-pulse" />
                     <h3 className="text-lg font-black text-white italic uppercase tracking-tighter">Live Intelligence Pipeline</h3>
                  </div>
                  <span className="text-[9px] font-black text-slate-700 font-mono tracking-widest">ENCRYPTED_FEED_0x82</span>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <DataCard title="Tactical Analysis" items={liveData.standard_analysis} color="border-primary-container/30" />
                  <DataCard title="Matchup Vector" items={liveData.tactical_matchup} color="border-fuchsia-500/30" />
               </div>

               <div className="bg-[#0d1424] border border-white/5 rounded-3xl p-8 space-y-6 shadow-xl">
                  <div className="flex items-center gap-3">
                     <Cpu size={16} className="text-amber-400" />
                     <span className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em]">XGBOOST Model Weights</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                     <WeightMetric label="NEURAL_BIAS" value="0.842" />
                     <WeightMetric label="ENTROPY_GAP" value="-0.12" />
                     <WeightMetric label="ALPHA_SHIFT" value="+2.4%" />
                     <WeightMetric label="JITTER_VAL" value="0.005" />
                  </div>
               </div>
            </div>

            {/* RIGHT: SENTIMENT RADAR */}
            <div className="lg:col-span-4 space-y-6">
               <div className="bg-surface-bright/30 border border-white/5 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden h-fit sticky top-24">
                  <div className="radar-grid absolute inset-0 opacity-[0.03] pointer-events-none" />

                  <div className="flex items-center gap-3 mb-10">
                     <TrendingUp size={18} className="text-primary-container" />
                     <h3 className="text-lg font-black text-white italic uppercase tracking-tighter">Sentiment Radar</h3>
                  </div>

                  <div className="relative w-full aspect-square flex items-center justify-center">
                     <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_20px_rgba(0,238,252,0.3)]">
                        <circle cx="50" cy="50" r="45" fill="none" stroke="#ffffff05" strokeWidth="0.5" />
                        <circle cx="50" cy="50" r="30" fill="none" stroke="#ffffff05" strokeWidth="0.5" />
                        <circle cx="50" cy="50" r="15" fill="none" stroke="#ffffff05" strokeWidth="0.5" />
                        <line x1="50" y1="5" x2="50" y2="95" stroke="#ffffff08" strokeWidth="0.5" />
                        <line x1="5" y1="50" x2="95" y2="50" stroke="#ffffff08" strokeWidth="0.5" />

                        <polygon
                           points="50,15 85,50 50,85 15,50"
                           className="fill-primary-container/10 stroke-primary-container stroke-[1] animate-pulse"
                        />
                     </svg>
                     <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center group cursor-help">
                           <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Win Prob</p>
                           <p className="text-4xl font-headline font-black text-white italic glow-text">{(hProb * 100).toFixed(1)}%</p>
                        </div>
                     </div>
                  </div>

                  <div className="mt-10 space-y-4">
                     <div className="flex justify-between items-center p-5 bg-surface rounded-2xl border border-white/5">
                        <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest">Crowd Sentiment</span>
                        <span className="text-xl font-black text-primary-container italic">0.742</span>
                     </div>
                     <p className="text-[8px] font-mono text-slate-600 text-center uppercase tracking-widest opacity-50">
                        LATENT_SPACE_VERSION: v2.4a // RELIABILITY: HIGH
                     </p>
                  </div>
               </div>
            </div>

         </div>

      </div>
   );
}

function DataCard({ title, items, color }: { title: string, items: string[], color: string }) {
   return (
      <div className={`bg-[#0d1424] border ${color} rounded-3xl p-6 space-y-4 shadow-xl group hover:border-white/20 transition-all`}>
         <div className="flex items-center justify-between">
            <span className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] italic">{title}</span>
            <div className="w-1.5 h-1.5 rounded-full bg-slate-800 group-hover:bg-primary-container transition-colors" />
         </div>
         <div className="space-y-3">
            {items.map((item, i) => (
               <div key={i} className="flex items-start gap-3">
                  <div className="mt-1.5 w-1 h-1 bg-slate-800 rounded-full shrink-0" />
                  <p className="text-[11px] font-mono text-slate-400 leading-relaxed uppercase">{item}</p>
               </div>
            ))}
         </div>
      </div>
   );
}

function WeightMetric({ label, value }: { label: string, value: string }) {
   return (
      <div className="flex flex-col gap-1 text-center">
         <span className="text-[8px] font-black text-slate-700 uppercase tracking-widest">{label}</span>
         <span className="text-base font-headline font-bold text-white italic glow-text">{value}</span>
      </div>
   );
}
