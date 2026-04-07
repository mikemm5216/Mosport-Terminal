import EntityLogo from "@/src/components/EntityLogo";
import Link from 'next/link';
import { prisma } from "@/lib/prisma";
import { Shield, Activity, TrendingUp, Zap, ChevronRight, Target } from 'lucide-react';

function getMomentumColor(value: number) {
  if (value > 0.7) return 'shadow-[0_4px_20px_-2px_rgba(0,238,252,0.4)] border-b-primary-container';
  if (value < 0.3) return 'shadow-[0_4px_20px_-2px_rgba(244,114,182,0.4)] border-b-rose-500';
  return 'border-b-white/5';
}

export default async function TeamsAnalyticsPage({
  searchParams
}: {
  searchParams: Promise<{ sport?: string }>
}) {
  const { sport = 'SOCCER' } = await searchParams;

  const teams = await prisma.context.findMany({
    where: {
      sport_code: sport === 'SOCCER' ? 'EPL' : (sport as any)
    },
    orderBy: { name: 'asc' },
    include: {
      stats_logs: {
        take: 50,
        orderBy: { timestamp: 'desc' }
      }
    }
  });

  const FilterButton = ({ label, value, active }: { label: string, value: string, active: boolean }) => (
    <Link
      href={`/teams${value === 'ALL' ? '' : `?sport=${value}`}`}
      className={`px-6 py-2 rounded-xl border text-[10px] font-black tracking-[0.3em] transition-all uppercase flex items-center gap-2 ${active
        ? 'bg-primary-container/10 border-primary-container text-primary-container shadow-[0_0_15px_rgba(0,238,252,0.2)]'
        : 'bg-surface border-white/5 text-slate-600 hover:border-white/10 hover:text-slate-400'
        }`}
    >
      {active && <div className="w-1 h-1 rounded-full bg-primary-container animate-pulse" />}
      {label}
    </Link>
  );

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
          <FilterButton label="SOCCER" value="SOCCER" active={sport === 'SOCCER'} />
          <FilterButton label="NBA" value="NBA" active={sport === 'NBA'} />
          <FilterButton label="MLB" value="MLB" active={sport === 'MLB'} />
        </div>
      </div>

      {/* GRID SECTION */}
      {teams.length === 0 ? (
        <div className="flex flex-col items-center justify-center w-full min-h-[400px] border border-dashed border-white/5 rounded-[3rem] space-y-4">
          <Target size={40} className="text-slate-800" />
          <span className="text-slate-700 font-mono text-[10px] tracking-[0.5em] uppercase animate-pulse">
            [ NO UNITS DETECTED IN SECTOR_{sport} ]
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
          {teams.map((team: any) => {
            const logs = team.stats_logs || [];
            const accuracy = logs.find((l: any) => l.metric_type === 'ACCURACY')?.value || 0.85;
            const momentum = logs.find((l: any) => l.metric_type === 'MOMENTUM')?.value || 0.5;
            const winRate = logs.find((l: any) => l.metric_type === 'WIN_RATE')?.value || 0.5;

            return (
              <div
                key={team.public_uuid}
                className={`bg-surface-container-highest border border-white/5 border-b-2 rounded-[2rem] p-6 hover:bg-surface-bright/40 transition-all group relative overflow-hidden flex flex-col justify-between h-[340px] ${getMomentumColor(momentum)}`}
              >
                {/* LOGO AREA */}
                <div className="flex items-center justify-between mb-8">
                  <div className="w-14 h-14 bg-surface rounded-2xl border border-white/5 flex items-center justify-center p-2 relative">
                    <div className="absolute inset-0 bg-primary-container/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    <EntityLogo
                      entityHash={team.short_name === 'LAD' ? 'Mpt_A1X9' : 'UNKNOWN'}
                      className="w-full h-full object-contain grayscale brightness-200 mix-blend-plus-lighter drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                    />
                  </div>
                  <div className="text-right">
                    <span className="block text-2xl font-headline font-black text-white italic tracking-tighter uppercase leading-none group-hover:text-primary-container transition-colors">
                      {team.team_code}
                    </span>
                    <span className="text-[8px] font-black text-slate-700 uppercase tracking-widest leading-none mt-1 italic block">
                      {team.name}
                    </span>
                  </div>
                </div>

                {/* METRICS */}
                <div className="space-y-5 flex-1">
                  <MiniMetric label="Accuracy" value={accuracy} color="text-emerald-400" />
                  <MiniMetric label="Momentum" value={momentum} color="text-primary-container" />
                  <MiniMetric label="Win Rate" value={winRate} color="text-rose-400" />
                </div>

                {/* FOOTER */}
                <div className="mt-8 pt-4 border-t border-white/5 flex justify-between items-center">
                  <div className="flex gap-1.5 items-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Live Sync</span>
                  </div>
                  <Link
                    href={`/teams/${team.public_uuid}`}
                    className="p-2 bg-white/5 rounded-lg group-hover:bg-primary-container transition-all hover:scale-110"
                  >
                    <Activity size={12} className="text-slate-600 group-hover:text-surface" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MiniMetric({ label, value, color }: { label: string, value: number, color: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center px-1">
        <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest">{label}</span>
        <span className={`text-[10px] font-black font-mono leading-none ${color}`}>
          {Math.round(value * 100)}%
        </span>
      </div>
      <div className="w-full h-1 bg-surface-bright rounded-full overflow-hidden p-[1px]">
        <div
          className="h-full bg-white/10 rounded-full transition-all duration-1000"
          style={{ width: `${value * 100}%` }}
        />
        <div
          className={`h-full absolute top-0 left-0 bg-current transition-all duration-1000 opacity-20 ${color.replace('text-', 'bg-')}`}
          style={{ width: `${value * 100}%` }}
        />
      </div>
    </div>
  );
}
