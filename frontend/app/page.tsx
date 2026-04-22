import OutperformanceAlert from './components/UpsetHunter'
import DecisionCard        from './components/DecisionCard'
import DashboardClient     from './components/DashboardClient'
import { GAMES }           from './data/mockData'

export default function Home() {
  const highConviction = GAMES.filter(g =>
    g.decision.label === 'OUTPERFORMANCE' && g.confidence >= 0.65
  )
  const monitor = GAMES.filter(g => !highConviction.includes(g))

  return (
    <div
      className="min-h-screen grid"
      style={{ gridTemplateColumns: '280px 1fr 270px', background: '#050505' }}
    >
      <DashboardClient>
        {/* Decision Stream header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl font-bold text-white tracking-tight">Decision Stream</h1>
            <span
              className="text-[9px] font-mono px-2 py-0.5 rounded-full uppercase tracking-wider"
              style={{ background: 'rgba(34,197,94,0.1)', color: '#22C55E' }}
            >
              LIVE · Apr 21 2026
            </span>
          </div>
          <p className="text-xs" style={{ color: '#71717A' }}>
            {GAMES.length} MLB games today &middot;{' '}
            {highConviction.length} outperformance signals
          </p>
        </div>

        <OutperformanceAlert games={GAMES} />

        {highConviction.length > 0 && (
          <section className="mb-4">
            <SectionLabel
              text="High Conviction"
              count={highConviction.length}
              color="#22C55E"
            />
            <div className="space-y-3">
              {highConviction.map((g, i) => (
                <DecisionCard key={g.game_id} game={g} index={i} />
              ))}
            </div>
          </section>
        )}

        {monitor.length > 0 && (
          <section>
            <SectionLabel
              text="Monitor"
              count={monitor.length}
              color="#3F3F46"
            />
            <div className="space-y-3">
              {monitor.map((g, i) => (
                <DecisionCard key={g.game_id} game={g} index={highConviction.length + i} />
              ))}
            </div>
          </section>
        )}
      </DashboardClient>
    </div>
  )
}

function SectionLabel({ text, count, color }: {
  text: string; count: number; color: string
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      <span className="text-[10px] font-mono tracking-widest uppercase" style={{ color: '#71717A' }}>
        {text}
      </span>
      <span className="text-[9px] font-mono px-1.5 rounded"
        style={{ background: '#1a1a22', color: '#52525B' }}>
        {count}
      </span>
    </div>
  )
}
