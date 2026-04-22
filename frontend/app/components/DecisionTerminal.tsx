'use client'

import { useState, useEffect, useMemo } from 'react'
import type { Match } from '../data/mockData'
import type { V11Decision } from '../lib/v11'
import { buildV11Message, actionLabel } from '../lib/v11'

type Mode = "PEAK" | "SOLID" | "CAUTION" | "DANGER"

const MODE_COLOR: Record<Mode, string> = {
  PEAK:   "#22d3ee",
  SOLID:  "#34d399",
  CAUTION:"#fbbf24",
  DANGER: "#f43f5e",
}

// Local fallback mode (when V11 offline)
function getLocalMode(recovery: number): Mode {
  if (recovery > 0.85) return "PEAK"
  if (recovery > 0.70) return "SOLID"
  if (recovery > 0.55) return "CAUTION"
  return "DANGER"
}

// Local fallback message (when V11 offline)
function buildLocalMessage(recovery: number, m: Match): string {
  const pct = Math.round(recovery * 100)
  if (recovery > 0.85) {
    return (
      `PEAK CONDITION ACTIVE :: Recovery at ${pct}% — travel fatigue neutralized. ` +
      `HRV trending +14% on ${m.away.abbr} starter over last 30 days. ` +
      `GAME PLAN :: Go aggressive on the bullpen — full-strength rotation available. ` +
      `Dominant performance window open — engine confidence HIGH.`
    )
  }
  if (recovery > 0.70) {
    return (
      `SOLID CONDITION :: Recovery at ${pct}% — within normal range. ` +
      `${m.away.abbr} rotation holding a mild edge. ` +
      `GAME PLAN :: Standard rotation deployment // watch the 7th-inning bullpen switch.`
    )
  }
  if (recovery > 0.55) {
    return (
      `WARNING :: Recovery at ${pct}% — fatigue catching up with the roster. ` +
      `Travel load is winning out — body clock not fully reset. ` +
      `GAME PLAN :: Limit starter pitch count // bump flagged players to watch list.`
    )
  }
  return (
    `DANGER ZONE :: Recovery at ${pct}% — team is running on fumes. Any edge is gone. ` +
    `GAME PLAN :: Hold aggressive calls // rest key rotation players // play it safe.`
  )
}

// V11-driven mode
function getModeFromV11(v11: V11Decision): Mode {
  if (v11.label === 'CHAOS')  return 'DANGER'
  if (v11.label === 'UPSET')  return 'CAUTION'
  if (v11.label === 'STRONG') return 'PEAK'
  return 'SOLID'
}

function TermAction({ icon, label, color, primary }: { icon: string; label: string; color: string; primary?: boolean }) {
  return (
    <button style={{
      padding: "12px 14px",
      background: primary ? color : "transparent",
      border: primary ? "none" : `1px solid ${color}40`,
      borderRadius: 3,
      fontFamily: "var(--font-mono), monospace", fontSize: 10, fontWeight: 800,
      color: primary ? "#020617" : color, letterSpacing: "0.24em",
      cursor: "pointer", display: "flex", alignItems: "center", gap: 8, justifyContent: "center",
      boxShadow: primary ? `0 0 18px ${color}44` : "none",
    }}>
      <span>{icon}</span>{label}
    </button>
  )
}

interface Props {
  m: Match
  recovery: number
  v11?: V11Decision | null
}

