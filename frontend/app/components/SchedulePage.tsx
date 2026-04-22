'use client'

import { useState, useEffect } from 'react'
import type { Match, League, KeyPlayer } from '../data/mockData'
import { TODAY_MATCHES, getKeyPlayers } from '../data/mockData'
import { leagueTheme, TeamMark, LeagueBadge, LiveDot, TacticalLabel, wpaColor } from './ui'

// ── Date pill ────────────────────────────────────────────────
function DatePill() {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <button style={{
        background: "#050b1b", border: "1px solid rgba(148,163,184,0.1)",
        color: "#64748b", width: 28, height: 28, borderRadius: 4, cursor: "pointer",
        fontFamily: "var(--font-mono), monospace", fontSize: 12,
      }}>‹</button>
      <div style={{
        padding: "8px 16px",
        background: "#050b1b", border: "1px solid rgba(34,211,238,0.3)", borderRadius: 4,
        fontFamily: "var(--font-mono), monospace", fontSize: 11, fontWeight: 800,
        color: "#fff", letterSpacing: "0.2em",
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <span style={{ color: "#22d3ee" }}>●</span>
        APR 22, 2026 &nbsp; TUE
      </div>
      <button style={{
        background: "#050b1b", border: "1px solid rgba(148,163,184,0.1)",
        color: "#64748b", width: 28, height: 28, borderRadius: 4, cursor: "pointer",
        fontFamily: "var(--font-mono), monospace", fontSize: 12,
      }}>›</button>
    </div>
  )
}

// ── Dual probability bar ──────────────────────────────────────
function DualProbBar({ baseline, adjusted, color }: { baseline: number; adjusted: number; color: string }) {
  const low = Math.min(baseline, adjusted)
  const high = Math.max(baseline, adjusted)
  const growing = adjusted > baseline
  return (
    <div style={{
      position: "relative", height: 8, background: "#0b1220",
      border: "1px solid rgba(148,163,184,0.08)", borderRadius: 2, overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, height: "100%", width: `${low * 100}%`, background: "#334155" }} />
      <div style={{
        position: "absolute", top: 0, height: "100%",
        left: `${low * 100}%`, width: `${(high - low) * 100}%`,
        background: growing
          ? `linear-gradient(90deg, ${color}66, ${color})`
          : "repeating-linear-gradient(45deg, rgba(244,63,94,0.5) 0 3px, rgba(244,63,94,0.25) 3px 6px)",
        boxShadow: growing ? `0 0 8px ${color}88` : "0 0 8px rgba(244,63,94,0.5)",
      }} />
      <div style={{ position: "absolute", left: `${baseline * 100}%`, top: -2, bottom: -2, width: 2, background: "#f8fafc", opacity: 0.75 }} />
    </div>
  )
}

// ── Stat bar ──────────────────────────────────────────────────
function StatBar({ label, value, color, invert }: { label: string; value: number; color: string; invert?: boolean }) {
  const pct = Math.max(0, Math.min(1, value))
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{
          fontFamily: "var(--font-mono), monospace", fontSize: 8, fontWeight: 700,
          color: "#64748b", letterSpacing: "0.24em",
        }}>{label}</span>
        <span style={{
          fontFamily: "var(--font-mono), monospace", fontSize: 11, fontWeight: 800,
          color, letterSpacing: "-0.02em",
        }}>{(pct * 100).toFixed(0)}%</span>
      </div>
      <div style={{ height: 4, background: "#0b1220", borderRadius: 1, overflow: "hidden", border: "1px solid rgba(148,163,184,0.05)" }}>
        <div style={{
          width: `${pct * 100}%`, height: "100%",
          background: invert
            ? `repeating-linear-gradient(45deg, ${color}88 0 3px, ${color}44 3px 6px)`
            : `linear-gradient(90deg, ${color}66, ${color})`,
          boxShadow: `0 0 6px ${color}66`,
        }} />
      </div>
    </div>
  )
}

