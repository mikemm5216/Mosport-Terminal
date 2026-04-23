'use client'

import { useState } from 'react'
import { useWindowWidth } from '../lib/useWindowWidth'
import { KEY_PLAYERS, TODAY_MATCHES, PLAYER_FORM, type League, type KeyPlayer, type ReadinessFlag } from '../data/mockData'
import { leagueTheme, BioBar } from './ui'

type FilterFlag = "ALL" | ReadinessFlag

const FLAG_META: Record<ReadinessFlag, { color: string; bg: string; border: string }> = {
  CLEAR:   { color: "#34d399", bg: "rgba(52,211,153,0.08)",  border: "rgba(52,211,153,0.25)"  },
  MONITOR: { color: "#fbbf24", bg: "rgba(251,191,36,0.08)",  border: "rgba(251,191,36,0.25)"  },
  REST:    { color: "#f43f5e", bg: "rgba(244,63,94,0.08)",   border: "rgba(244,63,94,0.25)"   },
}

interface PlayerRow {
  player: KeyPlayer
  team: string
  league: League
  status: string   // match status (LIVE/SCHEDULED/FINAL)
  key: string
}

function buildPlayerRows(): PlayerRow[] {
  const rows: PlayerRow[] = []
  for (const [rawKey, players] of Object.entries(KEY_PLAYERS)) {
    const isAway = rawKey.endsWith("_away")
    const isHome = rawKey.endsWith("_home")
    if (!isAway && !isHome) continue
    const side = isAway ? "away" : "home"
    const matchId = rawKey.slice(0, -(side.length + 1))
    const match = TODAY_MATCHES.find(m => m.id === matchId)
    if (!match) continue
    for (const p of players) {
      rows.push({ player: p, team: match[side].abbr, league: match.league, status: match.status, key: `${rawKey}-${p.name}` })
    }
  }
  return rows
}

const ALL_ROWS = buildPlayerRows()

function RecoveryTrend({ name }: { name: string }) {
  const scores = PLAYER_FORM[name]
  if (!scores) return null

  function color(s: number) {
    if (s >= 0.80) return "#34d399"
    if (s >= 0.65) return "#fbbf24"
    return "#f43f5e"
  }

  return (
    <div>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6,
      }}>
        <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 7, color: "#334155", letterSpacing: "0.26em", fontWeight: 700 }}>
          5-GAME RECOVERY TREND
        </span>
        <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 7, color: "#1e293b", letterSpacing: "0.16em" }}>
          OLD → NEW
        </span>
      </div>
      <div style={{ display: "flex", gap: 4, alignItems: "flex-end" }}>
        {scores.map((s, i) => (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <div style={{
              width: "100%", borderRadius: 1,
              height: Math.round(4 + s * 20),
              background: color(s),
              opacity: 0.3 + (i / scores.length) * 0.7,
              boxShadow: `0 0 4px ${color(s)}44`,
            }} />
            <span style={{
              fontFamily: "var(--font-mono), monospace", fontSize: 6,
              color: color(s), opacity: 0.4 + (i / scores.length) * 0.6,
            }}>{Math.round(s * 100)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function PlayerCard({ row }: { row: PlayerRow }) {
  const { player, team, league, status } = row
  const t = leagueTheme(league)
  const f = FLAG_META[player.flag]
  const hrvDisplay = (player.hrv >= 0 ? "+" : "") + Math.round(player.hrv * 100) + "%"
  const hrvBarVal = Math.max(0, Math.min(1, 0.5 + player.hrv * 2.5))
  const sleepColor = player.sleep > 1.5 ? "#f43f5e" : player.sleep > 0.8 ? "#fbbf24" : "#34d399"
  const isFinal = status === "FINAL"
  const isLive = status === "LIVE"

  return (
    <div style={{
      background: "rgba(15,23,42,0.4)",
      border: "1px solid rgba(148,163,184,0.07)",
      borderTop: `2px solid ${f.color}`,
      borderRadius: "0 0 4px 4px",
      display: "flex", flexDirection: "column",
    }}>
      {/* Card header */}
      <div style={{ padding: "14px 16px 12px", borderBottom: "1px solid rgba(148,163,184,0.05)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <div style={{
            width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
            background: f.bg, border: `1px solid ${f.border}`,
            display: "grid", placeItems: "center",
          }}>
            <span style={{ fontFamily: "var(--font-inter), Inter, sans-serif", fontSize: 12, fontWeight: 900, color: f.color }}>{player.initials}</span>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "var(--font-inter), Inter, sans-serif", fontSize: 12, fontWeight: 800, color: "#f1f5f9", letterSpacing: "-0.01em", lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {player.name}
            </div>
            <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 7, color: "#475569", letterSpacing: "0.2em", marginTop: 2 }}>
              {player.pos}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 7px", borderRadius: 2, background: f.bg, border: `1px solid ${f.border}` }}>
              <span style={{ width: 4, height: 4, borderRadius: "50%", background: f.color, boxShadow: `0 0 5px ${f.color}`, display: "inline-block" }} />
              <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 7, fontWeight: 800, letterSpacing: "0.2em", color: f.color }}>{player.flag}</span>
            </div>
            {/* Match status badge */}
            <span style={{
              fontFamily: "var(--font-mono), monospace", fontSize: 6, fontWeight: 800, letterSpacing: "0.2em",
              color: isLive ? "#ef4444" : isFinal ? "#34d399" : "#334155",
            }}>{status}</span>
          </div>
        </div>

        {/* Team + league */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 10, padding: "3px 9px", borderRadius: 2, background: "rgba(2,6,23,0.5)", border: "1px solid rgba(148,163,184,0.05)" }}>
          <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 10, fontWeight: 800, color: t.hex, letterSpacing: "0.16em" }}>{team}</span>
          <span style={{ color: "#1e293b", fontSize: 8 }}>·</span>
          <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 8, fontWeight: 700, color: "#334155", letterSpacing: "0.16em" }}>{league}</span>
        </div>
      </div>

      {/* Bio stats */}
      <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
        {/* HRV */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
            <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 7, fontWeight: 700, letterSpacing: "0.24em", color: "#334155" }}>HRV DELTA</span>
            <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 8, fontWeight: 800, color: player.hrv >= 0 ? "#34d399" : "#f43f5e" }}>{hrvDisplay}</span>
          </div>
          <BioBar value={hrvBarVal} color={player.hrv >= 0 ? "#34d399" : "#f43f5e"} height={5} />
        </div>

        {/* Sleep + Risk */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, paddingTop: 8, borderTop: "1px solid rgba(148,163,184,0.04)" }}>
          <div>
            <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 7, color: "#334155", letterSpacing: "0.2em", marginBottom: 3 }}>SLEEP DEBT</div>
            <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 14, fontWeight: 800, color: sleepColor, letterSpacing: "-0.01em" }}>
              {player.sleep.toFixed(1)}<span style={{ fontSize: 8, color: "#475569", marginLeft: 2 }}>h</span>
            </div>
          </div>
          <div>
            <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 7, color: "#334155", letterSpacing: "0.2em", marginBottom: 3 }}>FATIGUE</div>
            <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 14, fontWeight: 800, color: f.color, letterSpacing: "-0.01em" }}>
              {Math.min(100, Math.round(Math.abs(player.hrv) * 100 + player.sleep * 12))}<span style={{ fontSize: 8, color: "#475569", marginLeft: 1 }}>%</span>
            </div>
          </div>
        </div>

        {/* Recovery trend */}
        <div style={{ paddingTop: 8, borderTop: "1px solid rgba(148,163,184,0.04)" }}>
          <RecoveryTrend name={player.name} />
        </div>
      </div>
    </div>
  )
}

