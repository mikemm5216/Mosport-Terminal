import Link from 'next/link';
import { prisma } from "@/lib/prisma";
import { ArrowLeft, Users, Zap } from 'lucide-react';

export default async function TeamHubPage({ params }: { params: { id: string } }) {
  const { id } = await params;

  const team = await prisma.teams.findUnique({
    where: { team_id: id },
    include: {
      rosters: {
        where: { season_year: 2026 },
        include: { player: true },
        orderBy: { jersey_number: 'asc' }
      }
    }
  });

  if (!team) return <div className="p-8 text-white">Signal Lost: Team Not Found</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-cyan-500/30 pb-12 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950">
      <nav className="w-full border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 px-4">
        <div className="max-w-7xl mx-auto h-16 flex items-center justify-start gap-4">
          <Link href="/teams" className="flex items-center gap-2 group">
            <ArrowLeft size={16} className="text-slate-500 group-hover:text-cyan-400 transition-colors" />
            <span className="text-xs font-mono tracking-widest uppercase text-slate-400 group-hover:text-white">BACK TO VAULT</span>
          </Link>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* TEAM HEADER */}
        <header className="flex flex-col md:flex-row items-center md:items-start gap-8 mb-12 bg-slate-900/40 p-8 rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden">
           <div className="w-32 h-32 md:w-48 md:h-48 bg-slate-950 rounded-full border-2 border-slate-700 flex items-center justify-center p-4 z-10 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
              {team.logo_url ? <img src={team.logo_url} alt={team.full_name} className="w-full h-full object-contain drop-shadow-2xl" /> : <Zap size={40} className="text-slate-700" />}
           </div>
           <div className="flex flex-col items-center md:items-start z-10 pt-4">
              <span className="text-cyan-400 font-mono text-xs tracking-[0.3em] uppercase mb-2 border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 rounded">{team.league_type} FRANCHISE</span>
              <h1 className="text-4xl md:text-7xl font-black text-white tracking-tighter uppercase leading-none">{team.full_name}</h1>
              <span className="text-slate-500 font-black text-xl tracking-widest uppercase mt-2">{team.city} [{team.short_name}]</span>
           </div>
        </header>

        {/* ACTIVE ROSTER */}
        <section>
           <div className="flex items-center gap-3 mb-6 px-2">
              <Users className="text-indigo-400" size={24} />
              <h2 className="text-2xl font-black text-white tracking-[0.2em] uppercase">Active Roster</h2>
              <span className="ml-auto text-xs font-mono text-slate-500 uppercase tracking-widest">{team.rosters.length} Units</span>
           </div>
           
           <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {team.rosters.map((roster) => (
                 <Link href={`/players/${roster.player_id}`} key={roster.id} className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 flex items-center gap-4 hover:border-cyan-500/50 hover:bg-slate-800/80 transition-all group">
                    <div className="w-12 h-12 shrink-0 bg-slate-950 border border-slate-700 rounded-lg flex items-center justify-center group-hover:border-cyan-400 transition-colors shadow-inner">
                       <span className="text-xl font-black text-white">{roster.jersey_number || "-"}</span>
                    </div>
                    <div className="flex flex-col min-w-0">
                       <span className="text-sm font-black text-white uppercase truncate group-hover:text-cyan-400 transition-colors">{roster.player.display_name}</span>
                       <span className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">{roster.player.position_main}</span>
                    </div>
                 </Link>
              ))}
           </div>
        </section>
      </main>
    </div>
  );
}
