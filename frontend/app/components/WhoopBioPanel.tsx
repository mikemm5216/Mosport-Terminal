'use client'

import { useState, useEffect } from 'react'
import type { Match, Player } from '../data/mockData'
import { ROSTER_DATA } from '../data/mockData'
import { BioBar } from './ui'

interface Props {
  m: Match
  recovery: number
  setRecovery: (v: number) => void
}

function BioStat({ label, team, value, color, icon }: { label: string; team: string; value: string; color: string; icon: string }) {
  return (
    <div style={{
      padding: "10px 12px", background: "#040917",
      border: "1px solid rgba(148,163,184,0.06)", borderRadius: 3,
      display: "flex", flexDirection: "column", gap: 3,
    }}>
      <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 8, fontWeight: 700, color: "#475569", letterSpacing: "0.24em" }}>
        {label} · {team}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span style={{ color, fontSize: 14 }}>{icon}</span>
        <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 17, fontWeight: 800, color, letterSpacing: "-0.03em" }}>{value}</span>
      </div>
    </div>
  )
}

const FLAG_MAP = {
  CLEAR:   { c: "#34d399", t: "CLEAR" },
  MONITOR: { c: "#fbbf24", t: "MONITOR" },
  REST:    { c: "#f43f5e", t: "REST REC." },
} as const

function RosterRow({ p }: { p: Player }) {
  const f = FLAG_MAP[p.flag]
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "28px 1.2fr 60px 60px 60px 80px",
      alignItems: "center", gap: 10,
      padding: "9px 10px", background: "#040917",
      border: "1px solid rgba(148,163,184,0.04)",
      borderLeft: `2px solid ${f.c}`,
      borderRadius: 3, marginBottom: 4,
    }}>
      <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, fontWeight: 800, color: "#64748b", letterSpacing: "0.1em" }}>
        #{p.num}
      </div>
      <div>
        <div style={{ fontFamily: "var(--font-inter), Inter", fontWeight: 800, fontSize: 12, color: "#fff" }}>{p.name}</div>
        <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 8, color: "#475569", letterSpacing: "0.2em", marginTop: 1 }}>{p.pos}</div>
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 11, fontWeight: 800, color: p.hrv > 0 ? "#34d399" : "#f43f5e" }}>
          {p.hrv > 0 ? "+" : ""}{p.hrv}%
        </div>
        <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 7, color: "#475569", letterSpacing: "0.2em" }}>HRV</div>
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 11, fontWeight: 800, color: "#e2e8f0" }}>{p.sleep}h</div>
        <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 7, color: "#475569", letterSpacing: "0.2em" }}>SLEEP</div>
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 11, fontWeight: 800, color: p.risk < 0.15 ? "#34d399" : p.risk < 0.3 ? "#fbbf24" : "#f43f5e" }}>
          {(p.risk * 100).toFixed(0)}%
        </div>
        <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 7, color: "#475569", letterSpacing: "0.2em" }}>RISK</div>
      </div>
      <div style={{
        textAlign: "center", padding: "3px 0", borderRadius: 2,
        background: `${f.c}18`, border: `1px solid ${f.c}50`,
        fontFamily: "var(--font-mono), monospace", fontSize: 9, fontWeight: 800,
        color: f.c, letterSpacing: "0.18em",
      }}>{f.t}</div>
    </div>
  )
}

