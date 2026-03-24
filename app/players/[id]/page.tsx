import Link from 'next/link';
import { prisma } from "@/lib/prisma";
import { ArrowLeft, User, Activity } from 'lucide-react';

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

        <section className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 md:p-8">
           <div className="flex items-center gap-3 mb-8">
              <Activity className="text-emerald-400" />
              <h2 className="text-xl font-black text-white tracking-[0.2em] uppercase">Performance Metrics (2026)</h2>
           </div>
           
           <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {displayStats.map(([key, value]) => (
                <div key={key} className="bg-slate-950 p-4 rounded-xl border border-slate-800/50 flex flex-col items-center justify-center">
                   <span className="text-[10px] text-slate-500 font-mono tracking-widest uppercase mb-2">{key.toUpperCase()}</span>
                   <span className="text-3xl font-black text-emerald-400">{String(value)}</span>
                </div>
              ))}
           </div>
        </section>
      </main>
    </div>
  );
}
