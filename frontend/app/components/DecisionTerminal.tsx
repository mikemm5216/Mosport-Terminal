'use client'

import { useState, useEffect, useMemo } from 'react'
import type { Match } from '../data/mockData'
import type { V11Decision } from '../lib/v11'
import { buildV11Message, actionLabel } from '../lib/v11'
import { generateSimulatedPlayers } from '../lib/playerReadiness'
import { buildCoachDecision } from '../lib/coachDecisionEngine'
import { CoachDecisionLevel } from '../contracts/coachDecision'

type Mode = 'PEAK' | 'SOLID' | 'CAUTION' | 'DANGER'

const MODE_COLOR: Record<Mode | CoachDecisionLevel, string> = {
  PEAK: '#22d3ee',
  SOLID: '#34d399',
  CAUTION: '#fbbf24',
  DANGER: '#f43f5e',
  INFO: '#22d3ee',
  WATCH: '#fbbf24',
  ACTION: '#fbbf24',
  URGENT: '#f43f5e',
}

function getLocalMode(recovery: number): Mode {
  if (recovery > 0.85) return 'PEAK'
  if (recovery > 0.7) return 'SOLID'
  if (recovery > 0.55) return 'CAUTION'
  return 'DANGER'
}

function buildLocalMessage(recovery: number, m: Match): string {
  const pct = Math.round(recovery * 100)

  if (recovery > 0.85) {
    return (
      `PEAK CONDITION ACTIVE :: Recovery at ${pct}% // travel fatigue neutralized. ` +
      `HRV trending +14% on ${m.away.abbr} starter over last 30 days. ` +
      `COACH MODE :: Attack Mismatch // full-strength rotation available. ` +
      `Lineup Action :: press the favorable stretch before rhythm cools.`
    )
  }

  if (recovery > 0.7) {
    return (
      `SOLID CONDITION :: Recovery at ${pct}% // within normal range. ` +
      `${m.away.abbr} rotation is holding stable shape. ` +
      `COACH MODE :: Keep Lineup // watch the next rotation decision.`
    )
  }

  if (recovery > 0.55) {
    return (
      `WARNING :: Recovery at ${pct}% // fatigue catching up with the roster. ` +
      `Travel load is winning out // body clock not fully reset. ` +
      `COACH MODE :: Adjust Rotation // trim minutes for flagged players.`
    )
  }

  return (
    `DANGER ZONE :: Recovery at ${pct}% // team is running on fumes and the lineup is near collapse. ` +
    `COACH MODE :: Bench Player // protect the rotation and stop the slide.`
  )
}

function getModeFromV11(v11: V11Decision): Mode {
  if (v11.label === 'CHAOS') return 'DANGER'
  if (v11.label === 'UPSET') return 'CAUTION'
  if (v11.label === 'STRONG') return 'PEAK'
  return 'SOLID'
}

function TermAction({ icon, label, color, primary }: { icon: string; label: string; color: string; primary?: boolean }) {
  return (
    <button
      style={{
        padding: '12px 14px',
        background: primary ? color : 'transparent',
        border: primary ? 'none' : `1px solid ${color}40`,
        borderRadius: 3,
        fontFamily: 'var(--font-mono), monospace',
        fontSize: 10,
        fontWeight: 800,
        color: primary ? '#020617' : color,
        letterSpacing: '0.24em',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        justifyContent: 'center',
        boxShadow: primary ? `0 0 18px ${color}44` : 'none',
      }}
    >
      <span>{icon}</span>
      {label}
    </button>
  )
}

function getDecisionConfidence(decision: V11Decision | null | undefined): number {
  if (!decision) return 0.0

  const candidates = [
    decision.final_probability_home,
    decision.market_home_prob,
    decision.decision_score,
  ].filter((v): v is number => typeof v === 'number' && Number.isFinite(v))

  if (typeof decision.decision_score === 'number' && Number.isFinite(decision.decision_score)) {
    return Math.max(0.35, Math.min(0.9, Math.abs(decision.decision_score)))
  }

  if (candidates.length > 0) {
    const v = candidates[0]
    return Math.max(0.35, Math.min(0.9, Math.abs(v - 0.5) * 2 + 0.35))
  }

  return 0.0
}

interface Props {
  m: Match
  recovery: number
  v11?: V11Decision | null
}

