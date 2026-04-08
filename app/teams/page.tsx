import EntityLogo from "@/src/components/EntityLogo";
import { ENTITY_REGISTRY } from "@/src/config/entityRegistry";
import Link from 'next/link';
import { prisma } from "@/lib/prisma";
import { Shield, Activity, TrendingUp, Zap, ChevronRight, Target } from 'lucide-react';

function getHashByCode(internalCode: string) {
  for (const [hash, entity] of Object.entries(ENTITY_REGISTRY)) {
    if (entity.internalCode === internalCode) {
      return hash;
    }
  }
  return ""; // Fallback
}

function getMomentumColor(value: number) {
  if (value > 0.7) return 'border-cyan-500/30 shadow-[0_0_20px_rgba(0,238,252,0.1)]';
  if (value < 0.3) return 'border-rose-500/30 shadow-[0_0_20px_rgba(244,114,182,0.1)]';
  return 'border-white/5';
}

const SPORT_MAP: Record<string, string> = {
  'BASEBALL': '01',
  'SOCCER': '02',
  'BASKETBALL': '03',
  'ALL': 'ALL'
};

export default async function TeamsAnalyticsPage({
  searchParams
}: {
  searchParams: Promise<{ sport?: string; league?: string }>
}) {
  const { sport = 'ALL', league = 'ALL' } = await searchParams;
  const mappedSportCode = SPORT_MAP[sport.toUpperCase()] || 'ALL';

  const teams = await (prisma as any).context.findMany({
    where: {
      weight_level: '01',
      ...(mappedSportCode !== 'ALL' ? { sport_code: mappedSportCode } : {})
    },
    orderBy: { name: 'asc' },
    include: {
      stats_logs: {
        take: 10,
        orderBy: { timestamp: 'desc' }
      }
    }
  });

  const FilterButton = ({ label, value, active, type = 'sport' }: { label: string, value: string, active: boolean, type?: 'sport' | 'league' }) => {
    const baseUrl = '/teams';
    let href = baseUrl;

    if (type === 'sport') {
      href = value === 'ALL' ? baseUrl : `${baseUrl}?sport=${value}`;
    } else {
      href = value === 'ALL' ? `${baseUrl}?sport=${sport}` : `${baseUrl}?sport=${sport}&league=${value}`;
    }

    return (
      <Link
        href={href}
        className={`px-6 py-2 rounded-xl border text-[10px] font-black tracking-[0.3em] transition-all uppercase flex items-center gap-2 ${active
          ? 'bg-primary-container/10 border-primary-container text-primary-container shadow-[0_0_15px_rgba(0,238,252,0.2)]'
          : 'bg-surface border-white/5 text-slate-600 hover:border-white/10 hover:text-slate-400'
          }`}
      >
        {active && <div className="w-1 h-1 rounded-full bg-primary-container animate-pulse" />}
        {label}
      </Link>
    );
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-10">
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-[10px] font-black text-slate-600 uppercase tracking-[0.4em]">
            <span>Nexus</span>
            <ChevronRight size={10} />
            <span className="text-primary-container glow-text">Vault_Registry</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-headline font-black text-white italic tracking-tighter uppercase leading-none">
            Teams <span className="text-primary-container">Vault</span>
          </h1>
          <p className="text-slate-500 text-xs font-mono uppercase tracking-[0.4em] italic">
            ACTIVE_UNITS: {teams.length} // LATENT_SPACE_VERSION: 1.0.4
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <FilterButton label="ALL" value="ALL" active={sport === 'ALL'} />
          <FilterButton label="SOCCER" value="SOCCER" active={sport === 'SOCCER'} />
          <FilterButton label="BASKETBALL" value="BASKETBALL" active={sport === 'BASKETBALL'} />
          <FilterButton label="BASEBALL" value="BASEBALL" active={sport === 'BASEBALL'} />
        </div>
      </div>

      {/* MATRIX SUB-NAV */}
      {sport === 'SOCCER' && (
        <div className="flex items-center gap-3 flex-wrap animate-in slide-in-from-left-4 duration-500">
          <FilterButton label="ALL COUNTRIES" value="ALL" active={league === 'ALL'} type="league" />
          <FilterButton label="EPL" value="EPL" active={league === 'EPL'} type="league" />
          <FilterButton label="LA LIGA" value="ESP" active={league === 'ESP'} type="league" />
          <FilterButton label="SERIE A" value="ITA" active={league === 'ITA'} type="league" />
          <FilterButton label="BUNDESLIGA" value="GER" active={league === 'GER'} type="league" />
          <FilterButton label="LIGUE 1" value="FRA" active={league === 'FRA'} type="league" />
        </div>
      )}

      {sport === 'BASKETBALL' && (
        <div className="flex items-center gap-3 flex-wrap animate-in slide-in-from-left-4 duration-500">
          <FilterButton label="ALL COUNTRIES" value="ALL" active={league === 'ALL'} type="league" />
          <FilterButton label="NBA" value="NBA" active={league === 'NBA'} type="league" />
          <FilterButton label="TPBL" value="TPB" active={league === 'TPB'} type="league" />
          <FilterButton label="B.LEAGUE" value="BLG" active={league === 'BLG'} type="league" />
        </div>
      )}

      {sport === 'BASEBALL' && (
        <div className="flex items-center gap-3 flex-wrap animate-in slide-in-from-left-4 duration-500">
          <FilterButton label="ALL COUNTRIES" value="ALL" active={league === 'ALL'} type="league" />
          <FilterButton label="MLB" value="MLB" active={league === 'MLB'} type="league" />
          <FilterButton label="NPB" value="NPB" active={league === 'NPB'} type="league" />
          <FilterButton label="CPBL" value="CPB" active={league === 'CPB'} type="league" />
        </div>
      )}

      {/* GRID SECTION */}
      {(() => {
        const filteredTeams = teams.filter((team: any) => {
          if (sport !== 'ALL' && league !== 'ALL') {
            // Use exact string matching or simple includes
            const hash = getHashByCode(team.internal_code);
            return hash.includes(`_${league}`);
          }
          return true;
        });

        if (filteredTeams.length === 0) {
          return (
            <div className="flex flex-col items-center justify-center w-full min-h-[400px] border border-dashed border-white/5 rounded-[3rem] space-y-4">
              <Target size={40} className="text-slate-800" />
              <span className="text-slate-700 font-mono text-[10px] tracking-[0.5em] uppercase animate-pulse">
                [ NO UNITS DETECTED IN SECTOR_{sport}_{league} ]
              </span>
            </div>
          );
        }

        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
            {filteredTeams.map((team: any) => {
              const logs = team.stats_logs || [];
              // Extract latest values for key metrics
              const accuracy = logs.find((l: any) => l.metric_type === 'ACCURACY')?.value || 0;
              const momentum = logs.find((l: any) => l.metric_type === 'MOMENTUM')?.value || 0;
              const winRate = logs.find((l: any) => l.metric_type === 'WIN_RATE')?.value || 0;

              const correctHash = getHashByCode(team.internal_code);

              return (
                <div
                  key={team.public_uuid}
                  className={`bg-[#020617] border rounded-[2rem] p-6 hover:border-cyan-500/50 transition-all duration-500 group relative overflow-hidden flex flex-col justify-between h-[340px] ${getMomentumColor(momentum)}`}
                >
                  {/* SCAN-LINE OVERLAY */}
                  <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />

                  {/* LOGO AREA */}
                  <div className="flex items-center justify-between mb-8 relative z-10">
                    <div className="w-14 h-14 bg-black/40 rounded-2xl border border-white/5 flex items-center justify-center p-2 relative">
                      <div className="absolute inset-0 bg-primary-container/5 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                      <EntityLogo
                        entityHash={correctHash}
                        className="w-full h-full object-contain mix-blend-plus-lighter opacity-80 group-hover:opacity-100 transition-opacity"
                      />
                    </div>
                    <div className="text-right">
                      <span className="block text-2xl font-headline font-black text-white italic tracking-tighter uppercase leading-none group-hover:text-primary-container transition-colors drop-shadow-[0_0_8px_rgba(0,238,252,0.3)]">
                        {team.team_code}
                      </span>
                      <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none mt-1 italic block overflow-hidden text-ellipsis whitespace-nowrap max-w-[120px]">
                        {team.name}
                      </span>
                    </div>
                  </div>

                  {/* METRICS */}
                  <div className="space-y-4 flex-1 relative z-10">
                    <MiniMetric label="Accuracy" value={accuracy} color="text-emerald-400" />
                    <MiniMetric label="Momentum" value={momentum} color="text-primary-container" />
                    <MiniMetric label="Win Rate" value={winRate} color="text-rose-400" />
                  </div>

                  {/* FOOTER */}
                  <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center relative z-10">
                    <div className="flex gap-1.5 items-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50 animate-pulse" />
                      <span className="text-[8px] font-black text-emerald-500/50 uppercase tracking-widest">Live Sync</span>
                    </div>
                    <Link
                      href={`/teams/${team.public_uuid}`}
                      className="p-2 bg-white/5 rounded-lg border border-white/5 hover:border-primary-container transition-all hover:scale-110"
                    >
                      <Activity size={12} className="text-slate-500 group-hover:text-primary-container" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}
    </div>
  );
}

function MiniMetric({ label, value, color }: { label: string, value: number, color: string }) {
  const needsCalibration = value <= 0;

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center px-1">
        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
        {needsCalibration ? (
          <span className="text-[8px] font-black font-mono leading-none text-primary-container animate-pulse italic">
            [ CALIBRATING... ]
          </span>
        ) : (
          <span className={`text-[10px] font-black font-mono leading-none ${color}`}>
            {Math.round(value * 100)}%
          </span>
        )}
      </div>
      <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden p-[1px] relative">
        {!needsCalibration && (
          <>
            <div
              className="h-full bg-white/10 rounded-full transition-all duration-1000"
              style={{ width: `${value * 100}%` }}
            />
            <div
              className={`h-full absolute top-0 left-0 bg-current transition-all duration-1000 opacity-20 ${color.replace('text-', 'bg-')}`}
              style={{ width: `${value * 100}%` }}
            />
          </>
        )}
        {needsCalibration && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary-container/20 to-transparent animate-shimmer" />
        )}
      </div>
    </div>
  );
}
