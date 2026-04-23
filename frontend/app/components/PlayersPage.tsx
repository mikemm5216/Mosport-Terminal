'use client'

import { useState } from 'react'
import { useWindowWidth } from '../lib/useWindowWidth'
import { KEY_PLAYERS, TODAY_MATCHES, PLAYER_FORM, type League, type KeyPlayer, type ReadinessFlag, type Match } from '../data/mockData'
import { leagueTheme, BioBar, LiveDot } from './ui'
import TeamLogo from './TeamLogo'

type FilterFlag = "ALL" | ReadinessFlag
type LeagueFilter = "ALL" | League

const ALL_LEAGUES: League[] = ["MLB", "NBA", "EPL", "UCL", "NHL"]

const FLAG_META: Record<ReadinessFlag, { color: string; bg: string; border: string }> = {
  CLEAR:   { color: "#34d399", bg: "rgba(52,211,153,0.08)",  border: "rgba(52,211,153,0.25)"  },
  MONITOR: { color: "#fbbf24", bg: "rgba(251,191,36,0.08)",  border: "rgba(251,191,36,0.25)"  },
  REST:    { color: "#f43f5e", bg: "rgba(244,63,94,0.08)",   border: "rgba(244,63,94,0.25)"   },
}

interface PlayerRow {
  player: KeyPlayer
  teamAbbr: string
  teamName: string
  league: League
  match: Match
  isHome: boolean
  key: string
}

interface TeamGroup {
  teamAbbr: string
  teamName: string
  league: League
  match: Match
  players: PlayerRow[]
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
      rows.push({
        player: p,
        teamAbbr: match[side].abbr,
        teamName: match[side].name,
        league: match.league,
        match,
        isHome: side === "home",
        key: `${rawKey}-${p.name}`,
      })
    }
  }
  return rows
}

const ALL_ROWS = buildPlayerRows()

function groupByLeagueAndTeam(rows: PlayerRow[]): { league: League; teams: TeamGroup[] }[] {
  const leagueOrder = ALL_LEAGUES.filter(l => rows.some(r => r.league === l))
  return leagueOrder.map(league => {
    const leagueRows = rows.filter(r => r.league === league)
    const teamMap = new Map<string, TeamGroup>()
    for (const row of leagueRows) {
      if (!teamMap.has(row.teamAbbr)) {
        teamMap.set(row.teamAbbr, {
          teamAbbr: row.teamAbbr,
          teamName: row.teamName,
          league: row.league,
          match: row.match,
          players: [],
        })
      }
      teamMap.get(row.teamAbbr)!.players.push(row)
    }
    return { league, teams: Array.from(teamMap.values()) }
  })
}

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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 7, color: "#334155", letterSpacing: "0.26em", fontWeight: 700 }}>5-GAME RECOVERY TREND</span>
        <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 7, color: "#1e293b", letterSpacing: "0.16em" }}>OLD → NEW</span>
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
            <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 6, color: color(s), opacity: 0.4 + (i / scores.length) * 0.6 }}>
              {Math.round(s * 100)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function PlayerCard({ row, onPlayer }: { row: PlayerRow; onPlayer?: (player: KeyPlayer, teamAbbr: string, teamName: string, league: League, match: Match) => void }) {
  const { player, league } = row
  const t = leagueTheme(league)
  const f = FLAG_META[player.flag]
  const hrvDisplay = (player.hrv >= 0 ? "+" : "") + Math.round(player.hrv * 100) + "%"
  const hrvBarVal = Math.max(0, Math.min(1, 0.5 + player.hrv * 2.5))
  const sleepColor = player.sleep > 1.5 ? "#f43f5e" : player.sleep > 0.8 ? "#fbbf24" : "#34d399"

  return (
    <div
      onClick={onPlayer ? () => onPlayer(player, row.teamAbbr, row.teamName, league, row.match) : undefined}
      style={{
        background: "rgba(15,23,42,0.4)",
        border: "1px solid rgba(148,163,184,0.07)",
        borderTop: `2px solid ${f.color}`,
        borderRadius: "0 0 4px 4px",
        display: "flex", flexDirection: "column",
        cursor: onPlayer ? "pointer" : "default",
      }}>
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
          <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 7px", borderRadius: 2, background: f.bg, border: `1px solid ${f.border}`, flexShrink: 0 }}>
            <span style={{ width: 4, height: 4, borderRadius: "50%", background: f.color, boxShadow: `0 0 5px ${f.color}`, display: "inline-block" }} />
            <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 7, fontWeight: 800, letterSpacing: "0.2em", color: f.color }}>{player.flag}</span>
          </div>
        </div>
      </div>

      <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
            <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 7, fontWeight: 700, letterSpacing: "0.24em", color: "#334155" }}>HRV DELTA</span>
            <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 8, fontWeight: 800, color: player.hrv >= 0 ? "#34d399" : "#f43f5e" }}>{hrvDisplay}</span>
          </div>
          <BioBar value={hrvBarVal} color={player.hrv >= 0 ? "#34d399" : "#f43f5e"} height={5} />
        </div>

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

        <div style={{ paddingTop: 8, borderTop: "1px solid rgba(148,163,184,0.04)" }}>
          <RecoveryTrend name={player.name} />
        </div>
      </div>
    </div>
  )
}

