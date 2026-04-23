'use client'

import { useState, useEffect } from 'react'
import type { Match, League, KeyPlayer } from '../data/mockData'
import { TODAY_MATCHES, SCHEDULE_BY_DATE, getKeyPlayers } from '../data/mockData'
import { leagueTheme, TeamMark, LeagueBadge, wpaColor } from './ui'
import { useWindowWidth } from '../lib/useWindowWidth'

// ── Date helpers ─────────────────────────────────────────────
const AVAILABLE_DATES = ["2026-04-21", "2026-04-22", "2026-04-23"]
const TODAY_DATE = "2026-04-23"
const MONTHS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"]
const WEEKDAYS = ["SUN","MON","TUE","WED","THU","FRI","SAT"]

function formatDateLabel(iso: string) {
  const [y, m, d] = iso.split("-").map(Number)
  const dt = new Date(y, m - 1, d)
  return `${MONTHS[dt.getMonth()]} ${String(d).padStart(2,"0")}, ${y} · ${WEEKDAYS[dt.getDay()]}`
}

// ── Date pill ────────────────────────────────────────────────
function DatePill({ date, onPrev, onNext }: {
  date: string
  onPrev: () => void
  onNext: () => void
}) {
  const idx = AVAILABLE_DATES.indexOf(date)
  const isToday = date === TODAY_DATE
  const canPrev = idx > 0
  const canNext = idx < AVAILABLE_DATES.length - 1

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <button
        onClick={onPrev}
        disabled={!canPrev}
        style={{
          background: "#050b1b",
          border: `1px solid ${canPrev ? "rgba(148,163,184,0.2)" : "rgba(148,163,184,0.06)"}`,
          color: canPrev ? "#94a3b8" : "#1e293b",
          width: 28, height: 28, borderRadius: 4,
          cursor: canPrev ? "pointer" : "not-allowed",
          fontFamily: "var(--font-mono), monospace", fontSize: 14,
          display: "grid", placeItems: "center",
          transition: "all 150ms",
        }}
      >‹</button>

      <div style={{
        padding: "8px 16px",
        background: "#050b1b",
        border: `1px solid ${isToday ? "rgba(34,211,238,0.35)" : "rgba(148,163,184,0.15)"}`,
        borderRadius: 4,
        fontFamily: "var(--font-mono), monospace", fontSize: 11, fontWeight: 800,
        color: "#fff", letterSpacing: "0.18em",
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <span style={{
          color: isToday ? "#22d3ee" : "#f97316",
          fontSize: 7, letterSpacing: "0.24em",
        }}>{isToday ? "● TODAY" : "◈ ARCHIVED"}</span>
        {formatDateLabel(date)}
      </div>

      <button
        onClick={onNext}
        disabled={!canNext}
        style={{
          background: "#050b1b",
          border: `1px solid ${canNext ? "rgba(148,163,184,0.2)" : "rgba(148,163,184,0.06)"}`,
          color: canNext ? "#94a3b8" : "#1e293b",
          width: 28, height: 28, borderRadius: 4,
          cursor: canNext ? "pointer" : "not-allowed",
          fontFamily: "var(--font-mono), monospace", fontSize: 14,
          display: "grid", placeItems: "center",
          transition: "all 150ms",
        }}
      >›</button>
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
function VsSpine({ m, isMobile }: { m: Match; isMobile?: boolean }) {
  const t = leagueTheme(m.league)
  const color = wpaColor(m.tactical_label)
  const sign = m.wpa >= 0 ? "+" : "−"
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
      padding: isMobile ? "16px 0" : "0 6px",
      minWidth: isMobile ? undefined : 160,
      justifyContent: "center",
    }}>
      <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 8, fontWeight: 700, color: "#475569", letterSpacing: "0.3em" }}>
        WIN PROBABILITY
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
        <span style={{
          fontFamily: "var(--font-mono), monospace",
          fontSize: isMobile ? 40 : 48,
          fontWeight: 800,
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
function PlayerChip({ p, isMobile }: { p: KeyPlayer; isMobile?: boolean }) {
  const flagColor = p.flag === "CLEAR" ? "#34d399" : p.flag === "MONITOR" ? "#fbbf24" : "#f43f5e"
  const flagLabel = p.flag === "CLEAR" ? "● CLEAR" : p.flag === "MONITOR" ? "● MONITOR" : "● REST"
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: isMobile ? "28px 1fr 80px" : "32px 1fr 70px 70px 100px",
      alignItems: "center", gap: isMobile ? 8 : 10,
    }}>
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
      {!isMobile && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 11, fontWeight: 800, color: p.hrv >= 0 ? "#34d399" : "#f43f5e" }}>
            {p.hrv >= 0 ? "+" : ""}{(p.hrv * 100).toFixed(0)}%
          </span>
          <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 7, color: "#475569", letterSpacing: "0.18em" }}>HRV Δ</span>
        </div>
      )}
      {!isMobile && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 11, fontWeight: 800, color: p.sleep <= 0.5 ? "#34d399" : p.sleep <= 1.2 ? "#fbbf24" : "#f43f5e" }}>
            {p.sleep.toFixed(1)}h
          </span>
          <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 7, color: "#475569", letterSpacing: "0.18em" }}>SLEEP DEBT</span>
        </div>
      )}
      <div style={{
        textAlign: "center", padding: "4px 0", borderRadius: 2,
        background: `${flagColor}18`, border: `1px solid ${flagColor}50`,
        fontFamily: "var(--font-mono), monospace", fontSize: 8, fontWeight: 800,
        color: flagColor, letterSpacing: "0.16em",
      }}>{flagLabel}</div>
    </div>
  )
}

