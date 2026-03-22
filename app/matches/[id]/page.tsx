import Link from 'next/link';
import { prisma } from "@/lib/prisma";
import { WorldEngine, TeamStats } from "@/lib/world-engine";
import { ArrowLeft, Zap, Target, TrendingUp, Activity, User } from 'lucide-react';

export default async function WarRoomPage({ params }: { params: { id: string } }) {
  const { id } = await params;

  // Fetch Match Data
  const match = await prisma.matches.findUnique({
    where: { match_id: id },
    include: {
      home_team: true,
      away_team: true,
      snapshots: {
        take: 1,
        orderBy: { snapshot_time: 'desc' }
      }
    }
  });

  if (!match) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8">
        <h1 className="text-2xl font-black text-white uppercase tracking-widest mb-4">Match Not Found</h1>
        <Link href="/" className="text-cyan-400 font-mono text-xs uppercase tracking-widest hover:underline">Back to Radar</Link>
      </div>
    );
  }

  // Fetch Team Data & History
  const homeDb = await prisma.team.findFirst({ where: { team_name: match.home_team?.team_name ?? "" } });
  const awayDb = await prisma.team.findFirst({ where: { team_name: match.away_team?.team_name ?? "" } });

  const homeHistory = homeDb ? await prisma.matchHistory.findMany({ where: { team_id: homeDb.id }, orderBy: { date: 'desc' }, take: 20 }) : [];
  const awayHistory = awayDb ? await prisma.matchHistory.findMany({ where: { team_id: awayDb.id }, orderBy: { date: 'desc' }, take: 20 }) : [];

  const homeStats: TeamStats = {
    id: homeDb?.id ?? 'home',
    name: match.home_team?.team_name ?? 'Home',
    shortName: homeDb?.short_name ?? match.home_team?.team_name?.substring(0,3).toUpperCase() ?? 'HOM',
    momentum: WorldEngine.calcMomentum(homeHistory),
    strength: WorldEngine.calcStrength(homeHistory),
    fatigue: WorldEngine.calcFatigue(homeHistory),
    history: homeHistory,
  };

  const awayStats: TeamStats = {
    id: awayDb?.id ?? 'away',
    name: match.away_team?.team_name ?? 'Away',
    shortName: awayDb?.short_name ?? match.away_team?.team_name?.substring(0,3).toUpperCase() ?? 'AWY',
    momentum: WorldEngine.calcMomentum(awayHistory),
    strength: WorldEngine.calcStrength(awayHistory),
    fatigue: WorldEngine.calcFatigue(awayHistory),
    history: awayHistory,
  };

  const simulation = WorldEngine.runMatchSimulation(homeStats, awayStats);

  // Bio-Battery
  let hb = 50, ab = 50;
  if (match.snapshots?.length > 0) {
    const fd = (match.snapshots[0].feature_json as any);
    hb = fd?.bio_battery_home ?? fd?.h_bio ?? fd?.home_energy ?? 50;
    ab = fd?.bio_battery_away ?? fd?.a_bio ?? fd?.away_energy ?? 50;
  }
  const total = hb + ab;
  const hPercent = total > 0 ? Math.round((hb/total)*100) : 50;
  const aPercent = 100 - hPercent;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-cyan-500/30">
      
      {/* GLOBAL TOP NAV */}
      <nav className="w-full border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <ArrowLeft size={16} className="text-slate-500 group-hover:text-cyan-400 transition-colors" />
            <span className="text-xs font-mono tracking-widest uppercase text-slate-400 group-hover:text-white transition-colors">RADAR FEED</span>
          </Link>
          <div className="text-center">
             <span className="text-[10px] text-slate-500 font-mono tracking-[0.3em] uppercase">War Room Terminal</span>
          </div>
          <div className="w-24"></div> {/* Spacer */}
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-4 md:py-6">
        
        {/* MATCH HEADER (Tightened) */}
        <header className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8 px-4 md:px-0">
           {/* Home Team */}
           <div className="flex flex-col items-center md:items-end flex-1">
              {homeDb?.logo_url ? <img src={homeDb.logo_url} className="w-16 h-16 md:w-20 md:h-20 object-contain mb-2 drop-shadow-[0_0_20px_rgba(255,255,255,0.1)]" /> : <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 mb-2" />}
              <h2 className="text-2xl md:text-4xl font-black tracking-tighter uppercase text-white">{homeStats.shortName}</h2>
              <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mt-0.5">{homeStats.name}</span>
           </div>

           {/* Versus / Score */}
           <div className="flex flex-col items-center gap-2">
              <div className="text-slate-800 font-black text-4xl italic select-none">VS</div>
              <div className="bg-cyan-500/10 border border-cyan-500/20 px-3 py-1 rounded-full shadow-[0_0_15px_rgba(6,182,212,0.1)]">
                 <span className="text-[10px] font-black text-cyan-400 tracking-widest uppercase">{simulation.primaryTag}</span>
              </div>
           </div>

           {/* Away Team */}
           <div className="flex flex-col items-center md:items-start flex-1">
              {awayDb?.logo_url ? <img src={awayDb.logo_url} className="w-16 h-16 md:w-20 md:h-20 object-contain mb-2 drop-shadow-[0_0_20px_rgba(255,255,255,0.1)]" /> : <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 mb-2" />}
              <h2 className="text-2xl md:text-4xl font-black tracking-tighter uppercase text-white">{awayStats.shortName}</h2>
              <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mt-0.5">{awayStats.name}</span>
           </div>
        </header>

        {/* BIO-BATTERY (Tightened & Centered Above the Fold) */}
        <section className="bg-slate-900/30 border border-slate-800/50 rounded-2xl p-4 md:p-6 mb-8 max-w-4xl mx-auto">
           <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                 <Zap size={14} className="text-emerald-400" />
                 <h3 className="text-[10px] font-black tracking-[0.2em] uppercase text-white">Bio-Battery Index</h3>
              </div>
           </div>
           <div className="flex flex-col items-center">
              <div className="w-full flex justify-between items-end mb-2 px-1">
                 <span className="text-xl font-black text-emerald-400">{hPercent}%</span>
                 <span className="text-[9px] text-slate-600 font-mono uppercase tracking-widest">Momentum Differential</span>
                 <span className="text-xl font-black text-red-500">{aPercent}%</span>
              </div>
              <div className="w-full h-2.5 bg-slate-950 rounded-full border border-slate-800 flex overflow-hidden p-0.5">
                 <div className="h-full bg-emerald-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.3)]" style={{ width: `${hPercent}%` }} />
                 <div className="h-full bg-red-600 rounded-full ml-auto" style={{ width: `${aPercent}%` }} />
              </div>
           </div>
        </section>

        {/* LOWER GRID: TACTICAL & PLAYERS (Scrollable Area) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
           
           {/* LEFT: TACTICAL BREAKDOWN */}
           <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 md:p-8 backdrop-blur-sm relative overflow-hidden h-fit">
              <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500 shadow-[2px_0_10px_rgba(6,182,212,0.3)]"></div>
              <div className="flex items-center gap-3 mb-6">
                 <Activity size={18} className="text-cyan-400" />
                 <h3 className="text-sm font-black tracking-[0.2em] uppercase text-white">Standard Analysis</h3>
              </div>
              <p className="text-base md:text-lg text-slate-300 leading-relaxed font-medium">
                 {simulation.standardAnalysis}
              </p>
              <div className="mt-8 pt-6 border-t border-slate-800 flex flex-wrap gap-6">
                 <div className="flex flex-col">
                    <span className="text-[9px] text-slate-500 font-mono uppercase tracking-widest mb-1">Confidence</span>
                    <span className="text-lg font-black text-white">{Math.round(simulation.confidence * 100)}%</span>
                 </div>
                 <div className="flex flex-col">
                    <span className="text-[9px] text-slate-500 font-mono uppercase tracking-widest mb-1">Projected</span>
                    <span className="text-lg font-black text-cyan-400 uppercase">{simulation.predictedWinner === 'home' ? homeStats.shortName : awayStats.shortName} Win</span>
                 </div>
              </div>
           </section>

           {/* RIGHT: KEY PLAYERS SHOWDOWN */}
           <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 md:p-8 h-fit">
              <div className="flex items-center gap-3 mb-8">
                 <User size={18} className="text-indigo-400" />
                 <h3 className="text-sm font-black tracking-[0.2em] uppercase text-white">Key Players</h3>
              </div>

              <div className="space-y-4">
                 {/* Home Star */}
                 <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl relative overflow-hidden group hover:border-indigo-500/50 transition-colors">
                    <div className="flex items-center gap-4 mb-3">
                       <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center text-slate-600 font-black">ST1</div>
                       <div>
                          <h4 className="font-black text-white uppercase leading-tight text-sm">Elite Forward</h4>
                          <span className="text-[9px] text-indigo-400 font-mono uppercase tracking-widest">{homeStats.shortName} Star</span>
                       </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="flex flex-col">
                          <span className="text-[8px] text-slate-500 font-mono uppercase tracking-widest">PPG</span>
                          <span className="text-base font-black text-white">25.4</span>
                       </div>
                       <div className="flex flex-col">
                          <span className="text-[8px] text-slate-500 font-mono uppercase tracking-widest">Impact</span>
                          <span className="text-base font-black text-emerald-400">HIGH</span>
                       </div>
                    </div>
                 </div>

                 {/* Away Star */}
                 <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl relative overflow-hidden group hover:border-orange-500/50 transition-colors text-right">
                    <div className="flex items-center justify-end gap-4 mb-3">
                       <div>
                          <h4 className="font-black text-white uppercase leading-tight text-sm">Prime Guard</h4>
                          <span className="text-[9px] text-orange-400 font-mono uppercase tracking-widest">{awayStats.shortName} Star</span>
                       </div>
                       <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center text-slate-600 font-black">ST2</div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="flex flex-col items-start px-2">
                          <span className="text-[8px] text-slate-500 font-mono uppercase tracking-widest">Impact</span>
                          <span className="text-base font-black text-emerald-400">HIGH</span>
                       </div>
                       <div className="flex flex-col">
                          <span className="text-[8px] text-slate-500 font-mono uppercase tracking-widest">PPG</span>
                          <span className="text-base font-black text-white">22.8</span>
                       </div>
                    </div>
                 </div>
              </div>

              <div className="mt-6 p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-xl">
                 <span className="text-[8px] font-mono text-indigo-400 uppercase tracking-widest mb-1 block">AI Scouting Report</span>
                 <p className="text-[10px] text-slate-400 leading-relaxed uppercase">
                    Expect high-tempo exchanges between point leaders. {homeStats.shortName}'s front-court advantage remains the primary variable.
                 </p>
              </div>
           </section>
           </div>

      </main>

      {/* FOOTER */}
      <footer className="w-full max-w-6xl mx-auto px-4 py-12 border-t border-slate-900 text-center">
         <p className="text-[10px] text-slate-600 font-mono tracking-widest uppercase">
            Proprietary Outcome Prediction Engine • Mosport Terminal v2.1
         </p>
      </footer>
    </div>
  );
}