export default function WhoopBioPanel({ m, recovery, setRecovery }: Props) {
  const [trend, setTrend] = useState(() =>
    Array.from({ length: 24 }, (_, i) => 70 + Math.sin(i * 0.4) * 8)
  )

  useEffect(() => {
    const t = setInterval(() => {
      setTrend(prev => {
        const next = [...prev.slice(1)]
        const target = recovery * 100
        const last = prev[prev.length - 1]
        next.push(last + (target - last) * 0.15 + (Math.random() * 2 - 1))
        return next
      })
    }, 900)
    return () => clearInterval(t)
  }, [recovery])

  const roster = ROSTER_DATA[m.id] ?? ROSTER_DATA["mlb_2026_min_nym"]
  const band = recovery > 0.75 ? "SURPLUS" : recovery > 0.55 ? "NOMINAL" : "DEGRADED"
  const bandColor = recovery > 0.75 ? "#34d399" : recovery > 0.55 ? "#22d3ee" : "#f43f5e"

  return (
    <div style={{
      background: "#050b1b",
      border: "1px solid rgba(148,163,184,0.08)",
      borderRadius: 6, padding: "22px 24px",
    }}>
      {/* Header */}
      <div style={{
        fontFamily: "var(--font-mono), monospace", fontSize: 10, fontWeight: 700,
        letterSpacing: "0.32em", color: "#22d3ee", textTransform: "uppercase",
        display: "flex", alignItems: "center", gap: 8, marginBottom: 14,
      }}>
        <span style={{ width: 14, height: 1, background: "#22d3ee", opacity: 0.5 }} />
        ROSTER READINESS &amp; BIOMETRICS
      </div>

      {/* Aggregate recovery hero */}
      <div style={{
        padding: "16px 18px", background: "#040917",
        border: "1px solid rgba(34,211,238,0.2)", borderRadius: 4, marginBottom: 16,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
          <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 10, color: "#64748b", letterSpacing: "0.26em", fontWeight: 800 }}>
            AGGREGATE RECOVERY — {m.away.abbr}
          </span>
          <span style={{
            fontFamily: "var(--font-mono), monospace", fontSize: 26, fontWeight: 800,
            color: "#34d399", letterSpacing: "-0.04em",
            textShadow: "0 0 20px rgba(52,211,153,0.45)",
          }}>{Math.round(recovery * 100)}%</span>
        </div>
        <BioBar value={recovery} color="#34d399" height={10} />

        {/* Live socket slider */}
        <div style={{ marginTop: 12 }}>
          <div style={{
            fontFamily: "var(--font-mono), monospace", fontSize: 9, fontWeight: 700,
            color: "#475569", letterSpacing: "0.24em", marginBottom: 6,
          }}>
            LIVE SOCKET :: RECOVERY STREAM
            <span style={{ color: bandColor, marginLeft: 8 }}>{band}</span>
          </div>
          <input
            type="range" min="0" max="100" value={Math.round(recovery * 100)}
            onChange={e => setRecovery(+e.target.value / 100)}
            style={{ width: "100%", cursor: "pointer" }}
          />
          <div style={{
            display: "flex", justifyContent: "space-between",
            fontFamily: "var(--font-mono), monospace", fontSize: 8,
            color: "#334155", letterSpacing: "0.24em", marginTop: 2,
          }}>
            <span>0% DEBT</span><span>50%</span><span>100% PEAK</span>
          </div>
        </div>

        {/* Sparkline */}
        <div style={{ marginTop: 14 }}>
          <svg width="100%" height="40" viewBox="0 0 240 40" preserveAspectRatio="none">
            {trend.map((v, i) => {
              if (i === 0) return null
              const x1 = ((i - 1) / (trend.length - 1)) * 240
              const x2 = (i / (trend.length - 1)) * 240
              const y1 = 40 - (trend[i - 1] / 100) * 34 - 2
              const y2 = 40 - (v / 100) * 34 - 2
              return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" opacity={i / trend.length} />
            })}
            <circle cx={240} cy={40 - (trend[trend.length - 1] / 100) * 34 - 2} r="3" fill="#34d399" style={{ filter: "drop-shadow(0 0 4px #34d399)" }} />
          </svg>
          <div style={{
            display: "flex", justifyContent: "space-between",
            fontFamily: "var(--font-mono), monospace", fontSize: 8,
            color: "#334155", letterSpacing: "0.24em", marginTop: 2,
          }}>
            <span>−24H</span><span>−12H</span><span>NOW</span>
          </div>
        </div>
      </div>

      {/* Bio stat grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        <BioStat label="SLEEP DEBT"  team={m.away.abbr} value="0.4h"  color="#34d399" icon="☾" />
        <BioStat label="SLEEP DEBT"  team={m.home.abbr} value="2.1h"  color="#f43f5e" icon="☾" />
        <BioStat label="HRV TREND"   team={m.away.abbr} value="+14%"  color="#34d399" icon="♡" />
        <BioStat label="HRV TREND"   team={m.home.abbr} value="−6%"   color="#f43f5e" icon="♡" />
        <BioStat label="STRAIN LOAD" team={m.away.abbr} value="13.4"  color="#22d3ee" icon="⚡" />
        <BioStat label="STRAIN LOAD" team={m.home.abbr} value="18.4"  color="#fb923c" icon="⚡" />
      </div>

      {/* Roster readiness */}
      <div style={{
        fontFamily: "var(--font-mono), monospace", fontSize: 10, fontWeight: 700,
        letterSpacing: "0.32em", color: "#64748b", textTransform: "uppercase",
        display: "flex", alignItems: "center", gap: 8, marginBottom: 10,
      }}>
        <span style={{ width: 14, height: 1, background: "#64748b", opacity: 0.5 }} />
        KEY PLAYER READINESS
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, fontWeight: 700, color: "#22d3ee", letterSpacing: "0.24em", marginBottom: 6 }}>
          ── {m.away.abbr} // ROTATION
        </div>
        {roster.away.slice(0, 2).map((p, i) => <RosterRow key={i} p={p} />)}
      </div>
      <div>
        <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, fontWeight: 700, color: "#f43f5e", letterSpacing: "0.24em", marginBottom: 6 }}>
          ── {m.home.abbr} // ROTATION
        </div>
        {roster.home.slice(0, 2).map((p, i) => <RosterRow key={i} p={p} />)}
      </div>
    </div>
  )
}
