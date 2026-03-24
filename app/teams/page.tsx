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
      className={`px-6 py-2 rounded border text-[10px] md:text-xs font-black tracking-[0.3em] transition-all uppercase ${
        active 
          ? 'bg-cyan-500 border-cyan-400 text-white shadow-[0_0_20px_rgba(6,182,212,0.4)]' 
          : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700'
      }`}
    >
      {icon} {label}
    </Link>
  );

  return (
    <div className="flex flex-col items-center px-4 py-8 min-h-screen bg-slate-950 text-slate-200">
      <div className="w-full max-w-7xl mb-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-slate-800/80 pb-8">
          <div>
            <h1 className="text-4xl md:text-6xl font-black text-white tracking-widest uppercase mb-2">
              Teams <span className="text-cyan-400">Vault</span>
            </h1>
            <p className="text-slate-500 text-[10px] md:text-xs font-mono uppercase tracking-[0.4em]">
              Squad Intelligence & Multi-Sport Grid v2.1
            </p>
          </div>
          
          <div className="flex gap-4 flex-wrap">
            <FilterButton label="SOCCER" value="SOCCER" active={sport === 'SOCCER' || !sport} icon="" />
            <FilterButton label="NBA" value="NBA" active={sport === 'NBA'} icon="" />
            <FilterButton label="MLB" value="MLB" active={sport === 'MLB'} icon="" />
          </div>
        </div>
      </div>

      {teams.length === 0 ? (
        <div className="text-center p-24 text-slate-600 font-mono text-sm tracking-[0.3em] uppercase border border-dashed border-slate-900 rounded-2xl w-full max-w-7xl">
          NO MATCHING UNITS IN COLD DATABASE [{sport || 'ALL'}]
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 w-full max-w-7xl">
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
                className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 hover:border-cyan-500/50 hover:bg-slate-900/60 transition-all group backdrop-blur-md relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-16 h-16 bg-cyan-500/5 rounded-bl-full -mr-8 -mt-8 blur-xl group-hover:bg-cyan-500/10 transition-colors" />

                <div className="flex items-center gap-5 mb-6 border-b border-slate-800/40 pb-5">
                  {team.logo_url ? (
                    <img src={team.logo_url} alt={team.full_name} className="w-16 h-16 object-contain drop-shadow-[0_0_10px_rgba(255,255,255,0.1)] group-hover:scale-110 transition-transform duration-500" />
                  ) : (
                    <div className="w-16 h-16 bg-slate-950 rounded-full border border-slate-800 flex items-center justify-center text-slate-600 font-black text-xl">
                      {team.short_name?.[0] || team.full_name[0]}
                    </div>
                  )}
                  <div className="flex flex-col truncate min-w-0">
                    <span className="text-white font-black text-2xl tracking-tighter uppercase leading-tight group-hover:text-cyan-400 transition-colors">
                      {team.short_name || team.full_name.substring(0, 3).toUpperCase()}
                    </span>
                    <span className="text-[9px] text-slate-500 font-bold truncate tracking-widest uppercase mt-0.5">
                      {team.full_name}
                    </span>
                    <div className="flex gap-1.5 mt-2">
                      {hasData ? last5.map((h, i) => (
                        <div
                          key={i}
                          title={h.result}
                          className={`w-2.5 h-2.5 rounded-full ${getResultColor(h.result)} shadow-lg shadow-black/50`}
                        />
                      )) : (
                        <span className="text-[8px] text-slate-700 font-mono tracking-widest uppercase">No Signal Data</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <MetricBar label="Momentum" value={momentum} color="cyan" hasData={hasData} />
                  <MetricBar label="Strength Ratio" value={strength} color="amber" hasData={hasData} />
                  <MetricBar label="Fatigue Load" value={fatigue} color="rose" hasData={hasData} />
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800/40 flex justify-between items-center text-[9px] font-black text-slate-500 tracking-[0.2em] uppercase">
                  <span className="flex items-center gap-2">
                    {isNBA ? 'HOOPS' : isMLB ? 'DIAMOND' : 'PITCH'} {team.league_type} PRO
                  </span>
                  <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800">{history.length} MATCHES</span>
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
    cyan: 'bg-cyan-500 text-cyan-400',
    amber: 'bg-amber-500 text-amber-500',
    rose: 'bg-rose-500 text-rose-400'
  };
  const [bgClass, textClass] = colorMap[color].split(' ');

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-end">
        <span className="text-[10px] text-slate-500 font-black tracking-widest uppercase">{label}</span>
        <span className={`text-[10px] font-black font-mono ${textClass}`}>{hasData ? `${Math.round(value * 100)}%` : 'N/A'}</span>
      </div>
      <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-900">
        <div className={`h-full ${bgClass} rounded-full transition-all duration-1000`} style={{ width: hasData ? `${value * 100}%` : '0%' }} />
      </div>
    </div>
  );
}