// ── Key player row ─────────────────────────────────────────────
function KeyPlayerRow({ m, side, isMobile }: { m: Match; side: "away" | "home"; isMobile?: boolean }) {
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
      {players.map((p, i) => <PlayerChip key={i} p={p} isMobile={isMobile} />)}
    </div>
  )
}

// ── Expanded preview ───────────────────────────────────────────
function GameBarPreview({ m, onOpen, isMobile }: { m: Match; onOpen: (m: Match) => void; isMobile?: boolean }) {
  const t = leagueTheme(m.league)
  return (
    <div className="fade-in" style={{
      borderTop: "1px solid rgba(148,163,184,0.08)",
      padding: isMobile ? "16px 14px 14px" : "22px 24px 20px",
      background: "linear-gradient(180deg, #040917, #050b1b)",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{
          fontFamily: "var(--font-mono), monospace", fontSize: 9, fontWeight: 800,
          color: t.hex, letterSpacing: "0.32em",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: t.hex, boxShadow: `0 0 8px ${t.hex}` }} />
          KEY INTELLIGENCE
        </div>
        <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, fontWeight: 700, color: "#475569", letterSpacing: "0.24em" }}>
          COMPLEXITY {(m.matchup_complexity * 100).toFixed(0)}
        </div>
      </div>

      {/* Team comparison */}
      {isMobile ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
          <VsSpine m={m} isMobile />
          <TeamSummaryCard m={m} side="away" />
          <TeamSummaryCard m={m} side="home" />
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 24, alignItems: "stretch", marginBottom: 18 }}>
          <TeamSummaryCard m={m} side="away" />
          <VsSpine m={m} />
          <TeamSummaryCard m={m} side="home" />
        </div>
      )}

      {/* Key players */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
        gap: 12, marginBottom: 16,
      }}>
        <KeyPlayerRow m={m} side="away" isMobile={isMobile} />
        <KeyPlayerRow m={m} side="home" isMobile={isMobile} />
      </div>

      {/* Footer */}
      <div style={{
        display: "flex", alignItems: "center", gap: 14,
        flexDirection: isMobile ? "column" : "row",
        paddingTop: 14, borderTop: "1px dashed rgba(148,163,184,0.1)",
      }}>
        {!isMobile && (
          <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, fontWeight: 700, color: "#475569", letterSpacing: "0.24em" }}>
            FULL GAME BREAKDOWN · ROSTER READINESS · MATCHUP ENGINE →
          </span>
        )}
        {!isMobile && <div style={{ flex: 1 }} />}
        <button
          onClick={e => { e.stopPropagation(); onOpen(m) }}
          style={{
            width: isMobile ? "100%" : "auto",
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
  const w = useWindowWidth()
  const isMobile = w < 640
  const isCompact = w < 1000

  const t = leagueTheme(m.league)
  const isLive = m.status === "LIVE"
  const isFinal = m.status === "FINAL"
  const statusColor = isLive ? "#ef4444" : isFinal ? "#64748b" : "#22d3ee"
  const statusLabel = isLive ? "● IN_PLAY" : isFinal ? "✓ FINAL" : "SCHEDULED"

  const containerStyle: React.CSSProperties = {
    background: expanded ? "#071127" : "#050b1b",
    borderTop: `1px solid ${expanded ? t.hex + "55" : "rgba(148,163,184,0.08)"}`,
    borderRight: `1px solid ${expanded ? t.hex + "55" : "rgba(148,163,184,0.08)"}`,
    borderBottom: `1px solid ${expanded ? t.hex + "55" : "rgba(148,163,184,0.08)"}`,
    borderLeft: `2px solid ${t.hex}`,
    borderRadius: 4, transition: "all 180ms ease", overflow: "hidden",
  }

  const hoverProps = { onClick: onToggle }

  return (
    <div {...hoverProps} style={containerStyle}>
      {isMobile ? (
        /* ── Mobile header ── */
        <div style={{
          display: "flex", alignItems: "center", padding: "14px 14px", gap: 8, cursor: "pointer",
        }}>
          {/* Teams */}
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
            <TeamMark abbr={m.away.abbr} league={m.league} size={24} />
            <span style={{
              fontFamily: "var(--font-inter), Inter, sans-serif", fontWeight: 900, fontStyle: "italic",
              fontSize: 17, color: "#fff", letterSpacing: "-0.02em",
            }}>{m.away.abbr}</span>
            <span style={{ color: "#334155", fontSize: 11, fontFamily: "var(--font-mono), monospace" }}>@</span>
            <span style={{
              fontFamily: "var(--font-inter), Inter, sans-serif", fontWeight: 900, fontStyle: "italic",
              fontSize: 17, color: "#fff", letterSpacing: "-0.02em",
            }}>{m.home.abbr}</span>
            <TeamMark abbr={m.home.abbr} league={m.league} size={24} />
          </div>
          {/* Time + status */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, flexShrink: 0 }}>
            <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 11, fontWeight: 800, color: isLive ? "#ef4444" : "#e2e8f0" }}>{m.time}</span>
            <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 7, fontWeight: 800, color: statusColor, letterSpacing: "0.26em" }}>{statusLabel}</span>
          </div>
          <LeagueBadge league={m.league} />
          <span style={{
            display: "inline-block",
            color: expanded ? t.hex : "#334155",
            fontSize: 16, transition: "transform 180ms, color 180ms",
            transform: expanded ? "rotate(90deg)" : "none",
          }}>›</span>
        </div>
      ) : (
        /* ── Desktop / tablet header ── */
        <div style={{
          display: "grid",
          gridTemplateColumns: isCompact
            ? "90px 1fr 130px 1fr 70px 24px"
            : "110px 220px 160px 220px 90px 28px",
          alignItems: "center", gap: isCompact ? 10 : 18,
          padding: isCompact ? "14px 16px" : "18px 22px", cursor: "pointer",
        }}>
          {/* Status + time */}
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <div style={{
              fontFamily: "var(--font-mono), monospace",
              fontSize: isCompact ? 13 : 16, fontWeight: 800,
              color: isLive ? "#ef4444" : isFinal ? "#64748b" : "#e2e8f0",
              letterSpacing: "-0.02em", lineHeight: 1,
            }}>{m.time}</div>
            <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 8, fontWeight: 800, color: statusColor, letterSpacing: "0.3em" }}>
              {statusLabel}
            </div>
          </div>

          {/* Away */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 38px", alignItems: "center", gap: 10 }}>
            <span style={{
              fontFamily: "var(--font-inter), Inter, sans-serif", fontWeight: 900, fontStyle: "italic",
              fontSize: isCompact ? 20 : 26, color: "#fff", letterSpacing: "-0.03em", textAlign: "right",
            }}>{m.away.abbr}</span>
            <div style={{ justifySelf: "end" }}><TeamMark abbr={m.away.abbr} league={m.league} size={isCompact ? 30 : 36} /></div>
          </div>

          {/* Score or TBD */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
            {m.score ? (
              <>
                <span style={{ fontFamily: "var(--font-mono), monospace", fontWeight: 800, fontSize: isCompact ? 24 : 32, color: isLive ? "#ef4444" : "#fff", letterSpacing: "-0.04em", minWidth: 36, textAlign: "right" }}>{m.score.away}</span>
                <span style={{ color: "#334155", fontSize: 16, fontWeight: 700 }}>–</span>
                <span style={{ fontFamily: "var(--font-mono), monospace", fontWeight: 800, fontSize: isCompact ? 24 : 32, color: isLive ? "#ef4444" : "#fff", letterSpacing: "-0.04em", minWidth: 36, textAlign: "left" }}>{m.score.home}</span>
              </>
            ) : (
              <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 11, fontWeight: 800, color: "#334155", letterSpacing: "0.4em" }}>TBD</span>
            )}
          </div>

          {/* Home */}
          <div style={{ display: "grid", gridTemplateColumns: "38px 1fr", alignItems: "center", gap: 10 }}>
            <div style={{ justifySelf: "start" }}><TeamMark abbr={m.home.abbr} league={m.league} size={isCompact ? 30 : 36} /></div>
            <span style={{
              fontFamily: "var(--font-inter), Inter, sans-serif", fontWeight: 900, fontStyle: "italic",
              fontSize: isCompact ? 20 : 26, color: "#fff", letterSpacing: "-0.03em",
            }}>{m.home.abbr}</span>
          </div>

          {/* League badge */}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <LeagueBadge league={m.league} />
          </div>

          {/* Chevron */}
          <div style={{
            display: "inline-block",
            color: expanded ? t.hex : "#334155",
            fontSize: 18, textAlign: "right",
            transition: "transform 180ms, color 180ms",
            transform: expanded ? "rotate(90deg)" : "none",
          }}>›</div>
        </div>
      )}

      {expanded && <GameBarPreview m={m} onOpen={onOpen} isMobile={isMobile} />}
    </div>
  )
}

