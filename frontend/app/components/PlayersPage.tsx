'use client'

import { useState } from 'react'
import { useWindowWidth } from '../lib/useWindowWidth'
import { KEY_PLAYERS, PLAYER_FORM, type League, type KeyPlayer, type ReadinessFlag, type Match } from '../data/mockData'
import { generateSimulatedPlayers, getPlayerBadgeLabel } from '../lib/playerReadiness'
import { leagueTheme, BioBar, LiveDot } from './ui'
import TeamLogo from './TeamLogo'
import { useMatchesContext } from '../context/MatchesContext'
import { PAGE_SHELL_STYLE, BREAKPOINTS } from '../lib/ui'

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

function buildPlayerRows(matches: Match[]): PlayerRow[] {
  const rows: PlayerRow[] = []
  const coveredMatchIds = new Set<string>()

  for (const [rawKey, players] of Object.entries(KEY_PLAYERS)) {
    const isAway = rawKey.endsWith("_away")
    const isHome = rawKey.endsWith("_home")
    if (!isAway && !isHome) continue
    const side = isAway ? "away" : "home"
    const matchId = rawKey.slice(0, -(side.length + 1))
    const match = matches.find(m => m.id === matchId)
    if (!match) continue
    coveredMatchIds.add(matchId)
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

  for (const match of matches) {
    if (coveredMatchIds.has(match.id)) continue
    for (const side of ['home', 'away'] as const) {
      const simPlayers = generateSimulatedPlayers(match, side)
      for (const p of simPlayers) {
        rows.push({
          player: p,
          teamAbbr: match[side].abbr,
          teamName: match[side].name,
          league: match.league,
          match,
          isHome: side === 'home',
          key: `sim-${match.id}-${side}-${p.name}`,
        })
      }
    }
  }

  return rows
}

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
        borderTop: `3px solid ${f.color}`,
        borderRadius: "0 0 8px 8px",
        display: "flex", flexDirection: "column",
        cursor: onPlayer ? "pointer" : "default",
        transition: 'transform 0.2s ease',
      }}
      className="hover:scale-[1.01]"
    >
      <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(148,163,184,0.06)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
            background: f.bg, border: `1px solid ${f.border}`,
            display: "grid", placeItems: "center",
          }}>
            <span style={{ fontFamily: "var(--font-inter), Inter, sans-serif", fontSize: 13, fontWeight: 900, color: f.color }}>{getPlayerBadgeLabel(player)}</span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "var(--font-inter), Inter, sans-serif", fontSize: 13, fontWeight: 800, color: "#f1f5f9", letterSpacing: "-0.01em", lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {player.name}
            </div>
            <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 8, color: "#475569", letterSpacing: "0.22em", marginTop: 2, fontWeight: 700 }}>
              {player.pos}
            </div>
          </div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 8px", borderRadius: 4, background: f.bg, border: `1px solid ${f.border}`, flexShrink: 0 }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: f.color, boxShadow: `0 0 6px ${f.color}`, display: "inline-block" }} />
            <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 8, fontWeight: 900, letterSpacing: "0.15em", color: f.color }}>{player.flag}</span>
          </div>
        </div>
      </div>

      <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 16, flex: 1 }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 8, fontWeight: 800, letterSpacing: "0.24em", color: "#334155" }}>HRV VARIANCE</span>
            <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 10, fontWeight: 900, color: player.hrv >= 0 ? "#34d399" : "#f43f5e" }}>{hrvDisplay}</span>
          </div>
          <BioBar value={hrvBarVal} color={player.hrv >= 0 ? "#34d399" : "#f43f5e"} height={5} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, paddingTop: 12, borderTop: "1px solid rgba(148,163,184,0.06)" }}>
          <div>
            <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 8, color: "#334155", letterSpacing: "0.2em", marginBottom: 4, fontWeight: 700 }}>SLEEP DEBT</div>
            <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 16, fontWeight: 900, color: sleepColor, letterSpacing: "-0.01em" }}>
              {player.sleep.toFixed(1)}<span style={{ fontSize: 9, color: "#475569", marginLeft: 3, fontWeight: 800 }}>h</span>
            </div>
          </div>
          <div>
            <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 8, color: "#334155", letterSpacing: "0.2em", marginBottom: 4, fontWeight: 700 }}>EXHAUSTION</div>
            <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 16, fontWeight: 900, color: f.color, letterSpacing: "-0.01em" }}>
              {Math.min(100, Math.round(Math.abs(player.hrv) * 100 + player.sleep * 12))}<span style={{ fontSize: 9, color: "#475569", marginLeft: 2, fontWeight: 800 }}>%</span>
            </div>
          </div>
        </div>

        <div style={{ paddingTop: 12, borderTop: "1px solid rgba(148,163,184,0.06)" }}>
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
    <div style={{ marginBottom: 32 }}>
      <div
        onClick={onTeam ? () => onTeam(group.teamAbbr, group.league) : undefined}
        style={{
          display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
          padding: "12px 20px",
          background: `linear-gradient(90deg, ${t.soft} 0%, rgba(2,6,23,0) 70%)`,
          borderLeft: `4px solid ${t.hex}`,
          borderRadius: "0 8px 8px 0",
          marginBottom: 16,
          cursor: onTeam ? "pointer" : "default",
        }}
      >
        <TeamLogo teamAbbr={group.teamAbbr} league={group.league} size={32} accentColor={t.hex} />
        <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 16, fontWeight: 900, color: t.hex, letterSpacing: "0.2em" }}>
          {group.teamAbbr}
        </span>
        <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 10, color: "#475569", letterSpacing: "0.12em", fontWeight: 700 }}>
          {group.teamName}
        </span>

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
          {isLive && <LiveDot size={4} />}
          <span style={{
            fontFamily: "var(--font-mono), monospace", fontSize: 9, fontWeight: 800, letterSpacing: "0.18em",
            color: isLive ? "#ef4444" : isFinal ? "#34d399" : "#475569",
          }}>
            {isHome ? "VS" : "@"} {opponent.abbr} · {isFinal ? "FINAL" : isLive ? "LIVE" : m.time}
          </span>

          <div style={{ display: "flex", gap: 6, marginLeft: 12 }}>
            {clearCount > 0 && (
              <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 8, fontWeight: 900, color: "#34d399", padding: "2px 8px", background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.3)", borderRadius: 4 }}>
                {clearCount} CLR
              </span>
            )}
            {monitorCount > 0 && (
              <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 8, fontWeight: 900, color: "#fbbf24", padding: "2px 8px", background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.3)", borderRadius: 4 }}>
                {monitorCount} MON
              </span>
            )}
            {restCount > 0 && (
              <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 8, fontWeight: 900, color: "#f43f5e", padding: "2px 8px", background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.3)", borderRadius: 4 }}>
                {restCount} REST
              </span>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 16 }}>
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
  const isMobile = width < BREAKPOINTS.mobile
  const isTablet = width < BREAKPOINTS.tablet
  const [leagueFilter, setLeagueFilter] = useState<LeagueFilter>("ALL")
  const [flagFilter, setFlagFilter] = useState<FilterFlag>("ALL")
  const { matches } = useMatchesContext()
  
  const ALL_ROWS = buildPlayerRows(matches)

  const filteredRows = ALL_ROWS.filter(r => {
    const leagueOk = leagueFilter === "ALL" || r.league === leagueFilter
    const flagOk = flagFilter === "ALL" || r.player.flag === flagFilter
    return leagueOk && flagOk
  })

  const grouped = groupByLeagueAndTeam(filteredRows).filter(g => g.teams.length > 0)
  const cols = isMobile ? 1 : isTablet ? 2 : 3

  const LEAGUE_THEME_HEX: Record<League, string> = {
    MLB: "#f43f5e", NBA: "#22d3ee", EPL: "#a78bfa", UCL: "#34d399", NHL: "#60a5fa",
  }

  return (
    <div style={PAGE_SHELL_STYLE}>
      <div className="py-8 sm:py-12 lg:py-16">
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, fontWeight: 800, letterSpacing: "0.32em", color: "#475569" }}>PLAYER INTELLIGENCE</span>
            <span style={{ color: "#1e293b", fontFamily: "var(--font-mono), monospace", fontSize: 9 }}>//</span>
            <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, fontWeight: 700, letterSpacing: "0.28em", color: "#334155" }}>BIO-READINESS ENGINE</span>
          </div>
          <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "flex-start" : "flex-end", justifyContent: "space-between", gap: 24 }}>
            <h1 style={{ 
              fontFamily: "var(--font-inter), Inter, sans-serif", 
              fontWeight: 900, 
              fontSize: "clamp(36px, 10vw, 64px)", 
              color: "#f8fafc", 
              letterSpacing: "-0.04em", 
              lineHeight: 0.85, 
              margin: 0 
            }}>
              ROSTER<br />
              <span style={{ color: "#34d399", textShadow: "0 0 40px rgba(52,211,153,0.3)" }}>READINESS</span>
            </h1>
            <div style={{ 
              fontFamily: "var(--font-mono), monospace", 
              fontSize: 10, 
              color: "#475569", 
              letterSpacing: "0.25em",
              background: "rgba(15,23,42,0.6)",
              padding: "8px 16px",
              borderRadius: 4,
              border: "1px solid rgba(148,163,184,0.08)"
            }}>
              {filteredRows.length} ATHLETES REGISTERED
            </div>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24, marginBottom: 48 }}>
          {/* League filter */}
          <div>
            <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 7, color: "#1e293b", letterSpacing: "0.3em", fontWeight: 800, marginBottom: 12, textTransform: "uppercase" }}>Competition Layer</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                onClick={() => setLeagueFilter("ALL")}
                style={{
                  padding: "10px 20px",
                  fontFamily: "var(--font-mono), monospace", fontSize: 10, fontWeight: 800, letterSpacing: "0.22em",
                  color: leagueFilter === "ALL" ? "#22d3ee" : "#475569",
                  background: leagueFilter === "ALL" ? "rgba(34,211,238,0.1)" : "rgba(15,23,42,0.4)",
                  border: `1px solid ${leagueFilter === "ALL" ? "rgba(34,211,238,0.4)" : "rgba(148,163,184,0.12)"}`,
                  borderRadius: 4, cursor: "pointer",
                  transition: "all 0.2s ease"
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
                    padding: "10px 20px",
                    fontFamily: "var(--font-mono), monospace", fontSize: 10, fontWeight: 800, letterSpacing: "0.22em",
                    color: isActive ? hex : "#475569",
                    background: isActive ? `${hex}10` : "rgba(15,23,42,0.4)",
                    border: `1px solid ${isActive ? hex + "50" : "rgba(148,163,184,0.12)"}`,
                    borderRadius: 4, cursor: "pointer",
                    transition: "all 0.2s ease"
                  }}>
                    {l} ({count})
                  </button>
                )
              })}
            </div>
          </div>

          {/* Readiness filter */}
          <div>
            <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 7, color: "#1e293b", letterSpacing: "0.3em", fontWeight: 800, marginBottom: 12, textTransform: "uppercase" }}>Readiness State</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {(["ALL", "CLEAR", "MONITOR", "REST"] as FilterFlag[]).map(key => {
                const colors: Record<string, string> = { ALL: "#64748b", CLEAR: "#34d399", MONITOR: "#fbbf24", REST: "#f43f5e" }
                const color = colors[key]
                const isActive = flagFilter === key
                const count = key === "ALL" ? filteredRows.length : filteredRows.filter(r => r.player.flag === key).length
                return (
                  <button key={key} onClick={() => setFlagFilter(key)} style={{
                    padding: "10px 20px",
                    fontFamily: "var(--font-mono), monospace", fontSize: 10, fontWeight: 800, letterSpacing: "0.22em",
                    color: isActive ? color : "#475569",
                    background: isActive ? `${color}12` : "rgba(15,23,42,0.4)",
                    border: `1px solid ${isActive ? color + "50" : "rgba(148,163,184,0.12)"}`,
                    borderRadius: 4, cursor: "pointer",
                    transition: "all 0.2s ease"
                  }}>
                    {key} ({count})
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {grouped.length === 0 ? (
          <div style={{ 
            textAlign: "center", 
            padding: "100px 24px", 
            border: "1px dashed rgba(148,163,184,0.12)",
            borderRadius: 12,
            fontFamily: "var(--font-mono), monospace" 
          }}>
            <div style={{ fontSize: 12, color: "#475569", letterSpacing: "0.4em", fontWeight: 900, marginBottom: 16 }}>
              [ NO MATCHING SIGNALS ]
            </div>
            <div style={{ fontSize: 9, color: "#334155", letterSpacing: "0.2em", maxWidth: 400, margin: "0 auto" }}>
              The bio-analytical engine has no active data matching your current filter set. Reset parameters to restore signal.
            </div>
          </div>
        ) : (
          grouped.map(({ league, teams }) => {
            const t = leagueTheme(league)
            return (
              <div key={league} style={{ marginBottom: 48 }}>
                {leagueFilter === "ALL" && (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 16, marginBottom: 24,
                    paddingBottom: 12, borderBottom: `1px solid ${t.hex}33`,
                  }}>
                    <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 20, fontWeight: 900, color: t.hex, letterSpacing: "0.24em" }}>
                      {league}
                    </span>
                    <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 10, color: "#475569", letterSpacing: "0.2em", fontWeight: 800 }}>
                      {teams.reduce((n, g) => n + g.players.length, 0)} ATHLETES · {teams.length} UNITS
                    </span>
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
                  {teams.map(group => (
                    <TeamSection key={group.teamAbbr} group={group} cols={cols} onTeam={onTeam} onPlayer={onPlayer} />
                  ))}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
