'use client'

import { useWindowWidth } from '../lib/useWindowWidth'
import {
  LEAGUE_STANDINGS, getKeyPlayers, PLAYER_FORM,
  type League, type Match, type KeyPlayer,
} from '../data/mockData'
import { leagueTheme, BioBar, LiveDot } from './ui'
import TeamLogo from './TeamLogo'
import { useMatchesContext } from '../context/MatchesContext'

const FLAG_COLOR: Record<string, string> = {
  CLEAR: "#34d399",
  MONITOR: "#fbbf24",
  REST: "#f43f5e",
}

const FORM_COLOR: Record<string, string> = { W: "#34d399", L: "#f43f5e", D: "#475569" }

interface Props {
  teamAbbr: string
  league: League
  onBack: () => void
}

function RecoverySparkline({ name }: { name: string }) {
  const scores = PLAYER_FORM[name]
  if (!scores) return null
  return (
    <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 20 }}>
      {scores.map((s, i) => {
        const color = s >= 0.80 ? "#34d399" : s >= 0.65 ? "#fbbf24" : "#f43f5e"
        return (
          <div key={i} style={{
            width: 7, borderRadius: 1,
            height: Math.round(4 + s * 16),
            background: color,
            opacity: 0.3 + (i / scores.length) * 0.7,
          }} />
        )
      })}
    </div>
  )
}

