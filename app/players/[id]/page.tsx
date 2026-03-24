import Link from 'next/link';
import { prisma } from "@/lib/prisma";
import { ArrowLeft, User, Activity, Battery, TrendingUp, Brain, Map } from 'lucide-react';

export default async function PlayerProfilePage({ params }: { params: { id: string } }) {
  const { id } = await params;

  // 1. Fetch Player with correct schema relations
  const player = await prisma.player.findUnique({
    where: { player_id: id },
    include: {
      rosters: {
        where: { season_year: 2026 },
        include: { team: true }
      },
      stats_nba: true,
      stats_mlb: true,
      stats_soccer: true
    }
  });

  if (!player) return <div className="p-8 text-white font-mono uppercase">Signal Lost: Player Not Found</div>;

  const currentRoster = player.rosters[0];
  const team = currentRoster?.team;
  const stats = player.stats_nba || player.stats_mlb || player.stats_soccer || {};
  
  // Strip the 'player_id' from stats for clean rendering
  const displayStats = Object.entries(stats).filter(([k]) => k !== 'player_id');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-cyan-500/30 pb-12">
      <nav className="w-full border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 px-4">
        <div className="max-w-7xl mx-auto h-16 flex items-center justify-start gap-4">
          <Link href="/" className="flex items-center gap-2 group">
            <ArrowLeft size={16} className="text-slate-500 group-hover:text-cyan-400 transition-colors" />
            <span className="text-xs font-mono tracking-widest uppercase text-slate-400 group-hover:text-white">Back to Radar</span>
          </Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <header className="flex flex-col md:flex-row items-center md:items-start gap-6 mb-12 bg-slate-900/40 p-8 rounded-3xl border border-slate-800">
           <div className="w-32 h-32 bg-slate-950 border-2 border-cyan-500/50 rounded-xl flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.2)]">
              <span className="text-6xl font-black text-white">{currentRoster?.jersey_number || "00"}</span>
           </div>
           <div className="flex flex-col items-center md:items-start">
              <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter uppercase">{player.display_name}</h1>
              <div className="flex gap-4 mt-2">
                 <span className="text-cyan-400 font-mono text-sm tracking-widest uppercase">{player.position_main}</span>
                 <span className="text-slate-500 font-mono text-sm tracking-widest uppercase">|</span>
                 <span className="text-slate-400 font-mono text-sm tracking-widest uppercase">{team?.full_name || "Free Agent"}</span>
              </div>
           </div>
        </header>

        {/* TACTICAL OUTPUT GRID */}
        <section className="relative">
           <div className="flex items-center gap-3 mb-6 px-2">
              <Activity className="text-emerald-400" size={20} />
              <h2 className="text-lg md:text-xl font-black text-white tracking-[0.2em] uppercase">Tactical Output [{currentRoster?.season_year || "2026"}]</h2>
           </div>
           
           <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {Object.entries(player.stats_mlb || {}).filter(([k, v]) => k !== 'player_id' && v !== null && v !== undefined).map(([key, value]) => (
                <div key={`mlb-${key}`} className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-6 flex flex-col items-center justify-center hover:border-cyan-500/50 hover:bg-slate-900/80 transition-all group">
                   <span className="text-xs text-slate-500 font-mono tracking-[0.3em] uppercase mb-2 group-hover:text-cyan-400 transition-colors z-10">{key}</span>
                   <span className="text-3xl md:text-5xl font-black text-white tracking-tighter z-10">{String(value)}</span>
                </div>
              ))}
              
              {Object.entries(player.stats_nba || {}).filter(([k, v]) => k !== 'player_id' && v !== null && v !== undefined).map(([key, value]) => (
                <div key={`nba-${key}`} className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-6 flex flex-col items-center justify-center hover:border-orange-500/50 hover:bg-slate-900/80 transition-all group">
                   <span className="text-xs text-slate-500 font-mono tracking-[0.3em] uppercase mb-2 group-hover:text-orange-400 transition-colors z-10">NBA {key}</span>
                   <span className="text-3xl md:text-5xl font-black text-white tracking-tighter z-10">{String(value)}</span>
                </div>
              ))}

              {Object.entries(player.stats_soccer || {}).filter(([k, v]) => k !== 'player_id' && v !== null && v !== undefined).map(([key, value]) => (
                <div key={`soccer-${key}`} className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-6 flex flex-col items-center justify-center hover:border-emerald-500/50 hover:bg-slate-900/80 transition-all group">
                   <span className="text-xs text-slate-500 font-mono tracking-[0.3em] uppercase mb-2 group-hover:text-emerald-400 transition-colors z-10">SOCCER {key}</span>
                   <span className="text-3xl md:text-5xl font-black text-white tracking-tighter z-10">{String(value)}</span>
                </div>
              ))}
           </div>
        </section>

        {/* THE 4 HIGH-VALUE MODULES */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
           {/* MODULE 1: Bio-Battery & Health */}
           <section className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-2xl -mr-10 -mt-10" />
              <div className="flex items-center gap-3 mb-6">
                 <Battery className="text-rose-400" size={20} />
                 <h3 className="text-sm font-black text-white tracking-[0.2em] uppercase">Bio-Battery & Status</h3>
              </div>
              <div className="space-y-4">
                 <div>
                    <div className="flex justify-between text-[10px] font-mono tracking-widest uppercase mb-1">
                       <span className="text-slate-400">Fatigue Load</span><span className="text-rose-400">24% (OPTIMAL)</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden"><div className="w-1/4 h-full bg-rose-500 rounded-full" /></div>
                 </div>
                 <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between">
                    <span className="text-xs font-black text-emerald-400 tracking-widest uppercase">Medical Clearance</span>
                    <span className="text-xs font-black text-white bg-emerald-500/20 px-2 py-0.5 rounded">ACTIVE</span>
                 </div>
              </div>
           </section>

           {/* MODULE 2: Momentum & Form */}
           <section className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl -mr-10 -mt-10" />
              <div className="flex items-center gap-3 mb-6">
                 <TrendingUp className="text-cyan-400" size={20} />
                 <h3 className="text-sm font-black text-white tracking-[0.2em] uppercase">Recent Momentum</h3>
              </div>
              <div className="flex items-end justify-between h-16 gap-2">
                 {[40, 65, 50, 85, 95].map((val, i) => (
                    <div key={i} className="flex-1 bg-slate-800 rounded-t-sm relative group">
                       <div className="absolute bottom-0 w-full bg-cyan-400 rounded-t-sm transition-all duration-500 group-hover:bg-cyan-300" style={{ height: `${val}%` }} />
                    </div>
                 ))}
              </div>
              <div className="flex justify-between mt-2 text-[8px] text-slate-500 font-mono tracking-widest uppercase">
                 <span>L5 Games</span><span>Trending Up</span>
              </div>
           </section>

           {/* MODULE 3: Venue Mastery */}
           <section className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6">
              <div className="flex items-center gap-3 mb-4">
                 <Map className="text-amber-400" size={20} />
                 <h3 className="text-sm font-black text-white tracking-[0.2em] uppercase">Venue Mastery</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="text-[9px] text-slate-500 font-mono tracking-widest uppercase block mb-1">Home Turf</span>
                    <span className="text-lg font-black text-amber-400">+12% EFF</span>
                 </div>
                 <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="text-[9px] text-slate-500 font-mono tracking-widest uppercase block mb-1">Hostile/Away</span>
                    <span className="text-lg font-black text-slate-300">-4% EFF</span>
                 </div>
              </div>
           </section>

           {/* MODULE 4: AI Narrative */}
           <section className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6">
              <div className="flex items-center gap-3 mb-4">
                 <Brain className="text-indigo-400" size={20} />
                 <h3 className="text-sm font-black text-white tracking-[0.2em] uppercase">AI Scouting Report</h3>
              </div>
              <p className="text-xs md:text-sm text-slate-300 leading-relaxed italic border-l-2 border-indigo-500 pl-4 py-1">
                 "Quantitative models detect peak performance efficiency. Player exhibits high resistance to away-game fatigue. High probability of exceeding market projections in upcoming matchups."
              </p>
           </section>
        </div>
      </main>
    </div>
  );
}
