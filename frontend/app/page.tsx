import Sidebar       from './components/Sidebar'
import DecisionCard  from './components/DecisionCard'
import UpsetHunter   from './components/UpsetHunter'
import WhoopBioPanel from './components/WhoopBioPanel'
import { GAMES, WHOOP_DATA } from './data/mockData'

export default function Home() {
  const urgent = GAMES.filter(g => ['STRONG', 'UPSET'].includes(g.decision.label))
  const others  = GAMES.filter(g => !['STRONG', 'UPSET'].includes(g.decision.label))

  return (
    <div
      className="min-h-screen grid"
      style={{ gridTemplateColumns: '180px 1fr 260px', background: '#050505' }}
    >
      {/* ── Sidebar ─────────────────────────────── */}
      <Sidebar />

      {/* ── Main Feed ───────────────────────────── */}
      <main className="py-6 px-6 overflow-y-auto">
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
            {GAMES.length} MLB games today &middot; {urgent.length} actionable signals
          </p>
        </div>

        <UpsetHunter games={GAMES} />

        {urgent.length > 0 && (
          <section className="mb-4">
            <SectionLabel text="High Conviction" count={urgent.length} color="#22C55E" />
            <div className="space-y-3">
              {urgent.map((g, i) => (
                <DecisionCard key={g.game_id} game={g} index={i} />
              ))}
            </div>
          </section>
        )}

        {others.length > 0 && (
          <section className="mt-6">
            <SectionLabel text="Monitor" count={others.length} color="#3F3F46" />
            <div className="space-y-3">
              {others.map((g, i) => (
                <DecisionCard key={g.game_id} game={g} index={urgent.length + i} />
              ))}
            </div>
          </section>
        )}
      </main>

      {/* ── Bio Panel ───────────────────────────── */}
      <aside
        className="py-6 px-4 overflow-y-auto"
        style={{ borderLeft: '1px solid #1a1a22' }}
      >
        <WhoopBioPanel data={WHOOP_DATA} />
      </aside>
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
      <span
        className="text-[9px] font-mono px-1.5 rounded"
        style={{ background: '#1a1a22', color: '#52525B' }}
      >
        {count}
      </span>
    </div>
  )
}