export default function TeamDetailPage({ teamAbbr, league, onBack }: Props) {
  const width = useWindowWidth()
  const isMobile = width < 640
  const t = leagueTheme(league)
  const { matches: allMatches } = useMatchesContext()

  const standings = LEAGUE_STANDINGS[league]
  const teamRec = standings.find(r => r.abbr === teamAbbr)
  const position = standings.findIndex(r => r.abbr === teamAbbr) + 1
  const isPts = league === "EPL"

  const matches = allMatches.filter(m => m.away.abbr === teamAbbr || m.home.abbr === teamAbbr)

  const playerEntries: { player: KeyPlayer; match: Match }[] = []
  for (const m of matches) {
    const side = m.home.abbr === teamAbbr ? "home" : "away"
    const players = getKeyPlayers(m, side)
    for (const p of players) playerEntries.push({ player: p, match: m })
  }

  if (!teamRec) {
    return (
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: isMobile ? "28px 16px" : "44px 28px" }}>
        <button onClick={onBack} style={{ background: "transparent", border: "none", cursor: "pointer", padding: 0, marginBottom: 24 }}>
          <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, color: "#334155", letterSpacing: "0.22em" }}>← BACK</span>
        </button>
        <div style={{ fontFamily: "var(--font-mono), monospace", color: "#f43f5e", fontSize: 10, letterSpacing: "0.2em" }}>TEAM NOT FOUND</div>
      </div>
    )
  }

  const record = isPts ? `${teamRec.pts} PTS` : `${teamRec.w}W · ${teamRec.l}L`
  const streakColor = teamRec.streak.startsWith("W") ? "#34d399" : teamRec.streak.startsWith("L") ? "#f43f5e" : "#475569"

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: isMobile ? "28px 16px 60px" : "44px 28px 80px" }}>

      {/* Back */}
      <button onClick={onBack} style={{ background: "transparent", border: "none", cursor: "pointer", padding: 0, marginBottom: 28, display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, color: "#475569", letterSpacing: "0.22em" }}>←</span>
        <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, color: "#334155", letterSpacing: "0.22em" }}>BACK</span>
      </button>

      {/* Team header */}
      <div style={{
        border: "1px solid rgba(148,163,184,0.07)",
        borderLeft: `4px solid ${t.hex}`,
        borderRadius: "0 8px 8px 0",
        padding: isMobile ? "20px 16px 24px" : "28px 32px 32px",
        background: `linear-gradient(90deg, ${t.soft} 0%, rgba(2,6,23,0) 65%)`,
        marginBottom: 20,
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: isMobile ? 14 : 22 }}>
            {/* Team Logo */}
            <TeamLogo teamAbbr={teamAbbr} league={league} size={isMobile ? 64 : 88} accentColor={t.hex} />

            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <span style={{
                  fontFamily: "var(--font-mono), monospace", fontSize: 8, fontWeight: 800,
                  letterSpacing: "0.28em", color: t.hex, padding: "2px 9px",
                  border: `1px solid ${t.hex}44`, background: `${t.hex}11`, borderRadius: 2,
                }}>{league}</span>
                {position > 0 && (
                  <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 8, color: "#334155", letterSpacing: "0.2em" }}>
                    #{position} IN STANDINGS
                  </span>
                )}
              </div>
              <div style={{ fontFamily: "var(--font-inter), Inter, sans-serif", fontWeight: 900, fontSize: isMobile ? 36 : 52, color: "#f8fafc", letterSpacing: "-0.03em", lineHeight: 1, marginBottom: 6 }}>
                {teamAbbr}
              </div>
              <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 11, color: "#64748b", letterSpacing: "0.12em" }}>
                {teamRec.name}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: isMobile ? "flex-start" : "flex-end", gap: 10 }}>
            <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: isMobile ? 22 : 30, fontWeight: 900, color: "#e2e8f0", letterSpacing: "0.04em" }}>
              {record}
            </div>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 14px", borderRadius: 3,
              background: `${streakColor}10`, border: `1px solid ${streakColor}35`,
            }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: streakColor, boxShadow: `0 0 6px ${streakColor}`, display: "inline-block" }} />
              <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 10, fontWeight: 800, letterSpacing: "0.22em", color: streakColor }}>
                {teamRec.streak}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Model metrics + form */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14, marginBottom: 20 }}>
        {/* Edge + Recovery */}
        <div style={{ background: "rgba(15,23,42,0.4)", border: "1px solid rgba(148,163,184,0.07)", borderRadius: 4, padding: "20px 24px" }}>
          <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 7, color: "#334155", letterSpacing: "0.3em", fontWeight: 800, marginBottom: 18 }}>
            MODEL METRICS
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 8, color: "#475569", letterSpacing: "0.2em" }}>EDGE SCORE</span>
                <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 11, fontWeight: 800, color: teamRec.edge > 0.68 ? "#34d399" : teamRec.edge > 0.58 ? "#fbbf24" : "#f43f5e" }}>
                  {Math.round(teamRec.edge * 100)}%
                </span>
              </div>
              <BioBar value={teamRec.edge} color={teamRec.edge > 0.68 ? "#34d399" : teamRec.edge > 0.58 ? "#fbbf24" : "#f43f5e"} height={6} />
            </div>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 8, color: "#475569", letterSpacing: "0.2em" }}>RECOVERY AVG</span>
                <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 11, fontWeight: 800, color: teamRec.recovery > 0.75 ? "#34d399" : teamRec.recovery > 0.6 ? "#fbbf24" : "#f43f5e" }}>
                  {Math.round(teamRec.recovery * 100)}%
                </span>
              </div>
              <BioBar value={teamRec.recovery} color={teamRec.recovery > 0.75 ? "#34d399" : teamRec.recovery > 0.6 ? "#fbbf24" : "#f43f5e"} height={6} />
            </div>
          </div>
        </div>

        {/* Recent form */}
        <div style={{ background: "rgba(15,23,42,0.4)", border: "1px solid rgba(148,163,184,0.07)", borderRadius: 4, padding: "20px 24px" }}>
          <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 7, color: "#334155", letterSpacing: "0.3em", fontWeight: 800, marginBottom: 18 }}>
            RECENT FORM <span style={{ color: "#1e293b", marginLeft: 8 }}>OLDEST → NEWEST</span>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {teamRec.form.map((r, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 4, display: "grid", placeItems: "center",
                  background: `${FORM_COLOR[r]}12`, border: `1px solid ${FORM_COLOR[r]}40`,
                  opacity: 0.4 + (i / teamRec.form.length) * 0.6,
                }}>
                  <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 14, fontWeight: 900, color: FORM_COLOR[r] }}>{r}</span>
                </div>
                <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 7, color: "#1e293b", letterSpacing: "0.18em" }}>
                  {i === teamRec.form.length - 1 ? "NOW" : `G-${teamRec.form.length - i}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Today's fixture(s) */}
      {matches.length > 0 && (
        <div style={{ background: "rgba(15,23,42,0.4)", border: "1px solid rgba(148,163,184,0.07)", borderRadius: 4, padding: "20px 24px", marginBottom: 20 }}>
          <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 7, color: "#334155", letterSpacing: "0.3em", fontWeight: 800, marginBottom: 14 }}>
            TODAY'S FIXTURE{matches.length > 1 ? "S" : ""}
          </div>
          {matches.map((m, i) => {
            const isHome = m.home.abbr === teamAbbr
            const opponent = isHome ? m.away : m.home
            const isLive = m.status === "LIVE"
            const isFinal = m.status === "FINAL"
            const wpaColor = m.wpa >= 0 ? "#34d399" : "#f43f5e"
            return (
              <div key={m.id} style={{
                display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
                padding: i > 0 ? "14px 0 0" : "0",
                borderTop: i > 0 ? "1px solid rgba(148,163,184,0.05)" : "none",
              }}>
                <span style={{
                  fontFamily: "var(--font-mono), monospace", fontSize: 8, fontWeight: 800, letterSpacing: "0.18em",
                  color: isHome ? t.hex : "#64748b",
                  padding: "2px 8px", borderRadius: 2,
                  border: `1px solid ${isHome ? t.hex + "44" : "rgba(100,116,139,0.2)"}`,
                  background: isHome ? `${t.hex}10` : "transparent",
                }}>{isHome ? "HOME" : "AWAY"}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 120 }}>
                  <TeamLogo teamAbbr={opponent.abbr} league={m.league} size={36} accentColor="#64748b" />
                  <div>
                    <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 13, fontWeight: 800, color: "#e2e8f0" }}>vs {opponent.abbr}</span>
                    <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, color: "#475569", letterSpacing: "0.1em" }}>{opponent.name}</div>
                  </div>
                </div>
                {m.score && (
                  <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 14, fontWeight: 800, color: "#94a3b8", letterSpacing: "0.08em" }}>
                    {isHome ? `${m.score.home} – ${m.score.away}` : `${m.score.away} – ${m.score.home}`}
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {isLive && <LiveDot size={5} />}
                  <span style={{
                    fontFamily: "var(--font-mono), monospace", fontSize: 9, fontWeight: 800, letterSpacing: "0.18em",
                    color: isLive ? "#ef4444" : isFinal ? "#34d399" : "#475569",
                  }}>{isFinal ? "FINAL" : isLive ? "LIVE" : m.time}</span>
                </div>
                <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 11, fontWeight: 800, color: wpaColor, minWidth: 52, textAlign: "right" }}>
                  {m.wpa >= 0 ? "+" : ""}{(m.wpa * 100).toFixed(1)}%
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Roster readiness */}
      {playerEntries.length > 0 && (
        <div style={{ background: "rgba(15,23,42,0.4)", border: "1px solid rgba(148,163,184,0.07)", borderRadius: 4, padding: "20px 24px", marginBottom: 20 }}>
          <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 7, color: "#334155", letterSpacing: "0.3em", fontWeight: 800, marginBottom: 14 }}>
            ROSTER READINESS — TODAY
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)", gap: 10 }}>
            {playerEntries.map(({ player }, idx) => {
              const flagColor = FLAG_COLOR[player.flag]
              const hrvDisplay = (player.hrv >= 0 ? "+" : "") + Math.round(player.hrv * 100) + "%"
              const sleepColor = player.sleep > 1.5 ? "#f43f5e" : player.sleep > 0.8 ? "#fbbf24" : "#34d399"
              const hrvBarVal = Math.max(0, Math.min(1, 0.5 + player.hrv * 2.5))
              return (
                <div key={idx} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
                  background: "rgba(2,6,23,0.4)", borderRadius: 3,
                  border: "1px solid rgba(148,163,184,0.05)",
                  borderLeft: `3px solid ${flagColor}`,
                }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
                    background: `${flagColor}12`, border: `1px solid ${flagColor}44`,
                    display: "grid", placeItems: "center",
                  }}>
                    <span style={{ fontFamily: "var(--font-inter), Inter", fontSize: 11, fontWeight: 900, color: flagColor }}>{player.initials}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "var(--font-inter), Inter, sans-serif", fontSize: 11, fontWeight: 800, color: "#f1f5f9", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {player.name}
                    </div>
                    <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 7, color: "#475569", letterSpacing: "0.18em", marginTop: 2 }}>
                      {player.pos}
                    </div>
                    <div style={{ marginTop: 6 }}>
                      <BioBar value={hrvBarVal} color={player.hrv >= 0 ? "#34d399" : "#f43f5e"} height={3} />
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5, flexShrink: 0 }}>
                    <div style={{
                      display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 7px",
                      borderRadius: 2, background: `${flagColor}12`, border: `1px solid ${flagColor}44`,
                    }}>
                      <span style={{ width: 4, height: 4, borderRadius: "50%", background: flagColor, boxShadow: `0 0 4px ${flagColor}`, display: "inline-block" }} />
                      <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 7, fontWeight: 800, letterSpacing: "0.18em", color: flagColor }}>{player.flag}</span>
                    </div>
                    <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, fontWeight: 800, color: player.hrv >= 0 ? "#34d399" : "#f43f5e" }}>
                      HRV {hrvDisplay}
                    </div>
                    <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 8, color: sleepColor }}>
                      {player.sleep.toFixed(1)}h debt
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* League standings */}
      <div style={{ background: "rgba(15,23,42,0.4)", border: "1px solid rgba(148,163,184,0.07)", borderRadius: 4, padding: "20px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 7, color: "#334155", letterSpacing: "0.3em", fontWeight: 800 }}>
            {league} STANDINGS
          </div>
          <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 7, fontWeight: 800, letterSpacing: "0.18em", color: "#fbbf24", padding: "2px 6px", border: "1px solid rgba(251,191,36,0.25)", borderRadius: 2 }}>PLACEHOLDER</span>
        </div>
        {standings.map((s, i) => {
          const isThis = s.abbr === teamAbbr
          const edgeColor = s.edge > 0.68 ? "#34d399" : s.edge > 0.58 ? "#fbbf24" : "#f43f5e"
          return (
            <div key={s.abbr} style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "24px 44px 1fr 68px" : "24px 52px 1fr 80px 90px",
              alignItems: "center",
              padding: "9px 0 9px 8px",
              marginLeft: isThis ? 0 : 4,
              borderBottom: i < standings.length - 1 ? "1px solid rgba(148,163,184,0.04)" : "none",
              background: isThis ? `${t.hex}08` : "transparent",
              borderLeft: isThis ? `3px solid ${t.hex}` : "3px solid transparent",
              borderRadius: isThis ? "0 2px 2px 0" : 0,
            }}>
              <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 8, color: "#1e293b" }}>#{i + 1}</span>
              <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 11, fontWeight: 800, color: isThis ? t.hex : "#64748b", letterSpacing: "0.14em" }}>{s.abbr}</span>
              {!isMobile && <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, color: "#334155", letterSpacing: "0.1em" }}>{s.name}</span>}
              {isMobile && <div />}
              <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, fontWeight: 700, color: "#475569" }}>
                {isPts ? `${s.pts}pts` : `${s.w}-${s.l}`}
              </span>
              {!isMobile && (
                <div>
                  <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 8, fontWeight: 800, color: edgeColor, marginBottom: 3 }}>
                    {Math.round(s.edge * 100)}%
                  </div>
                  <BioBar value={s.edge} color={edgeColor} height={3} />
                </div>
              )}
            </div>
          )
        })}
      </div>

    </div>
  )
}
