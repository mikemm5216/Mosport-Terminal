import { prisma } from "@/lib/prisma";
import { WorldEngine } from "@/lib/world-engine";
import { Shield } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

function getResultColor(result: string): string {
  if (result === 'W') return 'bg-emerald-500';
  if (result === 'D') return 'bg-slate-500';
  return 'bg-rose-500';
}

export default async function TeamsAnalyticsPage({ 
  searchParams 
}: { 
  searchParams: { sport?: string } 
}) {
  const { sport } = await searchParams;

  const allTeams = await prisma.team.findMany({
    orderBy: { team_name: 'asc' }
  });

  // Simple keyword-based filtering for the demo
  const teams = allTeams.filter(t => {
    if (!sport || sport === 'ALL') return true;
    const league = (t.league || '').toUpperCase();
    if (sport === 'NBA') return league.includes('NBA') || league.includes('BASKETBALL');
    if (sport === 'SOCCER') return !league.includes('NBA') && !league.includes('BASKETBALL');
    return true;
  });

  // Fetch match history for all teams
  const allHistory = await prisma.matchHistory.findMany({
    orderBy: { date: 'desc' }
  });

  const historyByTeamId = new Map<string, typeof allHistory>();
  for (const entry of allHistory) {
    const existing = historyByTeamId.get(entry.team_id) || [];
    existing.push(entry);
    historyByTeamId.set(entry.team_id, existing);
  }

  const FilterButton = ({ label, value, active, icon }: { label: string, value: string, active: boolean, icon: string }) => (
    <Link 
      href={`/teams${value === 'ALL' ? '' : `?sport=${value}`}`}
      className={`px-4 py-2 rounded-full border text-[10px] font-black tracking-widest transition-all ${
        active 
          ? 'bg-cyan-500 border-cyan-400 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]' 
          : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700'
      }`}
    >
      [{icon} {label}]
    </Link>
  );

  return (
    <div className="flex flex-col items-center px-4 py-6 min-h-screen bg-slate-950 text-slate-200">
      {/* HEADER & FILTERS */}
      <div className="w-full max-w-7xl mb-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-800/80 pb-6">
          <div>
            <h1 className="text-3xl font-black text-white tracking-widest uppercase">
              Teams Vault
            </h1>
            <p className="text-slate-500 text-xs font-mono uppercase tracking-widest mt-1">
              Squad Intelligence &amp; Multi-Sport Analytics
            </p>
          </div>
          
          <div className="flex gap-3 flex-wrap">
            <FilterButton label="ALL" value="ALL" active={!sport || sport === 'ALL'} icon="🌐" />
            <FilterButton label="SOCCER" value="SOCCER" active={sport === 'SOCCER'} icon="⚽" />
            <FilterButton label="NBA" value="NBA" active={sport === 'NBA'} icon="🏀" />
          </div>
        </div>
      </div>

      {teams.length === 0 ? (
        <div className="text-center p-20 text-slate-500 font-mono text-sm tracking-widest uppercase border border-dashed border-slate-800 rounded-2xl w-full max-w-7xl">
          NO MATCHING UNITS IN COLD DATABASE FOR [{sport || 'ALL'}]
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 w-full max-w-7xl">
          {teams.map(team => {
            const history = historyByTeamId.get(team.id) || [];
            const momentum = WorldEngine.calcMomentum(history);
            const strength = WorldEngine.calcStrength(history);
            const fatigue = WorldEngine.calcFatigue(history);
            const last5 = history.slice(0, 5);
            const hasData = history.length > 0;
            const isNBA = (team.league || '').toUpperCase().includes('NBA');

            return (
              <div
                key={team.id}
                className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 hover:border-cyan-500/50 hover:shadow-[0_0_20px_rgba(6,182,212,0.1)] transition-all group backdrop-blur-sm"
              >
                {/* Header: Logo + Names */}
                <div className="flex items-center gap-4 mb-5 border-b border-slate-800/50 pb-4">
                  {team.logo_url ? (
                    <div className="w-14 h-14 bg-slate-950/50 rounded-full border border-slate-800 p-1.5 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-500">
                      <img src={team.logo_url} alt={team.team_name} className="w-full h-full object-contain drop-shadow-md" />
                    </div>
                  ) : (
                    <div className="w-14 h-14 bg-slate-950/50 rounded-full border border-slate-800 flex items-center justify-center flex-shrink-0">
                      <Shield size={24} className="text-slate-600" />
                    </div>
                  )}
                  <div className="flex flex-col truncate min-w-0">
                    <span className="text-white font-black text-xl tracking-widest uppercase leading-tight">
                      {team.short_name || team.team_name.substring(0, 3).toUpperCase()}
                    </span>
                    <span className="text-[10px] text-slate-500 font-bold truncate tracking-widest">
                      {team.team_name}
                    </span>
                    {/* LAST 5 Form dots */}
                    <div className="flex gap-1 mt-1.5">
                      {hasData ? last5.map((h, i) => (
                        <div
                          key={i}
                          title={h.result}
                          className={`w-3 h-3 rounded-full ${getResultColor(h.result)}`}
                        />
                      )) : (
                        <span className="text-[9px] text-slate-600 font-mono tracking-widest uppercase">No History</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Real Metrics */}
                <div className="space-y-3">
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-end">
                      <span className="text-[9px] text-slate-500 font-mono tracking-widest uppercase">Momentum</span>
                      <span className="text-xs text-cyan-400 font-black font-mono">{hasData ? `${Math.round(momentum * 100)}%` : 'N/A'}</span>
                    </div>
                    <div className="w-full h-1 bg-slate-950 rounded overflow-hidden">
                      <div className="h-full bg-cyan-500 transition-all" style={{ width: hasData ? `${momentum * 100}%` : '0%' }} />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-end">
                      <span className="text-[9px] text-slate-500 font-mono tracking-widest uppercase">Strength Ratio</span>
                      <span className="text-xs text-amber-400 font-black font-mono">{hasData ? `${Math.round(strength * 100)}%` : 'N/A'}</span>
                    </div>
                    <div className="w-full h-1 bg-slate-950 rounded overflow-hidden">
                      <div className="h-full bg-amber-500 transition-all" style={{ width: hasData ? `${strength * 100}%` : '0%' }} />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-end">
                      <span className="text-[9px] text-slate-500 font-mono tracking-widest uppercase">Fatigue Load</span>
                      <span className="text-xs text-rose-400 font-black font-mono">{hasData ? `${Math.round(fatigue * 100)}%` : 'N/A'}</span>
                    </div>
                    <div className="w-full h-1 bg-slate-950 rounded overflow-hidden">
                      <div className="h-full bg-rose-500 transition-all" style={{ width: hasData ? `${fatigue * 100}%` : '0%' }} />
                    </div>
                  </div>
                </div>

                {/* Footer (Dynamic League) */}
                <div className="mt-5 pt-3 border-t border-slate-800/50 flex justify-between items-center text-[8px] font-mono text-slate-500 tracking-widest uppercase">
                  <span className="flex items-center gap-1">
                    {isNBA ? '🏀' : '⚽'} {team.league || 'PRO LEAGUE'}
                  </span>
                  <span>{history.length} OPS</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
