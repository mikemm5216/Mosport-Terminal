import { REVERSE_REGISTRY } from "@/src/config/entityRegistry";
import Link from 'next/link';
import { prisma } from "@/lib/prisma";
import { ArrowLeft, Shield } from 'lucide-react';
import EntityLogo from "@/src/components/EntityLogo";

export default async function TeamVaultPage({ params, searchParams }: { params: Promise<{ id: string }>, searchParams: Promise<{ sport?: string }> }) {
  const { id } = await params;
  const sportFilter = (await searchParams).sport || 'ALL';

  const teams = await prisma.context.findMany();
  const filteredTeams = sportFilter === 'ALL' ? teams : teams.filter((t: any) => t.sport_code === (sportFilter === 'NBA' ? '03' : sportFilter === 'MLB' ? '01' : '02'));

  return (
    <div className="min-h-screen pb-40 bg-[#05090f] text-slate-200 font-sans selection:bg-cyan-500/30 overflow-x-hidden">
      <div className="w-full pt-16 pb-20 px-12">
        <div className="max-w-7xl mx-auto flex flex-col gap-12">
          <div className="flex justify-between items-start">
            <div className="flex flex-col border-l-4 border-cyan-400 pl-8">
              <h1 className="text-6xl font-black text-white italic uppercase tracking-[0.1em] leading-none mb-4">
                TEAMS <span className="text-cyan-400">VAULT</span>
              </h1>
              <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] italic">Squad Intelligence & Multi-Sport Grid V2.1</span>
            </div>

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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {filteredTeams.map((team: any) => (
              <TeamCard key={team.public_uuid} team={team} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TeamCard({ team }: { team: any }) {
  const entityHash = REVERSE_REGISTRY[team.internal_code] || 'UNKNOWN';
  return (
    <Link href={`/teams/${team.public_uuid}`} className="group block">
      <div className="bg-[#0a111a] border border-slate-800 rounded-[2.5rem] p-8 space-y-8 transition-all duration-500 hover:border-cyan-500/30 hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.6)] relative overflow-hidden h-full">
        <div className="absolute top-0 right-0 p-4 opacity-[0.05]">
          <Shield size={80} className="text-white" />
        </div>

        <div className="flex items-center gap-6">
          <EntityLogo
            entityHash={entityHash}
            className="w-20 h-20 rounded-full flex-shrink-0 group-hover:scale-110 transition-transform shadow-2xl object-contain"
          />
          <div className="flex flex-col">
            <h3 className="text-3xl font-black text-white italic tracking-tighter uppercase leading-none">{team.team_code || 'TEAM'}</h3>
            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest mt-1">{team.name}</span>
            <span className="text-[8px] font-black text-slate-700 uppercase tracking-widest mt-0.5">V2 SECURE NODE</span>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-900 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${team.sport_code === 'MLB' ? 'bg-red-500' : team.sport_code === 'NBA' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{team.sport_code || 'N/A'}</span>
          </div>
          <div className="px-3 py-1 bg-slate-950 rounded-lg text-[8px] font-black text-slate-600 uppercase tracking-widest border border-white/5">
            {team.weight_level}
          </div>
        </div>
      </div>
    </Link>
  );
}
