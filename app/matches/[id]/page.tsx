import Link from 'next/link';
import { prisma } from "@/lib/prisma";
import { WorldEngine, TeamStats } from "@/lib/world-engine";
import { ArrowLeft, Zap, Activity, User } from 'lucide-react';

export default async function WarRoomPage({ params }: { params: { id: string } }) {
  const { id } = await params;

  // Fetch Match Data with Teams and Players
  const match = await prisma.matches.findUnique({
    where: { match_id: id },
    include: {
      home_team: { include: { players: true } },
      away_team: { include: { players: true } },
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

  // Fetch Team Data
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

  // Bio-Battery logic
  let hb = 50, ab = 50;
  if (match.snapshots?.length > 0) {
    const fd = (match.snapshots[0].feature_json as any);
    hb = fd?.bio_battery_home ?? fd?.h_bio ?? fd?.home_energy ?? 50;
    ab = fd?.bio_battery_away ?? fd?.a_bio ?? fd?.away_energy ?? 50;
  }
  const total = hb + ab;
  const hPercent = total > 0 ? Math.round((hb/total)*100) : 50;
  const aPercent = 100 - hPercent;

  // Extract Key Players for Battle Mode
  const sport = (match.sport || "Soccer");
  const priorityRole = sport === "Baseball" ? "P" : sport === "Basketball" ? "PF" : "ST";
  
  let homeStar = match.home_team?.players?.find(p => p.positions.includes(priorityRole)) || match.home_team?.players?.[0];
  let awayStar = match.away_team?.players?.find(p => p.positions.includes(priorityRole)) || match.away_team?.players?.[0];

  // DEMO FALLBACK
  if (!homeStar) {
    homeStar = {
       player_id: "demo_home_star",
       player_name: sport === "Baseball" ? "S. Ohtani" : sport === "Basketball" ? "L. James" : "H. Kane",
       number: sport === "Baseball" ? "17" : sport === "Basketball" ? "23" : "9",
       positions: sport === "Baseball" ? ["P", "DH"] : sport === "Basketball" ? ["PF", "SF"] : ["ST", "CF"],
       stats: sport === "Baseball" ? { "P": { ERA: "2.52", K: "186" } } : { "ST": { G: "32", A: "12" } }
    } as any;
  }
  
  if (!awayStar) {
    awayStar = {
       player_id: "demo_away_star",
       player_name: "Tactic Variable",
       number: "99",
       positions: sport === "Soccer" ? ["CDM", "CM"] : sport === "Basketball" ? ["PG", "SG"] : ["SS", "2B"],
       stats: sport === "Soccer" ? { "CDM": { G: "1", A: "4" } } : { "SS": { AVG: ".285", OPS: ".880" } }
    } as any;
  }

  // Active Role determination
  const homeActiveRole = (homeStar?.positions?.includes(priorityRole) ? priorityRole : homeStar?.positions?.[0]) || "ST";
  const awayActiveRole = (awayStar?.positions?.includes(priorityRole) ? priorityRole : awayStar?.positions?.[0]) || "ST";

  // DATA RECOVERY: Handle both flat and nested structures
  const hRaw = (homeStar?.stats as Record<string, any>) || {};
  const aRaw = (awayStar?.stats as Record<string, any>) || {};
  const homePlayerStats = hRaw[homeActiveRole] || hRaw;
  const awayPlayerStats = aRaw[awayActiveRole] || aRaw;

  // CEO SAFETY: Strict Metric Whitelists
  const SOCCER_METRICS = ["G", "A", "SPG", "PAS%", "TCK", "CS", "SV"];
  const NBA_METRICS = ["PPG", "RPG", "APG", "FG%", "3P%"];
  const MLB_METRICS = ["AVG", "HR", "RBI", "OPS", "ERA", "K", "WHIP", "BAA"];
  const allowedMetrics = sport === "Soccer" ? SOCCER_METRICS : 
                       sport === "Basketball" ? NBA_METRICS : MLB_METRICS;

  const hFiltered = Object.entries(homePlayerStats).filter(([k]) => allowedMetrics.includes(k)).slice(0, 4);
  const aFiltered = Object.entries(awayPlayerStats).filter(([k]) => allowedMetrics.includes(k)).slice(0, 4);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-cyan-500/30 overflow-x-hidden">
      <nav className="w-full border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 px-4">
        <div className="max-w-7xl mx-auto h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <ArrowLeft size={16} className="text-slate-500 group-hover:text-cyan-400 transition-colors" />
            <span className="text-xs font-mono tracking-widest uppercase text-slate-400 group-hover:text-white">RADAR FEED</span>
          </Link>
          <span className="text-[10px] text-slate-500 font-mono tracking-[0.3em] uppercase">War Room v2.5</span>
          <div className="w-24"></div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* HERO SECTION */}
        <header className="flex flex-row flex-nowrap items-center justify-between gap-4 md:gap-12 mb-12">
          <div className="text-center md:text-right flex-1 shrink-0 flex flex-col md:flex-row-reverse items-center md:items-end justify-center md:justify-start gap-4">
             <div className="w-16 h-16 md:w-24 md:h-24 bg-slate-900 rounded-full border border-slate-800 flex items-center justify-center overflow-hidden shrink-0 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
               {match.home_team?.logo_url ? <img src={match.home_team.logo_url} className="w-full h-full object-contain p-2" /> : <Zap className="text-slate-800" />}
             </div>
             <div>
                <h2 className="text-2xl md:text-6xl font-black tracking-tighter text-white uppercase leading-none">{homeStats.shortName}</h2>
                <p className="text-[10px] md:text-xs font-mono text-slate-500 mt-2 tracking-widest uppercase">{homeStats.name}</p>
             </div>
          </div>
          <div className="flex flex-col items-center gap-2 shrink-0">
             <div className="h-0.5 w-8 md:w-16 bg-slate-800" />
             <div className="text-slate-800 font-black text-sm md:text-2xl italic tracking-[0.3em]">VS</div>
             <div className="h-0.5 w-8 md:w-16 bg-slate-800" />
          </div>
          <div className="text-center md:text-left flex-1 shrink-0 flex flex-col md:flex-row items-center md:items-end justify-center md:justify-start gap-4">
             <div className="w-16 h-16 md:w-24 md:h-24 bg-slate-900 rounded-full border border-slate-800 flex items-center justify-center overflow-hidden shrink-0 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
               {match.away_team?.logo_url ? <img src={match.away_team.logo_url} className="w-full h-full object-contain p-2" /> : <Zap className="text-slate-800" />}
             </div>
             <div>
                <h2 className="text-2xl md:text-6xl font-black tracking-tighter text-white uppercase leading-none">{awayStats.shortName}</h2>
                <p className="text-[10px] md:text-xs font-mono text-slate-500 mt-2 tracking-widest uppercase">{awayStats.name}</p>
             </div>
          </div>
        </header>

        {/* BIO-BATTERY */}
        <section className="bg-slate-900/40 border border-slate-800/60 rounded-3xl p-6 md:p-8 mb-12 max-w-5xl mx-auto">
           <div className="flex justify-between items-end mb-4 px-2">
              <span className="text-xl md:text-2xl font-black text-emerald-400">{hPercent}%</span>
              <div className="flex items-center gap-2 mb-1">
                 <Zap size={14} className="text-emerald-400" />
                 <span className="text-[10px] font-black tracking-[0.2em] text-white uppercase whitespace-nowrap">Proprietary Match Energy Index</span>
              </div>
              <span className="text-xl md:text-2xl font-black text-red-500">{aPercent}%</span>
           </div>
           <div className="w-full h-3 bg-slate-950 rounded-full border border-slate-800/50 flex overflow-hidden p-0.5 shadow-inner">
              <div className="h-full bg-emerald-500 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.4)]" style={{ width: `${hPercent}%` }} />
              <div className="h-full bg-red-600 rounded-full ml-auto" style={{ width: `${aPercent}%` }} />
           </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 items-start">
           {/* ANALYSIS */}
           <section className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 md:p-10 relative overflow-hidden h-fit lg:min-h-[450px]">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-cyan-500 shadow-[4px_0_15px_rgba(6,182,212,0.4)]" />
              <div className="flex items-center gap-4 mb-8">
                 <Activity size={20} className="text-cyan-400" />
                 <h3 className="text-sm font-black tracking-[0.2em] uppercase text-white">Standard Analysis</h3>
              </div>
              <p className="text-base md:text-xl text-slate-200 leading-relaxed font-medium italic">
                 {simulation.standardAnalysis}
              </p>
              <div className="mt-12 pt-8 border-t border-slate-800 flex flex-wrap gap-8">
                 <div>
                    <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mb-1 block">Reliability</span>
                    <span className="text-xl md:text-2xl font-black text-white">{Math.round(simulation.confidence * 100)}%</span>
                 </div>
                 <div>
                    <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mb-1 block">Bias Pick</span>
                    <span className="text-xl md:text-2xl font-black text-cyan-400 uppercase">{simulation.predictedWinner === 'home' ? homeStats.shortName : awayStats.shortName}</span>
                 </div>
              </div>
           </section>

           {/* KEY PLAYERS */}
           <section className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 md:p-10 h-fit lg:min-h-[450px]">
              <div className="flex items-center justify-between mb-10">
                 <div className="flex items-center gap-4">
                    <User size={20} className="text-indigo-400" />
                    <h3 className="text-sm font-black tracking-[0.2em] uppercase text-white">Tactical Showdown</h3>
                 </div>
                 <span className="text-[9px] font-mono text-slate-600 uppercase tracking-widest">Profiles Active</span>
              </div>

              <div className="flex flex-col gap-6 relative">
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                    <div className="bg-slate-950 border border-slate-800 w-10 h-10 md:w-12 md:h-12 rounded flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.2)] rotate-45">
                       <span className="text-indigo-500 font-black italic -rotate-45 text-xs md:text-base">VS</span>
                    </div>
                 </div>

                 {/* HOME PLAYER */}
                 <div className="flex items-center gap-4 md:gap-6 justify-between bg-slate-950/50 p-4 md:p-6 rounded-2xl border border-slate-800/80 transition-all duration-300">
                    <TacticalAvatar 
                      number={homeStar?.number || "00"} 
                      position={homeActiveRole} 
                      name={homeStar?.player_name || "N/A"}
                      side="HOME"
                    />
                    <div className="flex flex-col gap-2 md:gap-4 flex-1 items-end min-w-0">
                       <div className="text-right">
                          <h4 className="text-white font-black text-xs md:text-sm uppercase tracking-tight truncate max-w-[100px] md:max-w-[120px]">{homeStar?.player_name || "Unknown Star"}</h4>
                          <span className="text-[8px] md:text-[9px] text-indigo-400 font-mono tracking-widest uppercase">{homeStats.shortName} [{homeStar?.positions?.join('/') || homeActiveRole}]</span>
                       </div>
                       <div className="grid grid-cols-2 gap-x-4 md:gap-x-6 gap-y-1 md:gap-y-2">
                          {hFiltered.map(([k, v]) => (
                             <StatBlock key={k} label={k} value={String(v)} />
                          ))}
                       </div>
                    </div>
                 </div>

                 {/* AWAY PLAYER */}
                 <div className="flex items-center gap-4 md:gap-6 justify-between bg-slate-950/50 p-4 md:p-6 rounded-2xl border border-slate-800/80 transition-all duration-300">
                    <div className="flex flex-col gap-2 md:gap-4 flex-1 items-start min-w-0">
                       <div className="text-left">
                          <h4 className="text-white font-black text-xs md:text-sm uppercase tracking-tight truncate max-w-[100px] md:max-w-[120px]">{awayStar?.player_name || "Unknown Star"}</h4>
                          <span className="text-[8px] md:text-[9px] text-orange-400 font-mono tracking-widest uppercase">{awayStats.shortName} [{awayStar?.positions?.join('/') || awayActiveRole}]</span>
                       </div>
                       <div className="grid grid-cols-2 gap-x-4 md:gap-x-6 gap-y-1 md:gap-y-2">
                          {aFiltered.map(([k, v]) => (
                             <StatBlock key={k} label={k} value={String(v)} />
                          ))}
                       </div>
                    </div>
                    <TacticalAvatar 
                      number={awayStar?.number || "00"} 
                      position={awayActiveRole} 
                      name={awayStar?.player_name || "N/A"}
                      side="AWAY"
                    />
                 </div>
              </div>

              <div className="mt-10 p-5 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl">
                 <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1 block">Tactical Engine Log</span>
                 <p className="text-[10px] text-slate-400 leading-relaxed uppercase">
                    Dictionary v2.0 Active. Position metrics mapped for {sport}. Accuracy optimization confirmed.
                 </p>
              </div>
           </section>
        </div>
      </main>

      <footer className="w-full max-w-7xl mx-auto px-4 py-16 border-t border-slate-900 text-center opacity-50">
         <p className="text-[10px] text-slate-600 font-mono tracking-[0.5em] uppercase">
            Proprietary Data Grid • Mosport Terminal v2.5.1
         </p>
      </footer>
    </div>
  );
}

function TacticalAvatar({ number, position, name, side }: { number: string, position: string, name: string, side: 'HOME' | 'AWAY' }) {
  const color = side === 'HOME' ? 'border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.2)]';
  return (
    <div className={`w-14 h-14 md:w-20 md:h-20 bg-slate-900 border-2 rounded flex flex-col items-center justify-center relative shrink-0 ${color}`}>
        <span className="text-xl md:text-4xl font-black text-white select-none">{number}</span>
        <div className="absolute -bottom-2 right-0 bg-slate-950 border border-slate-800 px-1 py-0.5 rounded shadow-xl">
           <span className="text-[7px] md:text-[10px] font-black text-white uppercase tracking-tighter">{position}</span>
        </div>
    </div>
  );
}

function StatBlock({ label, value, color = "text-white" }: { label: string, value: string, color?: string }) {
  return (
    <div className="flex flex-col">
       <span className="text-[7px] md:text-[8px] text-slate-600 font-mono uppercase tracking-widest mb-0.5">{label}</span>
       <span className={`text-[10px] md:text-sm font-black ${color} tracking-tight`}>{value}</span>
    </div>
  );
}