interface TeamSectionProps {
  group: TeamGroup
  cols: number
  onTeam?: (abbr: string, league: League) => void
  onPlayer?: (player: KeyPlayer, teamAbbr: string, teamName: string, league: League, match: Match) => void
}

function TeamSection({ group, cols, onTeam, onPlayer }: TeamSectionProps) {
  const t = leagueTheme(group.league)
  const m = group.match
  const isLive = m.status === "LIVE"
  const isFinal = m.status === "FINAL"
  const opponent = m.home.abbr === group.teamAbbr ? m.away : m.home
  const isHome = m.home.abbr === group.teamAbbr

  const clearCount = group.players.filter(r => r.player.flag === "CLEAR").length
  const monitorCount = group.players.filter(r => r.player.flag === "MONITOR").length
  const restCount = group.players.filter(r => r.player.flag === "REST").length

  return (
    <div style={{ marginBottom: 24 }}>
      {/* Team header */}
      <div
        onClick={onTeam ? () => onTeam(group.teamAbbr, group.league) : undefined}
        style={{
          display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
          padding: "10px 16px",
          background: `linear-gradient(90deg, ${t.soft} 0%, rgba(2,6,23,0) 70%)`,
          borderLeft: `3px solid ${t.hex}`,
          borderRadius: "0 4px 4px 0",
          marginBottom: 10,
          cursor: onTeam ? "pointer" : "default",
        }}
      >
        {/* Team Logo + abbr */}
        <TeamLogo teamAbbr={group.teamAbbr} league={group.league} size={28} accentColor={t.hex} />
        <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 14, fontWeight: 900, color: t.hex, letterSpacing: "0.18em" }}>
          {group.teamAbbr}
        </span>
        <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, color: "#475569", letterSpacing: "0.1em" }}>
          {group.teamName}
        </span>

        {/* Match info */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
          {isLive && <LiveDot size={4} />}
          <span style={{
            fontFamily: "var(--font-mono), monospace", fontSize: 8, fontWeight: 700, letterSpacing: "0.14em",
            color: isLive ? "#ef4444" : isFinal ? "#34d399" : "#475569",
          }}>
            {isHome ? "vs" : "@"} {opponent.abbr} · {isFinal ? "FINAL" : isLive ? "LIVE" : m.time}
          </span>

          {/* Readiness summary */}
          <div style={{ display: "flex", gap: 4, marginLeft: 8 }}>
            {clearCount > 0 && (
              <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 7, fontWeight: 800, color: "#34d399", padding: "1px 5px", background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.25)", borderRadius: 2 }}>
                {clearCount} CLR
              </span>
            )}
            {monitorCount > 0 && (
              <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 7, fontWeight: 800, color: "#fbbf24", padding: "1px 5px", background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.25)", borderRadius: 2 }}>
                {monitorCount} MON
              </span>
            )}
            {restCount > 0 && (
              <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 7, fontWeight: 800, color: "#f43f5e", padding: "1px 5px", background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.25)", borderRadius: 2 }}>
                {restCount} REST
              </span>
            )}
          </div>

          {/* Navigate arrow */}
          {onTeam && (
            <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, color: t.hex, marginLeft: 4, opacity: 0.7 }}>→</span>
          )}
        </div>
      </div>

      {/* Player cards */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 10 }}>
        {group.players.map(row => <PlayerCard key={row.key} row={row} onPlayer={onPlayer} />)}
      </div>
    </div>
  )
}

interface Props {
  onTeam?: (teamAbbr: string, league: League) => void
  onPlayer?: (player: KeyPlayer, teamAbbr: string, teamName: string, league: League, match: Match) => void
}