export default function PlayersPage() {
  const width = useWindowWidth()
  const isMobile = width < 640
  const [filter, setFilter] = useState<FilterFlag>("ALL")

  const filtered = filter === "ALL" ? ALL_ROWS : ALL_ROWS.filter(r => r.player.flag === filter)

  const counts: Record<FilterFlag, number> = {
    ALL:     ALL_ROWS.length,
    CLEAR:   ALL_ROWS.filter(r => r.player.flag === "CLEAR").length,
    MONITOR: ALL_ROWS.filter(r => r.player.flag === "MONITOR").length,
    REST:    ALL_ROWS.filter(r => r.player.flag === "REST").length,
  }

  const FILTERS: { key: FilterFlag; color: string }[] = [
    { key: "ALL",     color: "#64748b" },
    { key: "CLEAR",   color: "#34d399" },
    { key: "MONITOR", color: "#fbbf24" },
    { key: "REST",    color: "#f43f5e" },
  ]

  const cols = isMobile ? 1 : width < 900 ? 2 : 3

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: isMobile ? "28px 16px 60px" : "44px 28px 80px" }}>

      <div style={{ marginBottom: 36 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, fontWeight: 800, letterSpacing: "0.32em", color: "#475569" }}>PLAYER INTELLIGENCE</span>
          <span style={{ color: "#1e293b", fontFamily: "var(--font-mono), monospace", fontSize: 9 }}>//</span>
          <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, fontWeight: 700, letterSpacing: "0.28em", color: "#334155" }}>READINESS · 5-GAME TREND</span>
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <h1 style={{ fontFamily: "var(--font-inter), Inter, sans-serif", fontWeight: 900, fontSize: isMobile ? 30 : 44, color: "#f8fafc", letterSpacing: "-0.03em", lineHeight: 1.08, margin: 0 }}>
            ROSTER<br />
            <span style={{ color: "#34d399", textShadow: "0 0 40px rgba(52,211,153,0.35)" }}>READINESS</span>
          </h1>
          <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, color: "#334155", letterSpacing: "0.2em" }}>
            {ALL_ROWS.length} ATHLETES · ALL MATCHES INC. FINAL
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 28, flexWrap: "wrap" }}>
        {FILTERS.map(({ key, color }) => {
          const isActive = filter === key
          return (
            <button key={key} onClick={() => setFilter(key)} style={{
              padding: "7px 16px",
              fontFamily: "var(--font-mono), monospace",
              fontSize: 9, fontWeight: 800, letterSpacing: "0.24em",
              color: isActive ? color : "#334155",
              background: isActive ? `${color}12` : "transparent",
              border: `1px solid ${isActive ? color + "50" : "rgba(148,163,184,0.08)"}`,
              borderRadius: 2, cursor: "pointer",
            }}>
              {key} ({counts[key]})
            </button>
          )
        })}
      </div>

      {/* Grid */}
      {filtered.length > 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 14 }}>
          {filtered.map(row => <PlayerCard key={row.key} row={row} />)}
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "60px 0", fontFamily: "var(--font-mono), monospace", fontSize: 10, color: "#334155", letterSpacing: "0.28em" }}>
          NO PLAYERS MATCH FILTER
        </div>
      )}
    </div>
  )
}
