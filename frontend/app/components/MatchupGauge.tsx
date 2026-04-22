'use client'

import type { Match } from '../data/mockData'
import { leagueTheme, RingGauge, TacticalLabel } from './ui'

function CausalFactor({ label, magnitude, dir, detail }: {
  label: string; magnitude: number; dir: "+" | "−"; detail: string
}) {
  const positive = dir === "+"
  const color = positive ? "#34d399" : "#f43f5e"
  const width = Math.min(100, Math.abs(magnitude) * 100 * 3)
  return (
    <div style={{ padding: "10px 0", borderBottom: "1px solid rgba(148,163,184,0.05)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
        <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 10, fontWeight: 800, color: "#e2e8f0", letterSpacing: "0.14em" }}>
          {label}
        </span>
        <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 12, fontWeight: 800, color, letterSpacing: "-0.02em" }}>
          {dir}{(Math.abs(magnitude) * 100).toFixed(1)}%
        </span>
      </div>
      <div style={{ position: "relative", height: 4, background: "#0b1220", borderRadius: 2, overflow: "hidden" }}>
        <div style={{
          position: "absolute",
          left: positive ? "50%" : undefined,
          right: positive ? undefined : "50%",
          top: 0, height: "100%", width: `${width / 2}%`,
          background: `linear-gradient(${positive ? "90deg" : "270deg"}, ${color}, ${color}88)`,
          boxShadow: `0 0 8px ${color}88`,
        }} />
        <div style={{ position: "absolute", left: "50%", top: -1, bottom: -1, width: 1, background: "#334155" }} />
      </div>
      <div style={{ marginTop: 5, fontFamily: "var(--font-mono), monospace", fontSize: 9, color: "#64748b", letterSpacing: "0.08em" }}>
        {detail}
      </div>
    </div>
  )
}

interface Props {
  m: Match
  adjustedOverride?: number
}

export default function MatchupGauge({ m, adjustedOverride }: Props) {
  const t = leagueTheme(m.league)
  const baseline = m.baseline_win
  const adjusted = adjustedOverride ?? m.physio_adjusted
  const delta = adjusted - baseline
  const positive = delta >= 0
  const wpaColor = positive ? "#22d3ee" : "#f43f5e"

  const factors: { label: string; magnitude: number; dir: "+" | "−"; detail: string }[] = [
    {
      label: "BULLPEN FATIGUE PENALTY",
      magnitude: m.recovery_home < 0.7 ? 0.024 : 0.015,
      dir: m.recovery_home < 0.7 ? "−" : "+",
      detail: `${m.home.abbr} bullpen load flagged — 3 high-leverage relievers on MONITOR`,
    },
    {
      label: "TRAVEL BURDEN",
      magnitude: 0.018,
      dir: "−",
      detail: `${m.away.abbr} west-coast origin // 2h tz shift // 7h flight recovery lag`,
    },
    {
      label: "MATCHUP SYNERGY",
      magnitude: 0.033,
      dir: "+",
      detail: `${m.away.abbr} SP vs ${m.home.abbr} RHB wOBA-diff +0.042 // platoon advantage in lineup`,
    },
    {
      label: "ROSTER READINESS Δ",
      magnitude: 0.026,
      dir: "+",
      detail: `Aggregate recovery surplus ${Math.round(m.recovery_away * 100)}% vs ${Math.round(m.recovery_home * 100)}% // largest delta on slate`,
    },
  ]

  return (
    <div style={{
      background: "#050b1b",
      border: "1px solid rgba(148,163,184,0.08)",
      borderRadius: 6, padding: "22px 24px",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div style={{
          fontFamily: "var(--font-mono), monospace", fontSize: 10, fontWeight: 700,
          letterSpacing: "0.32em", color: "#64748b", textTransform: "uppercase",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <span style={{ width: 14, height: 1, background: "#64748b", opacity: 0.5 }} />
          MATCHUP GAUGE / TACTICAL EDGE
        </div>
        <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, color: "#475569", letterSpacing: "0.22em" }}>
          COMPLEXITY {(m.matchup_complexity * 100).toFixed(0)} / 100
        </div>
      </div>

      {/* Dual ring gauges */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 16, padding: "8px 0 20px" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <RingGauge
            value={baseline} size={170} thickness={10}
            color="#60a5fa" track="#0b1220"
            label="BASELINE" sublabel="STAT PROJECTION"
          />
        </div>

        {/* Delta + WPA */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, color: "#475569", letterSpacing: "0.3em", fontWeight: 800 }}>EDGE SHIFT</div>
          <div style={{
            fontFamily: "var(--font-mono), monospace", fontSize: 30, fontWeight: 800,
            color: wpaColor, letterSpacing: "-0.04em",
            textShadow: `0 0 22px ${wpaColor}55`,
          }}>
            {positive ? "+" : "−"}{(Math.abs(delta) * 100).toFixed(1)}%
          </div>
          <div style={{ fontSize: 16, color: wpaColor, fontWeight: 800 }}>{positive ? "↑" : "↓"}</div>
          <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 8, color: wpaColor, letterSpacing: "0.26em", fontWeight: 800 }}>
            WIN IMPACT
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <RingGauge
            value={adjusted} size={170} thickness={10}
            color="#22d3ee" track="#0b1220"
            label="PHYSIO ADJUSTED" sublabel="MOSPORT CORE"
          />
        </div>
      </div>

      {/* Tactical label */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "12px 14px", background: "rgba(34,211,238,0.04)",
        border: "1px solid rgba(34,211,238,0.2)", borderRadius: 4, marginBottom: 18,
      }}>
        <TacticalLabel label={m.tactical_label} />
        <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 10, color: "#94a3b8", letterSpacing: "0.1em" }}>
          edge favors <span style={{ color: "#fff", fontWeight: 800 }}>{m.perspective}</span> roster / {m.away.abbr}
        </span>
      </div>

      {/* Causal factors */}
      <div style={{
        fontFamily: "var(--font-mono), monospace", fontSize: 10, fontWeight: 700,
        letterSpacing: "0.32em", color: "#64748b", textTransform: "uppercase",
        display: "flex", alignItems: "center", gap: 8, marginBottom: 10,
      }}>
        <span style={{ width: 14, height: 1, background: "#64748b", opacity: 0.5 }} />
        KEY FACTORS
      </div>
      <div>
        {factors.map((f, i) => <CausalFactor key={i} {...f} />)}
      </div>
    </div>
  )
}