// ── Team summary card ─────────────────────────────────────────
function TeamSummaryCard({ m, side }: { m: Match; side: "away" | "home" }) {
  const team = m[side]
  const recovery = side === "away" ? m.recovery_away : m.recovery_home
  const fatigue = side === "away" ? (m.league === "MLB" ? 0.20 : 0.15) : 0.0
  const bullpen = side === "away" ? 0.85 : 0.42
  const momentum = side === "away" ? 0.72 : 0.48
  const recColor = recovery >= 0.8 ? "#34d399" : recovery >= 0.6 ? "#fbbf24" : "#f43f5e"
  const align: React.CSSProperties["alignItems"] = side === "away" ? "flex-end" : "flex-start"

  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: 12,
      padding: "14px 16px", background: "#030815",
      border: "1px solid rgba(148,163,184,0.06)", borderRadius: 4,
      alignItems: align,
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        flexDirection: side === "away" ? "row-reverse" : "row",
      }}>
        <TeamMark abbr={team.abbr} league={m.league} size={32} />
        <div style={{ display: "flex", flexDirection: "column", gap: 2, alignItems: align }}>
          <span style={{ fontFamily: "var(--font-inter), Inter", fontWeight: 900, fontSize: 14, color: "#fff", letterSpacing: "-0.02em" }}>
            {team.name}
          </span>
          <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 8, fontWeight: 700, color: "#475569", letterSpacing: "0.28em" }}>
            {side === "away" ? "AWAY" : "HOME"} · {team.city}
          </span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
        <StatBar label="AGGREGATE RECOVERY" value={recovery} color={recColor} />
        <StatBar label="BULLPEN READINESS" value={bullpen} color={bullpen >= 0.7 ? "#34d399" : bullpen >= 0.5 ? "#fbbf24" : "#f43f5e"} />
        <StatBar label="MOMENTUM TREND" value={momentum} color="#94a3b8" />
        <StatBar label="TRAVEL FATIGUE" value={fatigue} color={fatigue > 0.15 ? "#f43f5e" : fatigue > 0.05 ? "#fbbf24" : "#34d399"} invert />
      </div>
    </div>
  )
}

// ── Center VS spine ───────────────────────────────────────────
function VsSpine({ m }: { m: Match }) {
  const t = leagueTheme(m.league)
  const color = wpaColor(m.tactical_label)
  const sign = m.wpa >= 0 ? "+" : "−"
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "0 6px", minWidth: 160, justifyContent: "center" }}>
      <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 8, fontWeight: 700, color: "#475569", letterSpacing: "0.3em" }}>
        WIN PROBABILITY
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
        <span style={{
          fontFamily: "var(--font-mono), monospace", fontSize: 48, fontWeight: 800,
          color: t.hex, letterSpacing: "-0.04em", lineHeight: 1,
          textShadow: `0 0 24px ${t.hex}55`,
        }}>{(m.physio_adjusted * 100).toFixed(1)}%</span>
        <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 8, fontWeight: 700, color: "#475569", letterSpacing: "0.26em" }}>
          {m.perspective} FAVORED
        </span>
      </div>
      <div style={{
        marginTop: 2, padding: "4px 10px",
        background: `${color}15`, border: `1px solid ${color}55`, borderRadius: 2,
        fontFamily: "var(--font-mono), monospace", fontSize: 10, fontWeight: 800,
        color, letterSpacing: "0.04em",
        display: "flex", alignItems: "center", gap: 6,
      }}>
        <span style={{ fontSize: 8, letterSpacing: "0.24em", opacity: 0.7 }}>IMPACT</span>
        {sign}{(Math.abs(m.wpa) * 100).toFixed(1)}%
      </div>
    </div>
  )
}

