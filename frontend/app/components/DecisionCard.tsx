'use client'

import { useState } from 'react'
import type { GameDecision, Label } from '../data/mockData'
import ProbabilityRing from './ProbabilityRing'

const LABEL_COLOR: Record<Label, string> = {
  OUTPERFORMANCE: '#22C55E',
  VULNERABILITY:  '#EF4444',
  TACTICAL:       '#A855F7',
  MONITOR:        '#3F3F46',
  COLLAPSE:       '#EF4444',
}

const LABEL_BG: Record<Label, string> = {
  OUTPERFORMANCE: 'rgba(34,197,94,0.12)',
  VULNERABILITY:  'rgba(239,68,68,0.12)',
  TACTICAL:       'rgba(168,85,247,0.12)',
  MONITOR:        'rgba(63,63,70,0.20)',
  COLLAPSE:       'rgba(239,68,68,0.12)',
}

const IMPACT_DOT: Record<string, string> = {
  positive: '#22C55E',
  negative: '#EF4444',
  neutral:  '#71717A',
}

interface Props {
  game: GameDecision
  index: number
}

export default function DecisionCard({ game, index }: Props) {
  const [collapsed, setCollapsed] = useState(false)

  const lbl        = collapsed ? ('COLLAPSE' as Label) : game.decision.label
  const color      = LABEL_COLOR[lbl]
  const bg         = LABEL_BG[lbl]
  const isUrgent   = lbl === 'OUTPERFORMANCE'
  const side       = game.best_side === 'HOME' ? game.home_code : game.away_code
  const mlStr      = game.market_expectation >= 0
    ? `+${game.market_expectation}`
    : `${game.market_expectation}`
  const displayWpa = collapsed ? '−23.4%' : `${game.wpa >= 0 ? '+' : ''}${game.wpa.toFixed(1)}%`
  const displayWin = collapsed ? 0.18 : game.adjusted_win_pct / 100

  return (
    <article
      className={`
        animate-rise card-${Math.min(index + 1, 6)}
        rounded-xl border overflow-hidden transition-all duration-500
        ${isUrgent && !collapsed ? 'animate-breathe' : ''}
      `}
      style={{
        background:  collapsed ? 'rgba(239,68,68,0.06)' : '#121217',
        borderColor: collapsed ? '#EF4444' : '#27272A',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[11px] font-mono text-zinc-500">{game.away_code}</span>
            <span className="text-zinc-600 text-xs">@</span>
            <span className="text-[11px] font-mono text-zinc-500">{game.home_code}</span>
            <span className="text-[10px] text-zinc-600 ml-1">{game.game_time_utc} UTC</span>
          </div>
          <div className="text-sm font-semibold text-zinc-200 leading-tight">
            {game.away_team} <span className="text-zinc-500">at</span> {game.home_team}
          </div>
        </div>

        <div className="flex flex-col items-end gap-1.5">
          <span className="text-xs font-bold px-3 py-1 rounded-full tracking-wider uppercase"
            style={{ color, background: bg }}>
            {lbl}
          </span>
          {game.whoop_sync.mode === 'MIRACLE' && !collapsed && (
            <span className="text-[9px] font-mono text-white/40 flex items-center gap-1">
              <span className="animate-blink inline-block w-1.5 h-1.5 rounded-full bg-white/60" />
              WHOOP ACTIVE
            </span>
          )}
        </div>
      </div>

      {/* Core metrics */}
      <div className="flex items-center gap-4 px-5 pb-4">
        <ProbabilityRing prob={displayWin} label={lbl} />
        <div className="flex-1 grid grid-cols-3 gap-3">
          <Metric label="TACTICAL DECISION" value={side}      color={color} mono />
          <Metric label="BASELINE PROJECTION" value={mlStr}   color={color} mono />
          <Metric label="PERFORMANCE IMPACT (WPA)" value={displayWpa}
            color={collapsed ? '#EF4444' : color} mono />
        </div>
      </div>

      {/* Causal signals */}
      <div className="px-5 pb-4 space-y-1.5">
        {game.causal_factors.map((f, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className="mt-[3px] flex-shrink-0 w-1.5 h-1.5 rounded-full"
              style={{ background: IMPACT_DOT[f.impact] }} />
            <span className="text-[11px] text-zinc-400 leading-snug">{f.factor}</span>
          </div>
        ))}
      </div>

      {/* WHOOP bar */}
      {game.whoop_sync.mode === 'MIRACLE' && !collapsed && (
        <div className="mx-5 mb-4 px-3 py-2 rounded-lg flex items-center gap-3"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <HeartIcon />
          <span className="text-[11px] text-zinc-400 flex-1">
            Biometrics elevated roster readiness by{' '}
            <span className="text-white font-semibold">
              +{Math.round(game.whoop_sync.impact_score * 100 * (1 + game.whoop_sync.recovery / 100))}%
            </span>
          </span>
          <span className="text-[10px] font-mono text-zinc-500">HRV {game.whoop_sync.hrv_delta}</span>
        </div>
      )}

      {/* Overtrain scenario */}
      {collapsed && (
        <div className="px-5 pb-4">
          <div className="rounded-lg px-3 py-2 text-[11px] text-red-400 font-mono"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            ⚠ LOAD COLLAPSE SCENARIO: Roster readiness depleted. Adjusted win% drops to 18%.
            Performance impact −23.4% WPA. Load management protocol: STANDBY.
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between px-5 py-3"
        style={{ borderTop: '1px solid #1e1e26' }}>
        <span className="text-[10px] font-mono text-zinc-600">
          CONF {Math.round(game.confidence * 100)}%
        </span>
        <button
          onClick={() => setCollapsed(v => !v)}
          className="text-[10px] font-mono px-3 py-1 rounded transition-colors"
          style={{
            color:      collapsed ? '#EF4444' : '#71717A',
            background: collapsed ? 'rgba(239,68,68,0.1)' : 'transparent',
            border:     `1px solid ${collapsed ? 'rgba(239,68,68,0.3)' : '#27272A'}`,
          }}
        >
          {collapsed ? 'RESTORE' : 'IF LOAD COLLAPSE →'}
        </button>
      </div>
    </article>
  )
}

function Metric({ label, value, color, mono }: {
  label: string; value: string; color: string; mono?: boolean
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[8px] text-zinc-600 tracking-widest uppercase leading-tight">{label}</span>
      <span className={`text-base font-bold leading-none ${mono ? 'font-mono' : ''}`}
        style={{ color }}>
        {value}
      </span>
    </div>
  )
}

function HeartIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 21.593c-5.63-5.539-11-10.297-11-14.402C1 4.03 3.697 2 7 2c1.97.001 3.886.687 5 2 1.114-1.313 3.03-2 5-2 3.302 0 6 2.032 6 5.19 0 4.104-5.369 8.863-11 14.403z"
        fill="white" opacity="0.8"
      />
    </svg>
  )
}
