import Link from 'next/link';
import { prisma } from "@/lib/prisma";
import { ArrowLeft, User, BarChart, Shield, Target } from 'lucide-react';

export default async function PlayerVaultPage({ params }: { params: { id: string } }) {
  const { id } = await params;

  const player = await prisma.players.findUnique({
    where: { player_id: id },
    include: { team: true }
  });

  if (!player) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8">
        <h1 className="text-2xl font-black text-white uppercase tracking-widest mb-4">Player Not Found</h1>
        <Link href="/" className="text-cyan-400 font-mono text-xs uppercase tracking-widest hover:underline">Back to Radar</Link>
      </div>
    );
  }

  // Parse Multi-Role Stats
  const allStats = (player.stats as Record<string, any>) || {};
  const roles = Object.keys(allStats);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-cyan-500/30">
      
      {/* NAVIGATION */}
      <nav className="w-full border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <ArrowLeft size={16} className="text-slate-500 group-hover:text-cyan-400 transition-colors" />
            <span className="text-xs font-mono tracking-widest uppercase text-slate-400 group-hover:text-white">RADAR FEED</span>
          </Link>
          <div className="text-center">
             <span className="text-[10px] text-slate-500 font-mono tracking-[0.3em] uppercase underline decoration-cyan-500 underline-offset-8">Player Vault Archive</span>
          </div>
          <div className="w-24"></div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8 md:py-12">
        
        {/* PLAYER IDENTITY HERO */}
        <header className="flex flex-col md:flex-row items-center gap-8 mb-16 bg-slate-900/40 p-8 md:p-12 rounded-3xl border border-slate-800/50 shadow-2xl relative overflow-hidden">
           <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <User size={200} />
           </div>
           
           {/* TACTICAL AVATAR BOX (LARGE) */}
           <div className="w-32 h-32 md:w-40 md:h-40 bg-slate-950 border-4 border-cyan-500/40 rounded-xl flex flex-col items-center justify-center relative shadow-[0_0_30px_rgba(6,182,212,0.15)] group transition-all">
              <span className="text-5xl md:text-7xl font-black text-white">{player.number || "00"}</span>
              <div className="absolute -bottom-4 bg-cyan-500 text-black px-4 py-1 rounded font-black text-xs uppercase tracking-[0.2em] shadow-lg">
                 {player.position}
              </div>
           </div>

           <div className="flex-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-4 mb-2">
                 <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700 font-black uppercase tracking-widest">PRO ATHLETE</span>
                 <span className="text-[10px] text-cyan-400 font-mono tracking-widest uppercase">ID: {player.player_id.substring(0,8)}</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-white uppercase mb-2">{player.player_name}</h1>
              <div className="flex items-center justify-center md:justify-start gap-3">
                 <span className="text-lg font-black text-slate-400 uppercase tracking-tight">{player.team?.team_name || "Free Agent"}</span>
                 <span className="w-1.5 h-1.5 rounded-full bg-slate-800" />
                 <span className="text-sm font-mono text-slate-500 uppercase tracking-[0.2em]">Active Status: PRE-MATCH GRID</span>
              </div>
           </div>
        </header>

        {/* PERFORMANCE TREND CHART */}
        <div className="mb-16">
           <div className="flex items-center gap-4 mb-8">
              <Shield size={24} className="text-emerald-400" />
              <h2 className="text-xl font-black tracking-[0.3em] uppercase text-white">Last 5 Performance Trend</h2>
           </div>
           <div className="bg-slate-900/40 p-8 rounded-3xl border border-slate-800/50">
              <div className="flex items-end justify-between h-32 gap-2">
                 {[78, 92, 85, 95, 88].map((val, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer">
                       <div className="relative w-full bg-slate-800/50 rounded-t overflow-hidden flex items-end" style={{ height: '100%' }}>
                          <div 
                             className="w-full bg-cyan-500/40 group-hover:bg-cyan-400/60 transition-all duration-500" 
                             style={{ height: `${val}%` }} 
                          />
                          <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[10px] font-black text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity">
                             {val}
                          </div>
                       </div>
                       <span className="text-[8px] text-slate-600 font-mono font-black">GM {i+1}</span>
                    </div>
                 ))}
              </div>
              <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                 <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                    <span className="text-[8px] text-slate-500 font-mono uppercase tracking-widest block mb-1">Volatility Index</span>
                    <span className="text-xl font-black text-white">LOW</span>
                 </div>
                 <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                    <span className="text-[8px] text-slate-500 font-mono uppercase tracking-widest block mb-1">Reliability</span>
                    <span className="text-xl font-black text-emerald-400">92%</span>
                 </div>
                 <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                    <span className="text-[8px] text-slate-500 font-mono uppercase tracking-widest block mb-1">Usage Rate</span>
                    <span className="text-xl font-black text-white">34.2%</span>
                 </div>
                 <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                    <span className="text-[8px] text-slate-500 font-mono uppercase tracking-widest block mb-1">Story Bias</span>
                    <span className="text-xl font-black text-purple-400">POSITIVE</span>
                 </div>
              </div>
           </div>
        </div>

        {/* FULL SPECTRUM INTELLIGENCE GRID */}
        <div className="space-y-12">
           <div className="flex items-center gap-4 mb-8">
              <BarChart size={24} className="text-cyan-400" />
              <h2 className="text-xl font-black tracking-[0.3em] uppercase text-white">Multi-Role Archive</h2>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
              {roles.length === 0 ? (
                 <div className="col-span-full py-20 bg-slate-900/20 border border-dashed border-slate-800 rounded-3xl text-center">
                    <p className="text-slate-600 font-mono text-sm uppercase tracking-widest">No spectral role data available yet</p>
                 </div>
              ) : (
                 roles.map((role) => (
                    <section key={role} className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 md:p-10 relative overflow-hidden group hover:border-cyan-500/20 transition-all duration-300">
                       <div className="absolute top-0 right-0 bg-slate-950 border-l border-b border-slate-800 px-6 py-2 rounded-bl-2xl">
                          <span className="text-xs font-black text-cyan-400 tracking-widest">ROLE: [{role}]</span>
                       </div>
                       
                       <div className="flex items-center gap-4 mb-10">
                           <div className="w-10 h-10 bg-slate-950 border border-slate-800 rounded flex items-center justify-center">
                              <Target size={18} className="text-slate-500" />
                           </div>
                           <h3 className="text-sm font-black text-white uppercase tracking-widest">Season Performance</h3>
                       </div>

                       <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                          {Object.entries(allStats[role]).map(([key, val]: [string, any]) => (
                             <div key={key} className="flex flex-col bg-slate-950/50 p-4 rounded-xl border border-slate-800/50">
                                <span className="text-[10px] text-slate-600 font-mono uppercase tracking-widest mb-1">{key}</span>
                                <span className="text-2xl font-black text-white tracking-tighter">{val}</span>
                             </div>
                          ))}
                       </div>

                       {/* TACTICAL OVERLAY */}
                       <div className="mt-10 pt-6 border-t border-slate-800/50 opacity-0 group-hover:opacity-100 transition-opacity">
                          <p className="text-[10px] text-slate-500 leading-relaxed uppercase">
                             Role Intelligence categorized under Mosport Story Engine v2. Archive identifies [{role}] as high-impact variable.
                          </p>
                       </div>
                    </section>
                 ))
              )}
           </div>
        </div>

      </main>

      {/* FOOTER */}
      <footer className="w-full max-w-6xl mx-auto px-4 py-16 border-t border-slate-900 text-center opacity-30">
         <p className="text-[10px] text-slate-600 font-mono tracking-[0.5em] uppercase">
            Full Archive Ingestion • Mosport Terminal v2.5.1
         </p>
      </footer>
    </div>
  );
}
