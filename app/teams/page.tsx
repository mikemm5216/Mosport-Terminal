import Link from 'next/link';
import { prisma } from "@/lib/prisma";
import { WorldEngine } from "@/lib/world-engine";

function getResultColor(result: string): string {
  if (result === 'W') return 'bg-emerald-500';
  if (result === 'D') return 'bg-slate-500';
  return 'bg-rose-500';
}

export default async function TeamsAnalyticsPage({
  searchParams
}: {
  searchParams: Promise<{ sport?: string }>
}) {
  const { sport = 'SOCCER' } = await searchParams;

  const allTeams = await prisma.teams.findMany({
    orderBy: { full_name: 'asc' }
  });

  const teams = allTeams.filter(t => {
    if (sport === 'NBA') return t.league_type === 'NBA';
    if (sport === 'MLB') return t.league_type === 'MLB';
    if (sport === 'SOCCER') return t.league_type === 'SOCCER';
    return false;
  });

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
      className={`px-6 py-2.5 rounded-lg border-2 text-xs font-black tracking-wider transition-all duration-300 uppercase flex items-center gap-2 ${active
        ? 'bg-gradient-to-r from-amber-500 to-orange-500 border-amber-400 text-white shadow-[0_0_24px_rgba(251,146,60,0.4)]'
        : 'bg-slate-900/60 border-slate-700/60 text-slate-400 hover:border-amber-500/50 hover:text-amber-400'
        }`}
    >
      {icon} {label}
    </Link>
  );

  return (
    <div className="flex flex-col items-center px-4 py-8 min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-200">
      <div className="w-full max-w-7xl mb-12">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 border-b-2 border-amber-500/40 pb-8">
          <div>
            <h1 className="text-4xl md:text-6xl font-black text-white tracking-widest uppercase mb-2">
              Teams <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">Vault</span>
            </h1>
            <p className="text-slate-500 text-[10px] md:text-xs font-mono uppercase tracking-[0.4em]">
              Squad Intelligence & Multi-Sport Intelligence Grid
            </p>
          </div>

          <div className="flex gap-4 flex-wrap">
            <FilterButton label="SOCCER" value="SOCCER" active={sport === 'SOCCER' || !sport} icon="⚽" />
            <FilterButton label="NBA" value="NBA" active={sport === 'NBA'} icon="🏀" />
            <FilterButton label="MLB" value="MLB" active={sport === 'MLB'} icon="⚾" />
          </div>
        </div>
      </div>

      {teams.length === 0 ? (
        <div className="text-center p-24 text-slate-600 font-mono text-sm tracking-[0.3em] uppercase border border-dashed border-slate-900 rounded-2xl w-full max-w-7xl">
          NO MATCHING UNITS IN COLD DATABASE [{sport || 'ALL'}]
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 w-full max-w-7xl">
          {teams.map(team => {
            const history = historyByTeamId.get(team.team_id) || [];
            const momentum = WorldEngine.calcMomentum(history);
            const strength = WorldEngine.calcStrength(history);
            const fatigue = WorldEngine.calcFatigue(history);
            const last5 = history.slice(0, 5);
            const hasData = history.length > 0;
            const isNBA = team.league_type === 'NBA';
            const isMLB = team.league_type === 'MLB';

            return (
              <div
                key={team.team_id}
                className="group relative overflow-hidden"
              >
                {/* Card background with gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900/60 to-slate-950 border border-slate-800/60 rounded-2xl group-hover:from-slate-800/70 group-hover:to-slate-900/70 group-hover:border-amber-500/40 transition-all duration-300" />
                
                {/* Animated glow */}
                <div className="absolute -inset-full top-0 right-0 h-80 w-80 bg-gradient-to-bl from-amber-500/8 to-transparent rounded-full blur-3xl group-hover:from-amber-500/15 transition-all duration-500 pointer-events-none" />

                <div className="relative p-6 flex flex-col h-full">
                  {/* Header with Logo */}
                  <div className="flex items-start gap-4 mb-6 pb-5 border-b border-slate-800/40">
                    {team.logo_url ? (
                      <img
                        src={team.logo_url || '/logos/default-shield.png'}
                        alt={team.full_name}
                        className="w-16 h-16 object-contain drop-shadow-[0_0_15px_rgba(251,146,60,0.2)] group-hover:drop-shadow-[0_0_25px_rgba(251,146,60,0.4)] transition-all duration-300"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-slate-950 rounded-lg border-2 border-slate-700 flex items-center justify-center text-slate-500 font-black text-2xl group-hover:border-amber-500/50 transition-colors">
                        {team.short_name?.[0] || team.full_name[0]}
                      </div>
                    )}
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="text-white font-black text-2xl tracking-tighter uppercase leading-tight group-hover:text-amber-400 transition-colors">
                        {team.short_name || team.full_name.substring(0, 3).toUpperCase()}
                      </span>
                      <span className="text-[9px] text-slate-500 font-bold truncate tracking-widest uppercase mt-0.5">
                        {team.full_name}
                      </span>
                    </div>
                  </div>

                  {/* Last 5 Results - Prominent Display */}
                  <div className="mb-6 pb-6 border-b border-slate-800/40">
                    <div className="text-[9px] text-slate-500 font-black tracking-widest uppercase mb-2.5">Last 5</div>
                    <div className="flex gap-2">
                      {hasData ? last5.map((h, i) => (
                        <div
                          key={i}
                          title={h.result}
                          className={`flex-1 h-8 rounded-lg flex items-center justify-center font-black text-white text-sm shadow-lg transition-all hover:scale-105 ${getResultColor(h.result)} ${
                            h.result === 'W' ? 'shadow-emerald-500/30' :
                            h.result === 'D' ? 'shadow-slate-500/20' :
                            'shadow-rose-500/30'
                          }`}
                        >
                          {h.result}
                        </div>
                      )) : (
                        <span className="text-[8px] text-slate-600 font-mono tracking-widest uppercase py-3">No Signal Data</span>
                      )}
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="space-y-4 flex-1">
                    <MetricBar label="Momentum" value={momentum} color="cyan" hasData={hasData} />
                    <MetricBar label="Strength Ratio" value={strength} color="amber" hasData={hasData} />
                    <MetricBar label="Fatigue Load" value={fatigue} color="rose" hasData={hasData} />
                  </div>

                  {/* Footer */}
                  <div className="mt-6 pt-4 border-t border-slate-800/40 flex justify-between items-center text-[8px] font-black text-slate-500 tracking-widest uppercase">
                    <span className="flex items-center gap-1.5">
                      {isNBA ? '🏀' : isMLB ? '⚾' : '⚽'} {team.league_type}
                    </span>
                    <span className="bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800 text-amber-400/80">{history.length} MATCHES</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MetricBar({ label, value, color, hasData }: { label: string, value: number, color: string, hasData: boolean }) {
  const colorMap: any = {
    cyan: { bg: 'bg-cyan-500', text: 'text-cyan-400', glow: 'shadow-cyan-500/30' },
    amber: { bg: 'bg-amber-500', text: 'text-amber-400', glow: 'shadow-amber-500/30' },
    rose: { bg: 'bg-rose-500', text: 'text-rose-400', glow: 'shadow-rose-500/30' }
  };
  const colors = colorMap[color] || colorMap.cyan;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-end">
        <span className="text-[10px] text-slate-500 font-black tracking-widest uppercase">{label}</span>
        <span className={`text-[11px] font-black font-mono ${colors.text}`}>{hasData ? `${Math.round(value * 100)}%` : 'N/A'}</span>
      </div>
      <div className="w-full h-2 bg-slate-950/80 rounded-full overflow-hidden border border-slate-800 p-0.5">
        <div 
          className={`h-full ${colors.bg} rounded-full transition-all duration-700 ${colors.glow} shadow-lg`} 
          style={{ width: hasData ? `${value * 100}%` : '0%' }} 
        />
      </div>
    </div>
  );
}
