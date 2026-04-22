'use client'

import { useState, useEffect, useMemo } from 'react'
import type { Match } from '../data/mockData'

type Mode = "MIRACLE" | "NOMINAL" | "CAUTION" | "CRITICAL"

const MODE_COLOR: Record<Mode, string> = {
  MIRACLE:  "#22d3ee",
  NOMINAL:  "#34d399",
  CAUTION:  "#fbbf24",
  CRITICAL: "#f43f5e",
}

function getMode(recovery: number): Mode {
  if (recovery > 0.85) return "MIRACLE"
  if (recovery > 0.70) return "NOMINAL"
  if (recovery > 0.55) return "CAUTION"
  return "CRITICAL"
}

function buildMessage(recovery: number, m: Match): string {
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
      `VULNERABILITY ALERT :: Recovery degradation detected. ` +
      `Travel fatigue no longer offset by physiological surplus. ` +
      `TACTICAL DECISION :: Load-manage starter pitch count // elevate monitor flags.`
    )
  }
  return (
    `CRITICAL DEBT :: Physiological edge collapsed. Tactical advantage has inverted. ` +
    `TACTICAL DECISION :: Hold pattern // recommend roster rest rotation // abort aggressive posture.`
  )
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
}

export default function DecisionTerminal({ m, recovery }: Props) {
  const [line, setLine] = useState("")
  const message = useMemo(() => buildMessage(recovery, m), [recovery, m])

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

  const mode = getMode(recovery)
  const modeColor = MODE_COLOR[mode]

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
            DECISION_ENGINE_CORE_v4 // MODE :: {mode}
          </span>
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, color: "#475569", letterSpacing: "0.24em" }}>
            SIG_ID 0x{m.id.slice(-6).toUpperCase()}
          </span>
          <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, color: "#475569", letterSpacing: "0.24em" }}>
            LATENCY 14MS
          </span>
        </div>
      </div>

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
        <TermAction primary icon="✓" label="ACCEPT TACTICAL DECISION" color="#22d3ee" />
        <TermAction icon="◎" label="FLAG FOR MONITORING" color="#fbbf24" />
        <TermAction icon="⊘" label="OVERRIDE / HOLD" color="#64748b" />
      </div>
    </div>
  )
}