// ── Player chip ───────────────────────────────────────────────
function PlayerChip({ p }: { p: KeyPlayer }) {
  const flagColor = p.flag === "CLEAR" ? "#34d399" : p.flag === "MONITOR" ? "#fbbf24" : "#f43f5e"
  const flagLabel = p.flag === "CLEAR" ? "● CLEAR" : p.flag === "MONITOR" ? "● MONITOR" : "● REST REC."
  return (
    <div style={{ display: "grid", gridTemplateColumns: "32px 1fr 70px 70px 100px", alignItems: "center", gap: 10 }}>
      <div style={{
        width: 28, height: 28, borderRadius: "50%",
        background: "linear-gradient(135deg, #1e293b, #0b1220)",
        border: "1px solid rgba(148,163,184,0.15)",
        display: "grid", placeItems: "center",
        fontFamily: "var(--font-inter), Inter", fontWeight: 900, fontSize: 10, color: "#94a3b8",
      }}>{p.initials}</div>
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <span style={{ fontFamily: "var(--font-inter), Inter", fontWeight: 800, fontSize: 11, color: "#fff", letterSpacing: "-0.01em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</span>
        <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 7, fontWeight: 700, color: "#475569", letterSpacing: "0.22em" }}>{p.pos}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
        <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 11, fontWeight: 800, color: p.hrv >= 0 ? "#34d399" : "#f43f5e" }}>
          {p.hrv >= 0 ? "+" : ""}{(p.hrv * 100).toFixed(0)}%
        </span>
        <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 7, color: "#475569", letterSpacing: "0.18em" }}>HRV Δ</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
        <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 11, fontWeight: 800, color: p.sleep <= 0.5 ? "#34d399" : p.sleep <= 1.2 ? "#fbbf24" : "#f43f5e" }}>
          {p.sleep.toFixed(1)}h
        </span>
        <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 7, color: "#475569", letterSpacing: "0.18em" }}>SLEEP DEBT</span>
      </div>
      <div style={{
        textAlign: "center", padding: "4px 0", borderRadius: 2,
        background: `${flagColor}18`, border: `1px solid ${flagColor}50`,
        fontFamily: "var(--font-mono), monospace", fontSize: 8, fontWeight: 800,
        color: flagColor, letterSpacing: "0.22em",
      }}>{flagLabel}</div>
    </div>
  )
}

// ── Key player row ─────────────────────────────────────────────
function KeyPlayerRow({ m, side }: { m: Match; side: "away" | "home" }) {
  const team = m[side]
  const players = getKeyPlayers(m, side)
  const t = leagueTheme(m.league)
  return (
    <div style={{
      padding: "10px 12px", background: "#030815",
      border: "1px solid rgba(148,163,184,0.06)", borderRadius: 4,
      display: "flex", flexDirection: "column", gap: 8,
    }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        borderBottom: "1px dashed rgba(148,163,184,0.08)", paddingBottom: 7,
      }}>
        <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 8, fontWeight: 800, color: t.hex, letterSpacing: "0.28em" }}>
          KEY PLAYER · {team.abbr}
        </span>
        <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 8, fontWeight: 700, color: "#475569", letterSpacing: "0.22em" }}>
          BIOMETRICS
        </span>
      </div>
      {players.map((p, i) => <PlayerChip key={i} p={p} />)}
    </div>
  )
}

// ── Expanded preview ───────────────────────────────────────────
function GameBarPreview({ m, onOpen }: { m: Match; onOpen: (m: Match) => void }) {
  const t = leagueTheme(m.league)
  return (
    <div className="fade-in" style={{
      borderTop: "1px solid rgba(148,163,184,0.08)",
      padding: "22px 24px 20px",
      background: "linear-gradient(180deg, #040917, #050b1b)",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{
          fontFamily: "var(--font-mono), monospace", fontSize: 9, fontWeight: 800,
          color: t.hex, letterSpacing: "0.32em",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: t.hex, boxShadow: `0 0 8px ${t.hex}` }} />
          KEY INTELLIGENCE // PREVIEW
        </div>
        <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, fontWeight: 700, color: "#475569", letterSpacing: "0.24em" }}>
          MATCHUP COMPLEXITY {(m.matchup_complexity * 100).toFixed(0)}
        </div>
      </div>

      {/* Team comparison */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 24, alignItems: "stretch", marginBottom: 18 }}>
        <TeamSummaryCard m={m} side="away" />
        <VsSpine m={m} />
        <TeamSummaryCard m={m} side="home" />
      </div>

      {/* Key players */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 18 }}>
        <KeyPlayerRow m={m} side="away" />
        <KeyPlayerRow m={m} side="home" />
      </div>

      {/* Footer */}
      <div style={{
        display: "flex", alignItems: "center", gap: 14,
        paddingTop: 14, borderTop: "1px dashed rgba(148,163,184,0.1)",
      }}>
        <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, fontWeight: 700, color: "#475569", letterSpacing: "0.24em" }}>
          FULL GAME BREAKDOWN · ROSTER READINESS · MATCHUP ENGINE →
        </span>
        <div style={{ flex: 1 }} />
        <button
          onClick={e => { e.stopPropagation(); onOpen(m) }}
          style={{
            padding: "10px 18px",
            background: t.hex, border: "none", borderRadius: 3,
            fontFamily: "var(--font-mono), monospace", fontWeight: 800, fontSize: 10,
            color: "#020617", letterSpacing: "0.24em", cursor: "pointer",
            boxShadow: `0 0 20px ${t.hex}55`,
          }}
        >
          ENTER WAR ROOM ›
        </button>
      </div>
    </div>
  )
}

