'use client'

import type { GameDecision, DecisionFactor } from '../data/mockData'

interface Props {
  game: GameDecision
  adjustedWin: number
}

function SemiGauge({
  pct, color, label, value,
}: { pct: number; color: string; label: string; value: string }) {
  const r = 72, cx = 90, cy = 84
  const sw = 9

  const bgPath = `M ${cx - r} ${cy} A ${r} ${r} 0 0 0 ${cx + r} ${cy}`

  let fillPath = ''
  if (pct > 0.005) {
    const angle = Math.PI * Math.min(pct, 0.999)
    const ex = cx - r * Math.cos(angle)
    const ey = cy - r * Math.sin(angle)
    fillPath = `M ${cx - r} ${cy} A ${r} ${r} 0 0 0 ${ex} ${ey}`
  }

  return (
    <div className="flex flex-col items-center">
      <svg width="100%" viewBox="0 0 180 100" style={{ overflow: 'visible' }}>
        <path d={bgPath} fill="none" stroke="#27272A" strokeWidth={sw} strokeLinecap="round" />
        {fillPath && (
          <path d={fillPath} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 4px ${color}66)` }} />
        )}
        <text x={cx} y={cy + 10} textAnchor="middle"
          fill="white" fontSize="18" fontWeight="700" fontFamily="monospace">
          {value}
        </text>
      </svg>
      <span className="text-[9px] font-mono tracking-widest uppercase mt-1"
        style={{ color: '#52525B' }}>
        {label}
      </span>
    </div>
  )
}

function FactorRow({ f }: { f: DecisionFactor }) {
  const color = f.positive ? '#22C55E' : '#EF4444'
  return (
    <div className="flex items-center justify-between py-1.5"
      style={{ borderBottom: '1px solid #18181f' }}>
      <div className="flex items-center gap-2">
        <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: color }} />
        <span className="text-[10px] text-zinc-400">{f.label}</span>
      </div>
      <span className="text-[10px] font-mono font-semibold" style={{ color }}>
        {f.value}
      </span>
    </div>
  )
}

export default function MatchupGauge({ game, adjustedWin }: Props) {
  const basePct = game.baseline_win_pct / 100
  const adjPct  = adjustedWin / 100
  const wpa     = adjustedWin - game.baseline_win_pct
  const label   = game.decision.label

  const accentColor =
    label === 'OUTPERFORMANCE' ? '#22C55E' :
    label === 'VULNERABILITY'  ? '#EF4444' :
    label === 'TACTICAL'       ? '#A855F7' : '#52525B'

  return (
    <aside
      className="sticky top-0 h-screen flex flex-col py-6 px-4 overflow-y-auto"
      style={{ borderRight: '1px solid #1a1a22' }}
    >
      {/* Header */}
      <div className="mb-5">
        <div className="text-[9px] font-mono tracking-widest text-zinc-600 uppercase mb-1">
          Matchup Gauge
        </div>
        <div className="text-sm font-bold text-white">
          {game.away_code} <span className="text-zinc-600">@</span> {game.home_code}
        </div>
        <div className="text-[10px] text-zinc-600 font-mono">{game.game_time_utc} UTC</div>
      </div>

      {/* Gauges */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <SemiGauge
          pct={basePct}
          color="#52525B"
          label="BASELINE WIN%"
          value={`${game.baseline_win_pct.toFixed(1)}%`}
        />
        <SemiGauge
          pct={adjPct}
          color={accentColor}
          label="ADJUSTED WIN%"
          value={`${adjustedWin.toFixed(1)}%`}
        />
      </div>

      {/* WPA callout */}
      <div
        className="rounded-xl px-4 py-3 mb-4"
        style={{
          background: `rgba(${label === 'OUTPERFORMANCE' ? '34,197,94' : '239,68,68'},0.07)`,
          border: `1px solid ${accentColor}33`,
        }}
      >
        <div className="text-[9px] font-mono tracking-widest text-zinc-500 uppercase mb-1">
          Performance Impact
        </div>
        <div className="text-xl font-bold font-mono" style={{ color: accentColor }}>
          {wpa >= 0 ? '+' : ''}{wpa.toFixed(1)}pp
        </div>
        <div className="text-[10px] text-zinc-500 mt-0.5">
          WPA {game.wpa >= 0 ? '+' : ''}{game.wpa.toFixed(1)}% · {game.best_side === 'AWAY' ? game.away_code : game.home_code} tactical advantage
        </div>
      </div>

      {/* Decision factors */}
      <div className="flex-1">
        <div className="text-[9px] font-mono tracking-widest text-zinc-600 uppercase mb-2">
          Decision Factors
        </div>
        <div>
          {game.decision_factors.map(f => (
            <FactorRow key={f.key} f={f} />
          ))}
        </div>
      </div>

      {/* Market expectation */}
      <div className="mt-4 pt-4" style={{ borderTop: '1px solid #1a1a22' }}>
        <div className="text-[9px] font-mono tracking-widest text-zinc-600 uppercase mb-1">
          Market Expectation
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-base font-bold font-mono text-white">
            {game.market_expectation >= 0 ? '+' : ''}{game.market_expectation}
          </span>
          <span className="text-[10px] text-zinc-600">
            {game.best_side} · CONF {Math.round(game.confidence * 100)}%
          </span>
        </div>
      </div>
    </aside>
  )
}