// ── Schedule page ──────────────────────────────────────────────
const LEAGUES: Array<"ALL" | League> = ["ALL", "MLB", "NBA", "EPL", "UCL", "NHL"]

export default function SchedulePage({ onOpen }: { onOpen: (m: Match) => void }) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<"ALL" | League>("ALL")
  const [selectedDate, setSelectedDate] = useState(TODAY_DATE)
  const [liveMatches, setLiveMatches] = useState<Match[] | null>(null)
  const w = useWindowWidth()
  const isMobile = w < 640

  // Only attempt live fetch for today
  useEffect(() => {
    if (selectedDate !== TODAY_DATE) { setLiveMatches(null); return }
    fetch('/api/games')
      .then(r => r.json())
      .then(({ matches: live }: { matches: Match[] }) => {
        if (live && live.length > 0) setLiveMatches(live)
      })
      .catch(() => {})
  }, [selectedDate])

  function handlePrev() {
    const idx = AVAILABLE_DATES.indexOf(selectedDate)
    if (idx > 0) { setSelectedDate(AVAILABLE_DATES[idx - 1]); setExpandedId(null) }
  }
  function handleNext() {
    const idx = AVAILABLE_DATES.indexOf(selectedDate)
    if (idx < AVAILABLE_DATES.length - 1) { setSelectedDate(AVAILABLE_DATES[idx + 1]); setExpandedId(null) }
  }

  const base = (selectedDate === TODAY_DATE && liveMatches)
    ? liveMatches
    : (SCHEDULE_BY_DATE[selectedDate] ?? TODAY_MATCHES)

  const filtered = filter === "ALL" ? base : base.filter(m => m.league === filter)

  const isArchived = selectedDate !== TODAY_DATE
  const finalCount = base.filter(m => m.status === "FINAL").length
  const liveCount  = base.filter(m => m.status === "LIVE").length

  return (
    <div style={{
      maxWidth: 1200, margin: "0 auto",
      padding: isMobile ? "20px 12px 60px" : "36px 24px 60px",
      minHeight: "calc(100vh - 160px)",
    }}>
      {/* Page header */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 auto" }}>
          <h1 style={{
            margin: 0,
            fontFamily: "var(--font-inter), Inter, sans-serif",
            fontSize: "clamp(24px, 6vw, 56px)",
            fontWeight: 900, fontStyle: "italic",
            color: "#fff", letterSpacing: "-0.03em", lineHeight: 1,
          }}>
            MOSPORT <span style={{ color: "#22d3ee", fontStyle: "normal" }}>TERMINAL</span>
          </h1>
        </div>
        <DatePill date={selectedDate} onPrev={handlePrev} onNext={handleNext} />
      </div>

      {/* Summary strip */}
      <div style={{
        display: "flex", alignItems: "center", gap: 16,
        marginBottom: 14, flexWrap: "wrap",
        fontFamily: "var(--font-mono), monospace", fontSize: 9,
        letterSpacing: "0.22em",
      }}>
        <span style={{ color: "#334155" }}>{base.length} MATCHES</span>
        {liveCount > 0 && <span style={{ color: "#ef4444" }}>● {liveCount} LIVE</span>}
        {finalCount > 0 && <span style={{ color: "#34d399" }}>✓ {finalCount} FINAL</span>}
        {isArchived && (
          <span style={{
            padding: "2px 10px", borderRadius: 2,
            background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.2)",
            color: "#f97316", fontWeight: 800,
          }}>ARCHIVED RESULTS</span>
        )}
      </div>

      {/* League filter */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 14, flexWrap: "wrap" }}>
        {LEAGUES.map(l => (
          <button key={l} onClick={() => setFilter(l)} style={{
            padding: isMobile ? "5px 10px" : "6px 14px",
            background: filter === l ? "rgba(34,211,238,0.08)" : "transparent",
            border: filter === l ? "1px solid rgba(34,211,238,0.35)" : "1px solid rgba(148,163,184,0.08)",
            borderRadius: 3,
            fontFamily: "var(--font-mono), monospace", fontSize: isMobile ? 9 : 10, fontWeight: 800,
            color: filter === l ? "#22d3ee" : "#64748b",
            letterSpacing: "0.28em", cursor: "pointer",
          }}>{l}</button>
        ))}
      </div>

      {/* Game bars */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
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
          [ NO MATCH DATA FOR THIS DATE ]
        </div>
      )}
    </div>
  )
}