// ── Collapsible game bar ───────────────────────────────────────
function GameBar({ m, expanded, onToggle, onOpen }: {
  m: Match; expanded: boolean; onToggle: () => void; onOpen: (m: Match) => void
}) {
  const t = leagueTheme(m.league)
  const isLive = m.status === "LIVE"
  const isFinal = m.status === "FINAL"
  const statusColor = isLive ? "#ef4444" : isFinal ? "#64748b" : "#22d3ee"
  const statusLabel = isLive ? "● IN_PLAY" : isFinal ? "✓ FINAL" : "SCHEDULED"

  return (
    <div
      onMouseEnter={() => !expanded && onToggle()}
      onMouseLeave={() => expanded && onToggle()}
      style={{
        background: expanded ? "#071127" : "#050b1b",
        borderTop: `1px solid ${expanded ? t.hex + "55" : "rgba(148,163,184,0.08)"}`,
        borderRight: `1px solid ${expanded ? t.hex + "55" : "rgba(148,163,184,0.08)"}`,
        borderBottom: `1px solid ${expanded ? t.hex + "55" : "rgba(148,163,184,0.08)"}`,
        borderLeft: `2px solid ${t.hex}`,
        borderRadius: 4, transition: "all 180ms ease", overflow: "hidden",
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "110px 220px 160px 220px 90px 28px",
          alignItems: "center", gap: 18,
          padding: "18px 22px", cursor: "pointer",
        }}
      >
        {/* Status + time */}
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <div style={{
            fontFamily: "var(--font-mono), monospace", fontSize: 16, fontWeight: 800,
            color: isLive ? "#ef4444" : isFinal ? "#64748b" : "#e2e8f0",
            letterSpacing: "-0.02em", lineHeight: 1,
          }}>{m.time}</div>
          <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 8, fontWeight: 800, color: statusColor, letterSpacing: "0.3em" }}>
            {statusLabel}
          </div>
        </div>

        {/* Away (abbr right → logo) */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 40px", alignItems: "center", gap: 14 }}>
          <span style={{
            fontFamily: "var(--font-inter), Inter, sans-serif", fontWeight: 900, fontStyle: "italic",
            fontSize: 26, color: "#fff", letterSpacing: "-0.03em", textAlign: "right",
          }}>{m.away.abbr}</span>
          <div style={{ justifySelf: "end" }}><TeamMark abbr={m.away.abbr} league={m.league} size={36} /></div>
        </div>

        {/* Score or VS */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center" }}>
          {m.score ? (
            <>
              <span style={{ fontFamily: "var(--font-mono), monospace", fontWeight: 800, fontSize: 32, color: isLive ? "#ef4444" : "#fff", letterSpacing: "-0.04em", minWidth: 42, textAlign: "right" }}>{m.score.away}</span>
              <span style={{ color: "#334155", fontSize: 20, fontWeight: 700 }}>–</span>
              <span style={{ fontFamily: "var(--font-mono), monospace", fontWeight: 800, fontSize: 32, color: isLive ? "#ef4444" : "#fff", letterSpacing: "-0.04em", minWidth: 42, textAlign: "left" }}>{m.score.home}</span>
            </>
          ) : (
            <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 11, fontWeight: 800, color: "#334155", letterSpacing: "0.4em" }}>TBD</span>
          )}
        </div>

        {/* Home (logo → abbr) */}
        <div style={{ display: "grid", gridTemplateColumns: "40px 1fr", alignItems: "center", gap: 14 }}>
          <div style={{ justifySelf: "start" }}><TeamMark abbr={m.home.abbr} league={m.league} size={36} /></div>
          <span style={{
            fontFamily: "var(--font-inter), Inter, sans-serif", fontWeight: 900, fontStyle: "italic",
            fontSize: 26, color: "#fff", letterSpacing: "-0.03em",
          }}>{m.home.abbr}</span>
        </div>

        {/* League badge */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <LeagueBadge league={m.league} />
        </div>

        {/* Chevron */}
        <div style={{
          color: expanded ? t.hex : "#334155",
          fontSize: 18, textAlign: "right",
          transition: "transform 180ms, color 180ms",
          transform: expanded ? "rotate(90deg)" : "none",
        }}>›</div>
      </div>

      {expanded && <GameBarPreview m={m} onOpen={onOpen} />}
    </div>
  )
}

