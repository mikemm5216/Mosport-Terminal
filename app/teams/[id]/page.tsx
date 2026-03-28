import Link from 'next/link';
import { prisma } from "@/lib/prisma";
import { WorldEngine } from "@/lib/world-engine";
import { ArrowLeft, Activity, Zap, Shield, Target, Search, Filter } from 'lucide-react';

export default async function TeamVaultPage({ params, searchParams }: { params: { id: string }, searchParams: { sport?: string } }) {
  const { id } = await params;
  const sportFilter = (await searchParams).sport || 'ALL';

  // 1. DATA INGESTION
  const teams = await prisma.teams.findMany({
    include: {
      history: { orderBy: { date: 'desc' }, take: 20 }
    }
  });

  // Filter teams based on sport if needed (Simplified for demo)
  const filteredTeams = sportFilter === 'ALL' ? teams : teams.filter(t => t.league_type === sportFilter);

  return (
    <div className="min-h-screen pb-40 bg-[#05090f] text-slate-200 font-sans selection:bg-cyan-500/30 overflow-x-hidden">

      {/* HEADER: TEAMS VAULT */}
      <div className="w-full pt-16 pb-20 px-12">
        <div className="max-w-7xl mx-auto flex flex-col gap-12">
          <div className="flex justify-between items-start">
            <div className="flex flex-col border-l-4 border-cyan-400 pl-8">
              <h1 className="text-6xl font-black text-white italic uppercase tracking-[0.1em] leading-none mb-4">
                TEAMS <span className="text-cyan-400">VAULT</span>
              </h1>
              <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] italic">Squad Intelligence & Multi-Sport Grid V2.1</span>
            </div>

            {/* FILTER CHIPS (image_8.png) */}
            <div className="flex items-center gap-4 bg-slate-950/50 p-2 rounded-2xl border border-white/5">
              {['ALL', 'SOCCER', 'NBA', 'MLB'].map((s) => (
                <Link
                  key={s}
                  href={`/teams/all?sport=${s}`}
                  className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${sportFilter === s ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.4)]' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                >
                  {s === 'SOCCER' ? '⚽ SOCCER' : s === 'NBA' ? '🏀 NBA' : s === 'MLB' ? '⚾ MLB' : '● ALL'}
                </Link>
              ))}
            </div>
          </div>

          {/* GRID OF CARDS (image_8.png Reference) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {filteredTeams.map((team) => (
              <TeamCard key={team.team_id} team={team} />
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}

function TeamCard({ team }: { team: any }) {
  const momentum = WorldEngine.calcMomentum(team.history || []);
  const strength = WorldEngine.calcStrength(team.history || []);
  const fatigue = WorldEngine.calcFatigue(team.history || []);

  return (
    <Link href={`/teams/${team.team_id}`} className="group block">
      <div className="bg-[#0a111a] border border-slate-800 rounded-[2.5rem] p-8 space-y-8 transition-all duration-500 hover:border-cyan-500/30 hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.6)] relative overflow-hidden h-full">
        <div className="absolute top-0 right-0 p-4 opacity-[0.05]">
          <Shield size={80} className="text-white" />
        </div>

        {/* IDENTITY BOX */}
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform shadow-2xl overflow-hidden bg-cover bg-center" style={{ backgroundImage: team.logo_url ? `url(${team.logo_url})` : 'none' }}>
            {!team.logo_url && <span className="text-4xl font-black text-slate-700 italic">{team.short_name?.[0] || 'T'}</span>}
          </div>
          <div className="flex flex-col">
            <h3 className="text-3xl font-black text-white italic tracking-tighter uppercase leading-none">{team.short_name || 'TEAM'}</h3>
            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest mt-1">{team.full_name}</span>
            <span className="text-[8px] font-black text-slate-700 uppercase tracking-widest mt-0.5">No Signal Data</span>
          </div>
        </div>

        {/* METRICS (image_8.png Bars) */}
        <div className="space-y-6">
          <MetricRow label="Momentum" value={momentum} color="from-cyan-500 to-cyan-400" />
          <MetricRow label="Strength Ratio" value={strength / 10} color="from-emerald-500 to-emerald-400" />
          <MetricRow label="Fatigue Load" value={fatigue} color="from-red-500 to-red-400" />
        </div>

        {/* FOOTER */}
        <div className="pt-6 border-t border-slate-900 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${team.league_type === 'MLB' ? 'bg-red-500' : team.league_type === 'NBA' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{team.league_type || 'EPL'}</span>
          </div>
          <div className="px-3 py-1 bg-slate-950 rounded-lg text-[8px] font-black text-slate-600 uppercase tracking-widest border border-white/5">
            0 OPS
          </div>
        </div>
      </div>
    </Link>
  );
}

function MetricRow({ label, value, color }: { label: string, value: number, color: string }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-end">
        <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest italic">{label}</span>
        <span className="text-[10px] font-black text-white italic">??</span>
      </div>
      <div className="h-1 w-full bg-slate-900 rounded-full overflow-hidden">
        <div className={`h-full bg-gradient-to-r ${color} shadow-[0_0_10px_rgba(255,255,255,0.1)] transition-all duration-1000`} style={{ width: `${value * 100}%` }} />
      </div>
    </div>
  );
}
