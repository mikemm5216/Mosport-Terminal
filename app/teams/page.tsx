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
    if (sport === 'SOCCER') return t.league_type === 'FOOTBALL';
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
      className={`px-6 py-2 rounded border text-[10px] md:text-xs font-black tracking-[0.3em] transition-all uppercase ${active
        ? 'bg-cyan-500 border-cyan-400 text-white shadow-[0_0_20px_rgba(6,182,212,0.4)]'
        : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700'
        }`}
    >
      {icon} {label}
    </Link>
  );

  return (
    <div className="flex flex-col p-[2vh] h-screen w-screen overflow-hidden bg-[#020617] text-slate-200 selection:bg-cyan-500/30">
      {/* HEADER SECTION - FIXED HEIGHT */}
      <div className="w-full flex-none flex items-end justify-between border-b mx-auto border-slate-800/80 pb-[1vh] mb-[1.5vh]">
        <div>
          <h1 className="text-[3vw] md:text-[3vh] font-black text-white tracking-widest uppercase mb-[0.5vh] leading-none">
            Teams <span className="text-cyan-400">Vault</span>
          </h1>
          <p className="text-slate-500 text-[1vw] md:text-[1.2vh] font-mono uppercase tracking-[0.4em] leading-none">
            Squad Intelligence & Multi-Sport Grid
          </p>
        </div>

        <div className="flex gap-[1vw]">
          <FilterButton label="SOCCER" value="SOCCER" active={sport === 'SOCCER' || !sport} icon="" />
          <FilterButton label="NBA" value="NBA" active={sport === 'NBA'} icon="" />
          <FilterButton label="MLB" value="MLB" active={sport === 'MLB'} icon="" />
        </div>
      </div>

      {teams.length === 0 ? (
        <div className="flex items-center justify-center flex-1 w-full text-slate-600 font-mono text-[2vh] tracking-[0.3em] uppercase border border-dashed border-slate-900 rounded-2xl">
          NO MATCHING UNITS IN COLD DATABASE [{sport || 'ALL'}]
        </div>
      ) : (
        <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-[0.8vw] w-full flex-1 min-h-0 place-content-start overflow-hidden mx-auto">
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
                className="bg-[#0a111a]/80 border border-slate-800/80 rounded-[0.5vw] p-[0.8vw] hover:border-cyan-500/50 hover:bg-slate-900/90 transition-all group backdrop-blur-md relative overflow-hidden flex flex-col justify-between"
              >
                <div className="absolute top-0 right-0 w-[4vw] h-[4vw] bg-cyan-500/5 rounded-bl-full -mr-[1vw] -mt-[1vw] blur-lg group-hover:bg-cyan-500/10 transition-colors pointer-events-none" />

                <div>
                  <div className="flex items-center gap-[0.5vw] mb-[0.5vw] border-b border-slate-800/40 pb-[0.5vw]">
                    {team.logo_url ? (
                      <img
                        src={team.logo_url?.includes('||') ? team.logo_url.split('||')[1] : team.logo_url}
                        alt={team.full_name}
                        className="w-[2.5vw] h-[2.5vw] shrink-0 object-contain drop-shadow-[0_0_10px_rgba(255,255,255,0.1)] group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-[2.5vw] h-[2.5vw] shrink-0 bg-slate-950 rounded-full border border-slate-800 flex items-center justify-center text-slate-600 font-black text-[1vw]">
                        {team.short_name?.[0] || team.full_name[0]}
                      </div>
                    )}
                    <div className="flex flex-col truncate min-w-0">
                      <span className="text-white font-black text-[1.2vw] tracking-tighter uppercase leading-none group-hover:text-cyan-400 transition-colors">
                        {team.short_name || team.full_name.substring(0, 3).toUpperCase()}
                      </span>
                      <span className="text-[0.6vw] text-slate-500 font-bold truncate tracking-widest uppercase mt-[0.2vw] leading-none">
                        {team.full_name}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-[0.3vw]">
                    <MetricBar label="Momentum" value={momentum} color="cyan" hasData={hasData} />
                    <MetricBar label="Strength Ratio" value={strength} color="amber" hasData={hasData} />
                    <MetricBar label="Fatigue Load" value={fatigue} color="rose" hasData={hasData} />
                  </div>
                </div>

                <div className="mt-[0.5vw] pt-[0.4vw] border-t border-slate-800/40 flex justify-between items-center text-[0.55vw] font-black text-slate-500 tracking-[0.2em] uppercase leading-none">
                  <div className="flex gap-[0.2vw]">
                    {hasData ? last5.map((h, i) => (
                      <div key={i} title={h.result} className={`w-[0.4vw] h-[0.4vw] rounded-full ${getResultColor(h.result)}`} />
                    )) : null}
                  </div>
                  <span>{isNBA ? 'HOOPS' : isMLB ? 'DIAMOND' : 'PITCH'} {team.league_type}</span>
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
    <div className="flex flex-col gap-[0.2vw]">
      <div className="flex justify-between items-end leading-none">
        <span className="text-[0.55vw] text-slate-500 font-black tracking-[0.2em] uppercase">{label}</span>
        <span className={`text-[0.55vw] font-black font-mono leading-none ${textClass}`}>{hasData ? `${Math.round(value * 100)}%` : 'N/A'}</span>
      </div>
      <div className="w-full h-[0.4vw] bg-slate-950 rounded-full overflow-hidden p-[0.1vw] border border-slate-900">
        <div className={`h-full ${bgClass} rounded-full transition-all duration-1000`} style={{ width: hasData ? `${value * 100}%` : '0%' }} />
      </div>
    </div>
  );
}
