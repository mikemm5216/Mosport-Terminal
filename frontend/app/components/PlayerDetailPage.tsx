'use client'

import { useWindowWidth } from '../lib/useWindowWidth'
import { PLAYER_FORM, type League, type KeyPlayer, type Match } from '../data/mockData'
import { leagueTheme, BioBar, LiveDot, LeagueBadge } from './ui'
import TeamLogo from './TeamLogo'

const FLAG_COLOR: Record<string, string> = {
  CLEAR:   "#34d399",
  MONITOR: "#fbbf24",
  REST:    "#f43f5e",
}

const FLAG_ASSESSMENT: Record<string, string> = {
  CLEAR:   "ATHLETE CLEARED FOR FULL DEPLOYMENT",
  MONITOR: "UNDER OBSERVATION — LOAD MANAGEMENT ADVISED",
  REST:    "FLAGGED — RECOMMEND BENCHING",
}

interface Props {
  player: KeyPlayer
  teamAbbr: string
  teamName: string
  league: League
  match?: Match
  onBack: () => void
  onTeam: (abbr: string, league: League) => void
}

function RecoveryTrendExpanded({ name }: { name: string }) {
  const scores = PLAYER_FORM[name]
  if (!scores) {
    return (
      <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, color: "#334155", letterSpacing: "0.2em" }}>
        NO TREND DATA
      </div>
    )
  }
  function color(s: number) {
    if (s >= 0.80) return "#34d399"
    if (s >= 0.65) return "#fbbf24"
    return "#f43f5e"
  }
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length
  const trend = scores[scores.length - 1] - scores[0]

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 16 }}>
          <div>
            <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 7, color: "#334155", letterSpacing: "0.28em", marginBottom: 3 }}>AVG RECOVERY</div>
            <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 14, fontWeight: 800, color: color(avg) }}>
              {Math.round(avg * 100)}<span style={{ fontSize: 8, color: "#475569", marginLeft: 1 }}>%</span>
            </div>
          </div>
          <div>
            <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 7, color: "#334155", letterSpacing: "0.28em", marginBottom: 3 }}>5G TREND</div>
            <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 14, fontWeight: 800, color: trend >= 0 ? "#34d399" : "#f43f5e" }}>
              {trend >= 0 ? "▲" : "▼"} {Math.abs(Math.round(trend * 100))}<span style={{ fontSize: 8, color: "#475569", marginLeft: 1 }}>pts</span>
            </div>
          </div>
        </div>
        <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 7, color: "#1e293b", letterSpacing: "0.22em" }}>OLD → NEW</span>
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 64 }}>
        {scores.map((s, i) => {
          const c = color(s)
          const barH = Math.round(8 + s * 52)
          return (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, justifyContent: "flex-end" }}>
              <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 8, fontWeight: 800, color: c, opacity: 0.5 + (i / scores.length) * 0.5 }}>
                {Math.round(s * 100)}
              </span>
              <div style={{
                width: "100%", borderRadius: 2,
                height: barH,
                background: c,
                opacity: 0.35 + (i / scores.length) * 0.65,
                boxShadow: `0 0 6px ${c}55`,
              }} />
              <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 6, color: "#1e293b", letterSpacing: "0.14em" }}>
                {i === scores.length - 1 ? "NOW" : `G-${scores.length - i}`}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function PlayerDetailPage({ player, teamAbbr, teamName, league, match, onBack, onTeam }: Props) {
  const width = useWindowWidth()
  const isMobile = width < 640
  const t = leagueTheme(league)
  const flagColor = FLAG_COLOR[player.flag]
  const hrvDisplay = (player.hrv >= 0 ? "+" : "") + Math.round(player.hrv * 100) + "%"
  const hrvBarVal = Math.max(0, Math.min(1, 0.5 + player.hrv * 2.5))
  const sleepColor = player.sleep > 1.5 ? "#f43f5e" : player.sleep > 0.8 ? "#fbbf24" : "#34d399"
  const fatigue = Math.min(100, Math.round(Math.abs(player.hrv) * 100 + player.sleep * 12))

  const isLive = match?.status === "LIVE"
  const isFinal = match?.status === "FINAL"
  const isHome = match?.home.abbr === teamAbbr
  const opponent = match ? (isHome ? match.away : match.home) : null
  const wpaColor = match ? (match.wpa >= 0 ? "#34d399" : "#f43f5e") : "#64748b"

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: isMobile ? "28px 16px 60px" : "44px 28px 80px" }}>

      {/* Back */}
      <button onClick={onBack} style={{ background: "transparent", border: "none", cursor: "pointer", padding: 0, marginBottom: 28, display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, color: "#475569", letterSpacing: "0.22em" }}>←</span>
        <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, color: "#334155", letterSpacing: "0.22em" }}>BACK</span>
      </button>

      {/* Player header */}
      <div style={{
        border: "1px solid rgba(148,163,184,0.07)",
        borderLeft: `4px solid ${flagColor}`,
        borderRadius: "0 8px 8px 0",
        padding: isMobile ? "20px 16px 24px" : "28px 32px 32px",
        background: `linear-gradient(90deg, ${flagColor}08 0%, rgba(2,6,23,0) 65%)`,
        marginBottom: 20,
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: isMobile ? 14 : 22 }}>
            {/* Avatar */}
            <div style={{
              width: isMobile ? 56 : 64,
              height: isMobile ? 56 : 64,
              borderRadius: "50%",
              background: `${flagColor}18`,
              border: `2px solid ${flagColor}55`,
              display: "grid", placeItems: "center",
              boxShadow: `0 0 20px ${flagColor}30`,
              flexShrink: 0,
            }}>
              <span style={{
                fontFamily: "var(--font-inter), Inter, sans-serif",
                fontSize: isMobile ? 20 : 24, fontWeight: 900, color: flagColor,
              }}>{player.initials}</span>
            </div>

            <div>
              <div style={{ fontFamily: "var(--font-inter), Inter, sans-serif", fontWeight: 900, fontSize: isMobile ? 28 : 40, color: "#f8fafc", letterSpacing: "-0.03em", lineHeight: 1, marginBottom: 8 }}>
                {player.name}
              </div>
              <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 10, color: "#64748b", letterSpacing: "0.2em", marginBottom: 12 }}>
                {player.pos}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                {/* Team badge */}
                <div
                  onClick={() => onTeam(teamAbbr, league)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6, cursor: "pointer",
                    padding: "3px 10px 3px 6px",
                    background: `${t.hex}10`, border: `1px solid ${t.hex}33`,
                    borderRadius: 3,
                  }}
                >
                  <TeamLogo teamAbbr={teamAbbr} league={league} size={20} accentColor={t.hex} />
                  <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 10, fontWeight: 800, color: t.hex, letterSpacing: "0.18em" }}>
                    {teamAbbr}
                  </span>
                  <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 8, color: "#475569", letterSpacing: "0.1em" }}>
                    {teamName}
                  </span>
                  <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, color: t.hex, opacity: 0.7 }}>→</span>
                </div>
                <LeagueBadge league={league} />
              </div>
            </div>
          </div>

          {/* Readiness flag */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "6px 16px", borderRadius: 3,
            background: `${flagColor}10`, border: `1px solid ${flagColor}44`,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: flagColor, boxShadow: `0 0 8px ${flagColor}`, display: "inline-block" }} />
            <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 11, fontWeight: 800, letterSpacing: "0.22em", color: flagColor }}>
              {player.flag}
            </span>
          </div>
        </div>
      </div>

      {/* Biometrics panel */}
      <div style={{ background: "rgba(15,23,42,0.4)", border: "1px solid rgba(148,163,184,0.07)", borderRadius: 4, padding: "20px 24px", marginBottom: 20 }}>
        <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 7, color: "#334155", letterSpacing: "0.3em", fontWeight: 800, marginBottom: 18 }}>
          BIOMETRIC READINESS
        </div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 20 }}>
          {/* HRV Delta */}
          <div>
            <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 7, color: "#334155", letterSpacing: "0.28em", fontWeight: 800, marginBottom: 8 }}>HRV DELTA</div>
            <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 32, fontWeight: 900, color: player.hrv >= 0 ? "#34d399" : "#f43f5e", letterSpacing: "-0.02em", marginBottom: 10, lineHeight: 1 }}>
              {hrvDisplay}
            </div>
            <BioBar value={hrvBarVal} color={player.hrv >= 0 ? "#34d399" : "#f43f5e"} height={8} />
          </div>
          {/* Sleep Debt */}
          <div>
            <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 7, color: "#334155", letterSpacing: "0.28em", fontWeight: 800, marginBottom: 8 }}>SLEEP DEBT</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 4, marginBottom: 10 }}>
              <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 32, fontWeight: 900, color: sleepColor, letterSpacing: "-0.02em", lineHeight: 1 }}>
                {player.sleep.toFixed(1)}
              </span>
              <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 12, color: "#475569", marginBottom: 4 }}>hrs</span>
            </div>
            <BioBar value={Math.min(1, player.sleep / 4)} color={sleepColor} height={8} />
          </div>
          {/* Fatigue */}
          <div>
            <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 7, color: "#334155", letterSpacing: "0.28em", fontWeight: 800, marginBottom: 8 }}>FATIGUE SCORE</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 2, marginBottom: 10 }}>
              <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 32, fontWeight: 900, color: flagColor, letterSpacing: "-0.02em", lineHeight: 1 }}>
                {fatigue}
              </span>
              <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 12, color: "#475569", marginBottom: 4 }}>%</span>
            </div>
            <BioBar value={fatigue / 100} color={flagColor} height={8} />
          </div>
        </div>
      </div>

      {/* 5-Game Recovery Trend */}
      <div style={{ background: "rgba(15,23,42,0.4)", border: "1px solid rgba(148,163,184,0.07)", borderRadius: 4, padding: "20px 24px", marginBottom: 20 }}>
        <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 7, color: "#334155", letterSpacing: "0.3em", fontWeight: 800, marginBottom: 14 }}>
          5-GAME RECOVERY TREND
        </div>
        <RecoveryTrendExpanded name={player.name} />
      </div>

      {/* Today's match */}
      {match && opponent && (
        <div style={{ background: "rgba(15,23,42,0.4)", border: "1px solid rgba(148,163,184,0.07)", borderRadius: 4, padding: "20px 24px", marginBottom: 20 }}>
          <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 7, color: "#334155", letterSpacing: "0.3em", fontWeight: 800, marginBottom: 14 }}>
            TODAY'S MATCH
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            {/* Home/Away badge */}
            <span style={{
              fontFamily: "var(--font-mono), monospace", fontSize: 8, fontWeight: 800, letterSpacing: "0.18em",
              color: isHome ? t.hex : "#64748b",
              padding: "2px 8px", borderRadius: 2,
              border: `1px solid ${isHome ? t.hex + "44" : "rgba(100,116,139,0.2)"}`,
              background: isHome ? `${t.hex}10` : "transparent",
            }}>{isHome ? "HOME" : "AWAY"}</span>

            {/* Opponent */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 120 }}>
              <TeamLogo teamAbbr={opponent.abbr} league={match.league} size={40} accentColor="#64748b" />
              <div>
                <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 13, fontWeight: 800, color: "#e2e8f0" }}>
                  {isHome ? "vs" : "@"} {opponent.abbr}
                </div>
                <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, color: "#475569", letterSpacing: "0.1em" }}>{opponent.name}</div>
              </div>
            </div>

            {/* Score */}
            {match.score && (
              <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 16, fontWeight: 800, color: "#94a3b8", letterSpacing: "0.08em" }}>
                {isHome ? `${match.score.home} – ${match.score.away}` : `${match.score.away} – ${match.score.home}`}
              </div>
            )}

            {/* Status */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {isLive && <LiveDot size={5} />}
              <span style={{
                fontFamily: "var(--font-mono), monospace", fontSize: 10, fontWeight: 800, letterSpacing: "0.18em",
                color: isLive ? "#ef4444" : isFinal ? "#34d399" : "#475569",
              }}>{isFinal ? "FINAL" : isLive ? "LIVE" : match.time}</span>
            </div>

            {/* WPA */}
            <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 13, fontWeight: 800, color: wpaColor, minWidth: 60, textAlign: "right" }}>
              {match.wpa >= 0 ? "+" : ""}{(match.wpa * 100).toFixed(1)}%
              <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 7, color: "#334155", letterSpacing: "0.22em", marginTop: 2 }}>WPA</div>
            </div>
          </div>

          {/* Playoff series info */}
          {match.playoff && (
            <div style={{
              marginTop: 14, padding: "10px 14px",
              background: `${t.hex}08`, border: `1px solid ${t.hex}22`, borderRadius: 3,
            }}>
              <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 8, fontWeight: 800, color: t.hex, letterSpacing: "0.22em", marginBottom: 4 }}>
                {match.playoff.round}
              </div>
              <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 10, color: "#64748b", letterSpacing: "0.14em" }}>
                {match.playoff.summary}
              </div>
              <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
                <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, color: "#94a3b8" }}>
                  HOME <span style={{ fontWeight: 800, color: "#e2e8f0" }}>{match.playoff.seriesWins.home}</span>
                </div>
                <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, color: "#94a3b8" }}>
                  AWAY <span style={{ fontWeight: 800, color: "#e2e8f0" }}>{match.playoff.seriesWins.away}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recovery Assessment */}
      <div style={{
        background: "rgba(15,23,42,0.4)",
        border: "1px solid rgba(148,163,184,0.07)",
        borderLeft: `4px solid ${flagColor}`,
        borderRadius: "0 4px 4px 0",
        padding: "20px 24px",
        background: `linear-gradient(90deg, ${flagColor}06 0%, rgba(2,6,23,0) 65%)`,
      }}>
        <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 7, color: "#334155", letterSpacing: "0.3em", fontWeight: 800, marginBottom: 12 }}>
          RECOVERY ASSESSMENT
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: flagColor, boxShadow: `0 0 12px ${flagColor}`, display: "inline-block", flexShrink: 0 }} />
          <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: isMobile ? 11 : 14, fontWeight: 800, color: flagColor, letterSpacing: "0.16em", lineHeight: 1.4 }}>
            {FLAG_ASSESSMENT[player.flag]}
          </span>
        </div>
      </div>

    </div>
  )
}