export default function PlayersPage({ onTeam, onPlayer }: Props) {
  const width = useWindowWidth()
  const isMobile = width < 640
  const [leagueFilter, setLeagueFilter] = useState<LeagueFilter>("ALL")
  const [flagFilter, setFlagFilter] = useState<FilterFlag>("ALL")

  const filteredRows = ALL_ROWS.filter(r => {
    const leagueOk = leagueFilter === "ALL" || r.league === leagueFilter
    const flagOk = flagFilter === "ALL" || r.player.flag === flagFilter
    return leagueOk && flagOk
  })

  const grouped = groupByLeagueAndTeam(filteredRows).filter(g => g.teams.length > 0)

  const cols = isMobile ? 1 : width < 900 ? 2 : 3

  const LEAGUE_THEME_HEX: Record<League, string> = {
    MLB: "#f43f5e", NBA: "#22d3ee", EPL: "#a78bfa", UCL: "#34d399", NHL: "#60a5fa",
  }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: isMobile ? "28px 16px 60px" : "44px 28px 80px" }}>

      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, fontWeight: 800, letterSpacing: "0.32em", color: "#475569" }}>PLAYER INTELLIGENCE</span>
          <span style={{ color: "#1e293b", fontFamily: "var(--font-mono), monospace", fontSize: 9 }}>//</span>
          <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, fontWeight: 700, letterSpacing: "0.28em", color: "#334155" }}>LEAGUE · TEAM · READINESS</span>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <h1 style={{ fontFamily: "var(--font-inter), Inter, sans-serif", fontWeight: 900, fontSize: isMobile ? 30 : 44, color: "#f8fafc", letterSpacing: "-0.03em", lineHeight: 1.08, margin: 0 }}>
            ROSTER<br />
            <span style={{ color: "#34d399", textShadow: "0 0 40px rgba(52,211,153,0.35)" }}>READINESS</span>
          </h1>
          <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, color: "#334155", letterSpacing: "0.2em" }}>
            {filteredRows.length} ATHLETES · ALL MATCHES INC. FINAL
          </div>
        </div>
      </div>

      {/* League filter */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 7, color: "#1e293b", letterSpacing: "0.3em", fontWeight: 800, marginBottom: 8 }}>COMPETITION</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button
            onClick={() => setLeagueFilter("ALL")}
            style={{
              padding: "6px 14px",
              fontFamily: "var(--font-mono), monospace", fontSize: 9, fontWeight: 800, letterSpacing: "0.22em",
              color: leagueFilter === "ALL" ? "#22d3ee" : "#334155",
              background: leagueFilter === "ALL" ? "rgba(34,211,238,0.08)" : "transparent",
              border: `1px solid ${leagueFilter === "ALL" ? "rgba(34,211,238,0.4)" : "rgba(148,163,184,0.08)"}`,
              borderRadius: 2, cursor: "pointer",
            }}
          >
            ALL ({ALL_ROWS.length})
          </button>
          {ALL_LEAGUES.map(l => {
            const count = ALL_ROWS.filter(r => r.league === l).length
            if (count === 0) return null
            const hex = LEAGUE_THEME_HEX[l]
            const isActive = leagueFilter === l
            return (
              <button key={l} onClick={() => setLeagueFilter(l)} style={{
                padding: "6px 14px",
                fontFamily: "var(--font-mono), monospace", fontSize: 9, fontWeight: 800, letterSpacing: "0.22em",
                color: isActive ? hex : "#334155",
                background: isActive ? `${hex}10` : "transparent",
                border: `1px solid ${isActive ? hex + "50" : "rgba(148,163,184,0.08)"}`,
                borderRadius: 2, cursor: "pointer",
              }}>
                {l} ({count})
              </button>
            )
          })}
        </div>
      </div>

      {/* Readiness filter */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 7, color: "#1e293b", letterSpacing: "0.3em", fontWeight: 800, marginBottom: 8 }}>READINESS</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {(["ALL", "CLEAR", "MONITOR", "REST"] as FilterFlag[]).map(key => {
            const colors: Record<string, string> = { ALL: "#64748b", CLEAR: "#34d399", MONITOR: "#fbbf24", REST: "#f43f5e" }
            const color = colors[key]
            const isActive = flagFilter === key
            const count = key === "ALL" ? filteredRows.length : filteredRows.filter(r => r.player.flag === key).length
            return (
              <button key={key} onClick={() => setFlagFilter(key)} style={{
                padding: "6px 14px",
                fontFamily: "var(--font-mono), monospace", fontSize: 9, fontWeight: 800, letterSpacing: "0.22em",
                color: isActive ? color : "#334155",
                background: isActive ? `${color}12` : "transparent",
                border: `1px solid ${isActive ? color + "50" : "rgba(148,163,184,0.08)"}`,
                borderRadius: 2, cursor: "pointer",
              }}>
                {key} ({count})
              </button>
            )
          })}
        </div>
      </div>

      {/* League → Team → Players */}
      {grouped.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", fontFamily: "var(--font-mono), monospace", fontSize: 10, color: "#334155", letterSpacing: "0.28em" }}>
          NO PLAYERS MATCH FILTER
        </div>
      ) : (
        grouped.map(({ league, teams }) => {
          const t = leagueTheme(league)
          return (
            <div key={league} style={{ marginBottom: 36 }}>
              {/* League section header — only show when viewing ALL */}
              {leagueFilter === "ALL" && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 12, marginBottom: 16,
                  paddingBottom: 10, borderBottom: `1px solid ${t.hex}22`,
                }}>
                  <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 16, fontWeight: 900, color: t.hex, letterSpacing: "0.24em" }}>
                    {league}
                  </span>
                  <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 8, color: "#334155", letterSpacing: "0.18em" }}>
                    {teams.reduce((n, g) => n + g.players.length, 0)} PLAYERS · {teams.length} TEAMS
                  </span>
                </div>
              )}

              {teams.map(group => (
                <TeamSection key={group.teamAbbr} group={group} cols={cols} onTeam={onTeam} onPlayer={onPlayer} />
              ))}
            </div>
          )
        })
      )}
    </div>
  )
}