// ── Schedule page ──────────────────────────────────────────────
const LEAGUES: Array<"ALL" | League> = ["ALL", "MLB", "NBA", "EPL", "UCL", "NHL"]

export default function SchedulePage({ onOpen }: { onOpen: (m: Match) => void }) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<"ALL" | League>("ALL")
  const [matches, setMatches] = useState<Match[]>(TODAY_MATCHES)

  useEffect(() => {
    fetch('/api/games')
      .then(r => r.json())
      .then(({ matches: live }: { matches: Match[] }) => {
        if (live && live.length > 0) setMatches(live)
      })
      .catch(() => {})
  }, [])

  const filtered = filter === "ALL" ? matches : matches.filter(m => m.league === filter)

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "36px 24px 60px", minHeight: "calc(100vh - 160px)" }}>
      {/* Page header */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 24, marginBottom: 24, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 auto" }}>
          <h1 style={{
            margin: 0,
            fontFamily: "var(--font-inter), Inter, sans-serif",
            fontSize: "clamp(32px, 6vw, 56px)",
            fontWeight: 900, fontStyle: "italic",
            color: "#fff", letterSpacing: "-0.03em", lineHeight: 1,
          }}>
            MOSPORT <span style={{ color: "#22d3ee", fontStyle: "normal" }}>TERMINAL</span>
          </h1>
        </div>
        <DatePill />
      </div>

      {/* League filter */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 14, flexWrap: "wrap" }}>
        {LEAGUES.map(l => (
          <button key={l} onClick={() => setFilter(l)} style={{
            padding: "6px 14px",
            background: filter === l ? "rgba(34,211,238,0.08)" : "transparent",
            border: filter === l ? "1px solid rgba(34,211,238,0.35)" : "1px solid rgba(148,163,184,0.08)",
            borderRadius: 3,
            fontFamily: "var(--font-mono), monospace", fontSize: 10, fontWeight: 800,
            color: filter === l ? "#22d3ee" : "#64748b",
            letterSpacing: "0.28em", cursor: "pointer",
          }}>{l}</button>
        ))}
      </div>

      {/* Game bars */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.map(m => (
          <GameBar
            key={m.id}
            m={m}
            expanded={expandedId === m.id}
            onToggle={() => setExpandedId(expandedId === m.id ? null : m.id)}
            onOpen={onOpen}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{
          padding: "60px 20px", border: "1px dashed rgba(148,163,184,0.1)",
          borderRadius: 6, textAlign: "center",
          fontFamily: "var(--font-mono), monospace", fontSize: 10,
          color: "#475569", letterSpacing: "0.3em", fontWeight: 800,
        }}>
          [ NO ACTIVE MATCH INTELLIGENCE SCHEDULED FOR THIS CYCLE ]
        </div>
      )}
    </div>
  )
}