export default function DecisionTerminal({ m, recovery, v11 }: Props) {
  const [line, setLine] = useState("")

  const message = useMemo(() => {
    if (v11) return buildV11Message(v11, m.home.abbr, m.away.abbr)
    return buildLocalMessage(recovery, m)
  }, [v11, recovery, m])

  const mode = v11 ? getModeFromV11(v11) : getLocalMode(recovery)
  const modeColor = MODE_COLOR[mode]

  useEffect(() => {
    setLine("")
    let i = 0
    const t = setInterval(() => {
      i++
      setLine(message.slice(0, i))
      if (i >= message.length) clearInterval(t)
    }, 14)
    return () => clearInterval(t)
  }, [message])

  // Primary action button label
  const primaryLabel = v11
    ? actionLabel(v11.action, m.home.abbr, m.away.abbr)
    : "CONFIRM GAME PLAN"

  // Agent debate rows (only when V11 is live)
  const analyst = v11?.opinions.find(o => o.agent === 'AnalystAgent')
  const sharp   = v11?.opinions.find(o => o.agent === 'SharpAgent')

  return (
    <div style={{
      background: "#040917",
      borderTop: "1px solid rgba(148,163,184,0.1)",
      borderRight: "1px solid rgba(148,163,184,0.1)",
      borderBottom: "1px solid rgba(148,163,184,0.1)",
      borderLeft: `3px solid ${modeColor}`,
      borderRadius: 6, padding: "18px 22px",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{
            width: 8, height: 8, borderRadius: "50%", background: modeColor,
            boxShadow: `0 0 12px ${modeColor}`, animation: "pulse-dot 1.4s infinite",
            display: "inline-block",
          }} />
          <span style={{
            fontFamily: "var(--font-mono), monospace", fontSize: 10, fontWeight: 800,
            color: modeColor, letterSpacing: "0.32em",
          }}>
            {v11
              ? `ARBITER_V11.1 // DOMINANT: ${v11.dominant_agent} // ${mode}`
              : `DECISION_ENGINE_v4 // MODE :: ${mode}`
            }
          </span>
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          {v11 && (
            <span style={{
              fontFamily: "var(--font-mono), monospace", fontSize: 9,
              color: Math.abs(v11.edge_vs_market) >= 0.06 ? "#34d399" : "#475569",
              letterSpacing: "0.24em", fontWeight: 800,
            }}>
              EDGE {v11.edge_vs_market >= 0 ? '+' : ''}{(v11.edge_vs_market * 100).toFixed(1)}%
            </span>
          )}
          <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, color: "#475569", letterSpacing: "0.24em" }}>
            SIG_ID 0x{m.id.slice(-6).toUpperCase()}
          </span>
        </div>
      </div>

      {/* Agent debate (V11 only) */}
      {v11 && analyst && sharp && (
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12,
        }}>
          {[analyst, sharp].map(op => {
            const leanColor = op.lean === 'HOME' ? "#34d399" : op.lean === 'AWAY' ? "#f43f5e" : "#475569"
            return (
              <div key={op.agent} style={{
                padding: "8px 12px", background: "#030812",
                border: `1px solid ${leanColor}22`,
                borderLeft: `2px solid ${leanColor}`,
                borderRadius: 3,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, fontWeight: 800, color: leanColor, letterSpacing: "0.2em" }}>
                    {op.agent.replace('Agent', '').toUpperCase()}
                  </span>
                  <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 10, fontWeight: 800, color: leanColor }}>
                    {op.lean} {(op.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 8, color: "#64748b", letterSpacing: "0.06em", lineHeight: 1.5 }}>
                  {op.reasoning.split('.')[0]}.
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Typewriter output */}
      <div style={{
        background: "#020617", border: "1px solid rgba(148,163,184,0.06)",
        borderRadius: 3, padding: "14px 16px",
        fontFamily: "var(--font-mono), monospace", fontSize: 12,
        color: "#e2e8f0", lineHeight: 1.7, minHeight: 64,
      }}>
        <span style={{ color: modeColor, fontWeight: 800 }}>&gt;&gt;&nbsp;</span>
        {line}
        <span style={{
          display: "inline-block", width: 8, height: 14, background: modeColor,
          marginLeft: 2, verticalAlign: "middle", animation: "blink 1s steps(2) infinite",
        }} />
      </div>

      {/* Actions */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 14 }}>
        <TermAction primary icon="✓" label={primaryLabel} color={modeColor} />
        <TermAction icon="◎" label="FLAG FOR MONITORING" color="#fbbf24" />
        <TermAction icon="⊘" label="OVERRIDE / HOLD" color="#64748b" />
      </div>
    </div>
  )
}