export default function DecisionTerminal({ m, recovery, v11 }: Props) {
  const [line, setLine] = useState('')

  const homePlayers = useMemo(() => generateSimulatedPlayers(m, 'home'), [m])
  const awayPlayers = useMemo(() => generateSimulatedPlayers(m, 'away'), [m])

  const coachDecision = useMemo(() => {
    return buildCoachDecision({
      match: m,
      homePlayers,
      awayPlayers,
      v11Decision: v11,
      teamState: {
        physical_load: recovery < 0.6 ? 0.75 : 0.4,
        rotation_risk: recovery < 0.65 ? 0.7 : 0.35,
        data_confidence: getDecisionConfidence(v11)
      }
    })
  }, [m, homePlayers, awayPlayers, v11, recovery])

  const message = coachDecision.summary

  const modeColor = MODE_COLOR[coachDecision.level]

  useEffect(() => {
    setLine('')
    let i = 0
    const t = setInterval(() => {
      i += 1
      setLine(message.slice(0, i))
      if (i >= message.length) clearInterval(t)
    }, 14)
    return () => clearInterval(t)
  }, [message])

  const primaryLabel = `APPLY: ${coachDecision.action.replace(/_/g, ' ')}`

  const analyst = v11?.opinions.find((o) => o.agent === 'AnalystAgent')
  const sharp = v11?.opinions.find((o) => o.agent === 'SharpAgent')

  return (
    <div
      style={{
        background: '#040917',
        borderTop: '1px solid rgba(148,163,184,0.1)',
        borderRight: '1px solid rgba(148,163,184,0.1)',
        borderBottom: '1px solid rgba(148,163,184,0.1)',
        borderLeft: `3px solid ${modeColor}`,
        borderRadius: 6,
        padding: '18px 22px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: modeColor,
              boxShadow: `0 0 12px ${modeColor}`,
              animation: 'pulse-dot 1.4s infinite',
              display: 'inline-block',
            }}
          />
          <span
            style={{
              fontFamily: 'var(--font-mono), monospace',
              fontSize: 10,
              fontWeight: 800,
              color: modeColor,
              letterSpacing: '0.32em',
            }}
          >
            COACH_DECISION // {coachDecision.level} // {coachDecision.action}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          {v11 && (
            <span
              style={{
                fontFamily: 'var(--font-mono), monospace',
                fontSize: 9,
                color: Math.abs(v11.edge_vs_market) >= 0.06 ? '#34d399' : '#475569',
                letterSpacing: '0.24em',
                fontWeight: 800,
              }}
            >
              TEAM STATE {v11.edge_vs_market >= 0 ? '+' : ''}
              {(v11.edge_vs_market * 100).toFixed(1)}%
            </span>
          )}
          <span style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 9, color: '#475569', letterSpacing: '0.24em' }}>
            SIG_ID 0x{m.id.slice(-6).toUpperCase()}
          </span>
        </div>
      </div>

      {coachDecision && (
        <div style={{ marginBottom: 12 }}>
          <div style={{
            fontFamily: 'var(--font-mono), monospace',
            fontSize: 9,
            fontWeight: 800,
            color: '#64748b',
            letterSpacing: '0.15em',
            marginBottom: 6,
          }}>
            RATIONALE:
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 6 }}>
            {coachDecision.rationale.map((r, i) => (
              <div key={i} style={{
                padding: '6px 12px',
                background: '#030812',
                border: '1px solid rgba(148,163,184,0.06)',
                borderLeft: `2px solid ${modeColor}`,
                borderRadius: 2,
                fontFamily: 'var(--font-mono), monospace',
                fontSize: 9,
                color: '#94a3b8',
              }}>
                • {r}
              </div>
            ))}
          </div>
        </div>
      )}

      {v11 && analyst && sharp && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12, opacity: 0.7 }}>
          {[analyst, sharp].map((op) => {
            const leanColor = op.lean === 'HOME' ? '#34d399' : op.lean === 'AWAY' ? '#f43f5e' : '#475569'
            return (
              <div
                key={op.agent}
                style={{
                  padding: '6px 10px',
                  background: '#030812',
                  border: `1px solid ${leanColor}22`,
                  borderRadius: 3,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                  <span style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 8, fontWeight: 800, color: leanColor }}>
                    {op.agent.replace('Agent', '').toUpperCase()}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 8, color: '#475569' }}>
                    {op.lean}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div
        style={{
          background: '#020617',
          border: '1px solid rgba(148,163,184,0.06)',
          borderRadius: 3,
          padding: '14px 16px',
          fontFamily: 'var(--font-mono), monospace',
          fontSize: 12,
          color: '#e2e8f0',
          lineHeight: 1.7,
          minHeight: 64,
        }}
      >
        <span style={{ color: modeColor, fontWeight: 800 }}>&gt;&gt;&nbsp;</span>
        {line}
        <span
          style={{
            display: 'inline-block',
            width: 8,
            height: 14,
            background: modeColor,
            marginLeft: 2,
            verticalAlign: 'middle',
            animation: 'blink 1s steps(2) infinite',
          }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 14 }}>
        <TermAction primary icon=">>" label={primaryLabel} color={modeColor} />
        <TermAction icon="[]" label={m.league === 'MLB' ? 'BULLPEN ALERT' : 'WATCH ROTATION'} color="#fbbf24" />
        <TermAction icon="--" label="NO FORCED CHANGE" color="#64748b" />
      </div>
    </div>
  )
}
