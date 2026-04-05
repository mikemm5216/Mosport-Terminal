import TeamLogo from "@/components/TeamLogo";
import Link from 'next/link';
import { prisma } from "@/lib/prisma";

function getResultColor(won: boolean, draw: boolean) {
  if (won) return 'bg-emerald-500';
  if (draw) return 'bg-slate-500';
  return 'bg-rose-500';
}

export default async function TeamsAnalyticsPage({
  searchParams
}: {
  searchParams: Promise<{ sport?: string }>
}) {
  const { sport = 'SOCCER' } = await searchParams;

  const teams = await (prisma as any).teams.findMany({
    where: {
      league_type: sport === 'SOCCER' ? 'EPL' : (sport as any)
    },
    orderBy: { full_name: 'asc' },
    include: {
      matches_home: {
        take: 30,
        orderBy: { date: 'desc' },
        select: {
          homeScore: true, awayScore: true, status: true, date: true,
          predictionCorrect: true, predictedHomeWinRate: true
        },
      },
      matches_away: {
        take: 30,
        orderBy: { date: 'desc' },
        select: {
          homeScore: true, awayScore: true, status: true, date: true,
          predictionCorrect: true, predictedHomeWinRate: true
        },
      },
    },
  });

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
    <div className="flex flex-col h-screen w-full min-w-[320px] overflow-x-auto bg-[#020617] text-slate-200 selection:bg-cyan-500/30">
      <div className="w-full flex-none p-4 md:p-6 lg:p-8 border-b border-slate-800/80 bg-[#020617] z-10 shadow-md">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-8 max-w-[1600px] mx-auto">
          <div>
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-white tracking-widest uppercase mb-1 md:mb-2 leading-none">
              Teams <span className="text-cyan-400">Vault</span>
            </h1>
            <p className="text-slate-500 text-xs md:text-sm font-mono uppercase tracking-[0.4em] leading-none">
              Squad Intelligence &amp; Multi-Sport Grid
            </p>
          </div>
          <div className="flex items-center gap-2 md:gap-4 flex-wrap">
            <FilterButton label="SOCCER" value="SOCCER" active={sport === 'SOCCER' || !sport} icon="" />
            <FilterButton label="NBA" value="NBA" active={sport === 'NBA'} icon="" />
            <FilterButton label="MLB" value="MLB" active={sport === 'MLB'} icon="" />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto w-full px-4 py-6 md:p-8 lg:p-10 scroll-smooth">
        <div className="max-w-[1600px] mx-auto w-full">
          {teams.length === 0 ? (
            <div className="flex items-center justify-center w-full min-h-[300px] text-slate-600 font-mono text-sm md:text-lg tracking-[0.3em] uppercase border border-dashed border-slate-900 rounded-2xl">
              NO MATCHING UNITS IN DATABASE [{sport || 'ALL'}]
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 lg:gap-8 w-full">
              {teams.map((team: any) => {
                const homeGames = (team.matches_home || []).filter((m: any) => m.status === 'COMPLETED');
                const awayGames = (team.matches_away || []).filter((m: any) => m.status === 'COMPLETED');

                const allGames = [
                  ...homeGames.map((m: any) => ({
                    scored: m.homeScore ?? 0, conceded: m.awayScore ?? 0,
                    correct: m.predictionCorrect
                  })),
                  ...awayGames.map((m: any) => ({
                    scored: m.awayScore ?? 0, conceded: m.homeScore ?? 0,
                    correct: m.predictionCorrect
                  })),
                ];

                const total = allGames.length;
                const wins = allGames.filter(g => g.scored > g.conceded).length;

                // Settlement Accuracy
                const settledGames = allGames.filter(g => g.correct !== null);
                const modelAccuracy = settledGames.length > 0
                  ? settledGames.filter(g => g.correct === true).length / settledGames.length
                  : 0;

                const winRate = total > 0 ? wins / total : 0;
                const momentum = total >= 3
                  ? allGames.slice(0, 3).filter(g => g.scored > g.conceded).length / 3
                  : winRate;

                const hasData = total > 0;

                const last5 = allGames.slice(0, 5).map(g => ({
                  won: g.scored > g.conceded,
                  draw: g.scored === g.conceded,
                }));


                return (
                  <div
                    key={team.team_id}
                    className="bg-[#0a111a]/80 border border-slate-800/80 rounded-xl p-4 md:p-6 hover:border-cyan-500/50 hover:bg-slate-900/90 transition-all group backdrop-blur-md relative overflow-hidden flex flex-col justify-between shadow-xl"
                  >
                    <div className="absolute top-0 right-0 w-16 h-16 md:w-20 md:h-20 bg-cyan-500/5 rounded-bl-[4rem] -mr-4 -mt-4 blur-xl group-hover:bg-cyan-500/10 transition-colors pointer-events-none" />

                    <div>
                      <div className="flex items-center gap-3 md:gap-4 mb-4 border-b border-slate-800/40 pb-4">
                        <TeamLogo
                          code={`${team.league_type}_${team.short_name}`}
                          className="w-10 h-10 md:w-14 md:h-14 shrink-0 object-contain drop-shadow-[0_0_10px_rgba(255,255,255,0.1)] group-hover:scale-110 transition-transform duration-500"
                        />
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="text-cyan-400 font-black text-2xl md:text-3xl tracking-tighter uppercase leading-none group-hover:text-white transition-colors truncate">
                            {team.short_name}
                          </span>
                          <span className="text-[9px] md:text-[10px] text-slate-500 font-bold truncate tracking-widest uppercase mt-0.5 leading-tight italic">
                            {team.full_name}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <MetricBar label="Momentum" value={momentum} color="cyan" hasData={hasData} />
                        <MetricBar label="Model Accuracy" value={modelAccuracy} color="emerald" hasData={settledGames.length > 0} />
                        <MetricBar label="Win Rate" value={winRate} color="rose" hasData={hasData} />
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-800/40 flex justify-between items-center text-[9px] md:text-[10px] font-black text-slate-600 tracking-[0.1em] uppercase leading-none">
                      <div className="flex gap-1">
                        {hasData
                          ? last5.map((h, i) => (
                            <div key={i} className={`w-1.5 md:w-2 h-1.5 md:h-2 rounded-full ${getResultColor(h.won, h.draw)}`} />
                          ))
                          : <span className="text-slate-800 text-[7px] font-mono tracking-widest animate-pulse">[ NO RECENT DATA ]</span>
                        }
                      </div>
                      <span>{team.league_type === 'NBA' ? 'HOOPS' : team.league_type === 'MLB' ? 'DIAMOND' : 'PITCH'} {team.league_type}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricBar({ label, value, color, hasData }: { label: string, value: number, color: string, hasData: boolean }) {
  const colorMap: any = {
    cyan: 'bg-cyan-500 text-cyan-400',
    emerald: 'bg-emerald-500 text-emerald-400',
    rose: 'bg-rose-500 text-rose-400',
  };
  const [bgClass, textClass] = colorMap[color].split(' ');

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-end leading-none">
        <span className="text-[10px] md:text-xs text-slate-500 font-black tracking-[0.1em] uppercase">{label}</span>
        <span className={`text-[9px] md:text-[10px] font-black font-mono leading-none whitespace-nowrap ${hasData ? textClass : 'text-slate-700'}`}>
          {hasData ? `${Math.round(value * 100)}%` : '[ CALC ]'}
        </span>
      </div>
      <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden p-[1px] border border-slate-900">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${hasData ? bgClass : 'bg-slate-800 animate-pulse'}`}
          style={{ width: hasData ? `${Math.min(value * 100, 100)}%` : '25%' }}
        />
      </div>
    </div>
  );
}
