import Link from 'next/link';
import { ArrowLeft, Zap, Activity, Target, Users } from 'lucide-react';
import EntityLogo from '@/src/components/EntityLogo';
import ExecutionTerminal from '@/components/ExecutionTerminal';

export const dynamic = 'force-dynamic';

async function getWarRoomData(id: string) {
   try {
      const base = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001';
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
         <div className="min-h-screen bg-[#020617] flex items-center justify-center">
            <h1 className="text-2xl text-slate-500 font-mono uppercase tracking-[0.5em] animate-pulse">[ WAR ROOM OFFLINE: SIGNAL NOT FOUND ]</h1>
         </div>
      );
   }

   const homeShort = liveData?.home_team?.short_name || 'HOME';
   const awayShort = liveData?.away_team?.short_name || 'AWAY';
   const status = liveData?.status || 'SCHEDULED';
   const isLive = status === 'IN_PLAY' || status === 'LIVE';

   return (
      <div className="min-h-screen pb-20 bg-[#020617] text-slate-200 font-sans selection:bg-cyan-500/30">
         <div className="w-full bg-[#070c14] border-b border-slate-900 pt-8 pb-10 px-6 md:px-12 mb-8">
            <div className="max-w-7xl mx-auto">
               <Link href="/" className="flex items-center gap-2 text-[9px] font-black text-slate-600 uppercase tracking-[0.4em] hover:text-cyan-400 transition-colors mb-8 group">
                  <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                  Radar Feed
               </Link>

               <div className="flex flex-wrap items-center justify-center w-full gap-4 md:gap-8 pt-4">
                  <div className="flex-1 flex items-center justify-center md:justify-end gap-4 md:gap-6 text-center min-w-[120px]">
                     <EntityLogo entityHash={homeShort === 'LAD' ? 'Mpt_A1X9' : homeShort === 'NYY' ? 'Mpt_B2Y8' : homeShort === 'ARS' ? 'Mpt_C3Z7' : 'UNKNOWN'} className="w-12 h-12 md:w-20 md:h-20" />
                     <div className="flex flex-col items-center md:items-end">
                        <h1 className="text-4xl md:text-5xl lg:text-7xl font-black text-white italic tracking-tighter uppercase leading-none">{homeShort}</h1>
                     </div>
                  </div>

                  <div className="flex flex-col items-center shrink-0 gap-1">
                     <span className="text-2xl font-black text-slate-800 italic">⚔️</span>
                     <span className={`text-[9px] font-black uppercase tracking-widest ${isLive ? 'text-red-400 animate-pulse' : 'text-slate-600'}`}>
                        {status}
                     </span>
                  </div>

                  <div className="flex-1 flex flex-row-reverse items-center justify-center md:justify-end gap-4 md:gap-6 text-center min-w-[120px]">
                     <EntityLogo entityHash={awayShort === 'LAD' ? 'Mpt_A1X9' : awayShort === 'NYY' ? 'Mpt_B2Y8' : awayShort === 'ARS' ? 'Mpt_C3Z7' : 'UNKNOWN'} className="w-12 h-12 md:w-20 md:h-20" />
                     <div className="flex flex-col items-center md:items-start">
                        <h1 className="text-4xl md:text-5xl lg:text-7xl font-black text-white italic tracking-tighter uppercase leading-none">{awayShort}</h1>
                     </div>
                  </div>
               </div>
            </div>
         </div>

         <main className="max-w-7xl mx-auto px-4 md:px-6 lg:px-12 text-center py-20">
            <div className="bg-[#0a111a] border border-slate-800 rounded-2xl p-12 shadow-2xl inline-block mx-auto">
               <Zap size={40} className="text-cyan-400 mx-auto mb-6" />
               <h2 className="text-2xl font-black text-white italic uppercase tracking-[0.2em] mb-4">V2 War Room Active</h2>
               <p className="text-slate-500 font-mono text-sm max-w-md mx-auto">
                  LIVE ANALYTICS STREAMING // SECURE ENTITY REGISTRY OBFUSCATION ENABLED // PENDING QUANT SETTLEMENT
               </p>
            </div>
         </main>
      </div>
   );
}
