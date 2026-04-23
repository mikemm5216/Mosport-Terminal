'use client'

import { useState } from 'react'
import { useWindowWidth } from '../lib/useWindowWidth'
import {
  NBA_BRACKET_2026, NHL_BRACKET_2026,
  type BracketSeries, type BracketTeam, type League, type PlayoffConference,
} from '../data/mockData'
import { leagueTheme } from './ui'
import TeamLogo from './TeamLogo'

// ── Prediction engine ──────────────────────────────────────────

function binomialCoeff(n: number, k: number): number {
  if (k === 0 || k === n) return 1
  let r = 1
  for (let i = 0; i < k; i++) r *= (n - i) / (i + 1)
  return r
}

function seriesWinProb(pGame: number, winsHome: number, winsAway: number): number {
  if (winsHome === 4) return 1
  if (winsAway === 4) return 0
  const needsH = 4 - winsHome
  const needsA = 4 - winsAway
  let prob = 0
  for (let a = 0; a < needsA; a++) {
    prob += binomialCoeff(needsH - 1 + a, a) * Math.pow(pGame, needsH) * Math.pow(1 - pGame, a)
  }
  return Math.max(0.02, Math.min(0.98, prob))
}

function gameWinProb(home: BracketTeam, away: BracketTeam): number {
  const diff = home.edge - away.edge
  const recoveryBoost = (home.recovery - away.recovery) * 0.1
  return Math.max(0.25, Math.min(0.75, 0.52 + diff * 0.55 + recoveryBoost))
}

function predictSeries(s: BracketSeries): { winner: string; prob: number } {
  if (s.status === 'completed' && s.winner) return { winner: s.winner, prob: 1 }
  const pGame = gameWinProb(s.home, s.away)
  const pHomeSeries = seriesWinProb(pGame, s.winsHome, s.winsAway)
  const homeWins = pHomeSeries >= 0.5
  return {
    winner: homeWins ? s.home.abbr : s.away.abbr,
    prob: homeWins ? pHomeSeries : 1 - pHomeSeries,
  }
}

function simulateBracket(firstRound: BracketSeries[], league: League): BracketSeries[] {
  const all: BracketSeries[] = [...firstRound]
  const conferences: PlayoffConference[] = ['East', 'West']

  for (let round = 1; round <= 3; round++) {
    const currentRound = all.filter(s => s.round === round)

    for (const conf of conferences) {
      const confSeries = currentRound.filter(s => s.conference === conf)
      if (confSeries.length === 0) continue

      const predictions = confSeries.map(s => {
        const { winner, prob } = predictSeries(s)
        const winnerTeam = winner === s.home.abbr ? s.home : s.away
        return { series: s, winner: winnerTeam, prob }
      })

      const nextRound = round + 1
      const nextConf: PlayoffConference = nextRound === 4 ? 'Finals' : conf

      for (let i = 0; i < predictions.length; i += 2) {
        if (!predictions[i + 1]) break
        const teamA = predictions[i].winner
        const teamB = predictions[i + 1].winner
        const [homeTeam, awayTeam] = teamA.edge >= teamB.edge ? [teamA, teamB] : [teamB, teamA]

        all.push({
          id: `${league}-r${nextRound}-${conf}-${i / 2}`,
          league,
          round: nextRound as 1 | 2 | 3 | 4,
          conference: nextConf,
          home: homeTeam,
          away: awayTeam,
          winsHome: 0,
          winsAway: 0,
          status: 'pending',
        })
      }
    }

    if (round === 3) {
      const eastWinner = (() => {
        const eastFinals = all.filter(s => s.round === 3 && s.conference === 'East')
        if (!eastFinals[0]) return null
        const { winner } = predictSeries(eastFinals[0])
        return winner === eastFinals[0].home.abbr ? eastFinals[0].home : eastFinals[0].away
      })()
      const westWinner = (() => {
        const westFinals = all.filter(s => s.round === 3 && s.conference === 'West')
        if (!westFinals[0]) return null
        const { winner } = predictSeries(westFinals[0])
        return winner === westFinals[0].home.abbr ? westFinals[0].home : westFinals[0].away
      })()

      if (eastWinner && westWinner) {
        const [home, away] = eastWinner.edge >= westWinner.edge
          ? [eastWinner, westWinner] : [westWinner, eastWinner]
        all.push({
          id: `${league}-finals`,
          league,
          round: 4,
          conference: 'Finals',
          home,
          away,
          winsHome: 0,
          winsAway: 0,
          status: 'pending',
        })
      }
    }
  }

  return all
}

// ── Win pip display ────────────────────────────────────────────

function WinPips({ wins, needed = 4, color }: { wins: number; needed?: number; color: string }) {
  return (
    <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
      {Array.from({ length: needed }).map((_, i) => (
        <div key={i} style={{
          width: 8, height: 8, borderRadius: "50%",
          background: i < wins ? "#34d399" : "#1e293b",
          border: `1px solid ${i < wins ? "#34d399" : "#334155"}`,
          boxShadow: i < wins ? "0 0 5px #34d39966" : "none",
        }} />
      ))}
    </div>
  )
}

// ── Series card ────────────────────────────────────────────────

function SeriesCard({ series, league }: { series: BracketSeries; league: League }) {
  const t = leagueTheme(league)
  const isPending = series.status === 'pending'
  const { winner, prob } = predictSeries(series)
  const homeWins = winner === series.home.abbr
  const isUpset = (homeWins && series.home.seed > series.away.seed) ||
                  (!homeWins && series.away.seed > series.home.seed)

  const winnerTeam = homeWins ? series.home : series.away
  const loserTeam = homeWins ? series.away : series.home

  function TeamRow({ team, isWinner, isTbd }: { team: BracketTeam; isWinner: boolean; isTbd?: boolean }) {
    const wins = team.abbr === series.home.abbr ? series.winsHome : series.winsAway
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "6px 10px",
        background: isTbd ? "transparent" : isWinner ? `${t.hex}08` : "transparent",
        borderRadius: 3,
        border: isWinner && !isTbd ? `1px solid ${t.hex}30` : "1px solid transparent",
        boxShadow: isWinner && !isTbd ? `0 0 12px ${t.hex}15` : "none",
      }}>
        {isTbd ? (
          <div style={{
            width: 20, height: 20, borderRadius: 3,
            background: "rgba(148,163,184,0.05)",
            border: "1px solid rgba(148,163,184,0.1)",
            display: "grid", placeItems: "center",
          }}>
            <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 6, color: "#1e293b" }}>?</span>
          </div>
        ) : (
          <TeamLogo teamAbbr={team.abbr} league={league} size={20} accentColor={isWinner ? t.hex : "#64748b"} />
        )}
        <span style={{
          fontFamily: "var(--font-mono), monospace", fontSize: 9, fontWeight: 800,
          letterSpacing: "0.14em",
          color: isTbd ? "#1e293b" : isWinner ? "#e2e8f0" : "#475569",
          flex: 1,
        }}>
          {isTbd ? "TBD" : team.abbr}
        </span>
        {!isTbd && (
          <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 7, color: "#334155" }}>
            #{team.seed}
          </span>
        )}
        {!isTbd && !isPending && (
          <WinPips wins={wins} color={t.hex} />
        )}
      </div>
    )
  }

  return (
    <div style={{
      background: "rgba(15,23,42,0.5)",
      border: `1px solid ${isPending ? "rgba(148,163,184,0.05)" : "rgba(148,163,184,0.1)"}`,
      borderTop: `2px solid ${isPending ? "#1e293b" : t.hex}`,
      borderRadius: "0 0 4px 4px",
      padding: "10px",
      opacity: isPending ? 0.65 : 1,
      minWidth: 0,
    }}>
      {isPending && (
        <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 6, color: "#334155", letterSpacing: "0.3em", marginBottom: 6 }}>
          PROJECTED MATCHUP
        </div>
      )}

      <TeamRow team={series.home} isWinner={!isPending && homeWins} isTbd={false} />
      <div style={{ height: 2, background: "rgba(148,163,184,0.04)", margin: "2px 0" }} />
      <TeamRow team={series.away} isWinner={!isPending && !homeWins} isTbd={false} />

      {/* Prediction footer */}
      {!isPending && (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(148,163,184,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 7, color: "#334155", letterSpacing: "0.18em" }}>PRED:</span>
            <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 8, fontWeight: 800, color: t.hex, letterSpacing: "0.14em" }}>
              {winnerTeam.abbr}
            </span>
            <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 7, color: loserTeam.abbr === "" ? "#334155" : "#334155" }}>
              defeats {loserTeam.abbr}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {isUpset && (
              <span style={{
                fontFamily: "var(--font-mono), monospace", fontSize: 6, fontWeight: 800,
                color: "#f97316", letterSpacing: "0.16em",
                padding: "1px 5px", borderRadius: 2,
                background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.3)",
              }}>UPSET</span>
            )}
            <span style={{
              fontFamily: "var(--font-mono), monospace", fontSize: 7, fontWeight: 800,
              color: prob >= 0.75 ? "#34d399" : prob >= 0.6 ? "#fbbf24" : "#94a3b8",
              padding: "1px 6px", borderRadius: 2,
              background: "rgba(15,23,42,0.6)", border: "1px solid rgba(148,163,184,0.1)",
            }}>
              {Math.round(prob * 100)}%
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Round column ───────────────────────────────────────────────

const ROUND_LABELS: Record<number, string> = {
  1: "FIRST ROUND",
  2: "SEMIFINALS",
  3: "CONF FINALS",
  4: "FINALS",
}

function RoundColumn({
  round, seriesList, league, isMobile,
}: {
  round: number; seriesList: BracketSeries[]; league: League; isMobile: boolean
}) {
  const t = leagueTheme(league)
  return (
    <div style={{ minWidth: isMobile ? "100%" : 180, flex: 1 }}>
      <div style={{
        fontFamily: "var(--font-mono), monospace", fontSize: 7, fontWeight: 800,
        letterSpacing: "0.3em", color: t.hex, marginBottom: 10,
        paddingBottom: 6, borderBottom: `1px solid ${t.hex}22`,
      }}>
        {ROUND_LABELS[round] ?? `ROUND ${round}`}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {seriesList.length === 0 ? (
          <div style={{
            background: "rgba(15,23,42,0.3)", border: "1px solid rgba(148,163,184,0.05)",
            borderTop: `2px solid #1e293b`, borderRadius: "0 0 4px 4px",
            padding: 14, opacity: 0.4,
          }}>
            <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 8, color: "#1e293b", letterSpacing: "0.2em" }}>
              TBD
            </div>
          </div>
        ) : (
          seriesList.map(s => <SeriesCard key={s.id} series={s} league={league} />)
        )}
      </div>
    </div>
  )
}

// ── Champion hero ──────────────────────────────────────────────

function ChampionHero({ team, league, prob }: { team: BracketTeam; league: League; prob: number }) {
  const t = leagueTheme(league)
  return (
    <div style={{
      background: "linear-gradient(135deg, rgba(251,191,36,0.06) 0%, rgba(15,23,42,0.4) 60%)",
      border: "1px solid rgba(251,191,36,0.25)",
      borderTop: "3px solid #fbbf24",
      borderRadius: "0 0 8px 8px",
      padding: "24px 28px",
      marginBottom: 28,
      display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap",
    }}>
      <div style={{
        width: 80, height: 80, flexShrink: 0,
        filter: "drop-shadow(0 0 18px rgba(251,191,36,0.4))",
      }}>
        <TeamLogo teamAbbr={team.abbr} league={league} size={80} accentColor="#fbbf24" />
      </div>
      <div>
        <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 8, fontWeight: 800, letterSpacing: "0.36em", color: "#fbbf24", marginBottom: 6 }}>
          PREDICTED CHAMPION
        </div>
        <div style={{ fontFamily: "var(--font-inter), Inter, sans-serif", fontWeight: 900, fontSize: 40, color: "#f8fafc", letterSpacing: "-0.03em", lineHeight: 1, marginBottom: 4 }}>
          {team.abbr}
        </div>
        <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 10, color: "#64748b", letterSpacing: "0.12em" }}>
          {team.name}
        </div>
      </div>
      <div style={{ marginLeft: "auto" }}>
        <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 7, color: "#334155", letterSpacing: "0.28em", marginBottom: 6 }}>
          CHAMPIONSHIP CONFIDENCE
        </div>
        <div style={{
          fontFamily: "var(--font-mono), monospace", fontSize: 36, fontWeight: 900,
          color: "#fbbf24", letterSpacing: "-0.02em", lineHeight: 1,
          textShadow: "0 0 24px rgba(251,191,36,0.4)",
        }}>
          {Math.round(prob * 100)}<span style={{ fontSize: 18, color: "#64748b" }}>%</span>
        </div>
        <div style={{ marginTop: 8, display: "flex", gap: 12 }}>
          <div>
            <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 7, color: "#334155", letterSpacing: "0.22em", marginBottom: 3 }}>EDGE</div>
            <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 11, fontWeight: 800, color: t.hex }}>{Math.round(team.edge * 100)}%</div>
          </div>
          <div>
            <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 7, color: "#334155", letterSpacing: "0.22em", marginBottom: 3 }}>RECOVERY</div>
            <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 11, fontWeight: 800, color: "#34d399" }}>{Math.round(team.recovery * 100)}%</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────

export default function PlayoffBracketPage({ embedded = false }: { embedded?: boolean } = {}) {
  const width = useWindowWidth()
  const isMobile = width < 768
  const [selectedLeague, setSelectedLeague] = useState<"NBA" | "NHL">("NBA")

  const rawBracket = selectedLeague === "NBA" ? NBA_BRACKET_2026 : NHL_BRACKET_2026
  const league: League = selectedLeague
  const t = leagueTheme(league)

  const allSeries = simulateBracket(rawBracket, league)

  // Predict champion
  const finalsSeries = allSeries.find(s => s.round === 4)
  const championTeam = finalsSeries
    ? (() => {
        const { winner } = predictSeries(finalsSeries)
        return winner === finalsSeries.home.abbr ? finalsSeries.home : finalsSeries.away
      })()
    : null

  // Estimate champion's path probability (product of series win probs)
  // Simplified: use the finals confidence * average of all predicted series with champion
  const championProb = (() => {
    if (!championTeam || !finalsSeries) return 0
    const champAbbr = championTeam.abbr
    const champSeries = allSeries.filter(s =>
      s.status !== 'pending' || s.home.abbr === champAbbr || s.away.abbr === champAbbr
    )
    let p = 1
    for (const s of champSeries) {
      const { winner, prob } = predictSeries(s)
      if (winner === champAbbr) p *= prob
    }
    return Math.max(0.05, Math.min(0.92, p))
  })()

  // Organize by round + conference
  function getSeriesForRound(round: number, conf?: PlayoffConference) {
    return allSeries.filter(s => s.round === round && (conf ? s.conference === conf : true))
  }

  const CONFERENCES: PlayoffConference[] = ['West', 'East']

  return (
    <div style={embedded ? { width: "100%", marginTop: 40 } : { maxWidth: 1400, margin: "0 auto", padding: isMobile ? "28px 16px 60px" : "44px 28px 80px" }}>

      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, fontWeight: 800, letterSpacing: "0.32em", color: "#475569" }}>PLAYOFF INTELLIGENCE</span>
          <span style={{ color: "#1e293b", fontFamily: "var(--font-mono), monospace", fontSize: 9 }}>//</span>
          <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, fontWeight: 700, letterSpacing: "0.28em", color: "#334155" }}>BRACKET SIMULATION · 2026</span>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <h1 style={{ fontFamily: "var(--font-inter), Inter, sans-serif", fontWeight: 900, fontSize: isMobile ? 28 : 40, color: "#f8fafc", letterSpacing: "-0.03em", lineHeight: 1.08, margin: 0 }}>
            PLAYOFF BRACKET<br />
            <span style={{ color: t.hex, textShadow: `0 0 40px ${t.hex}55` }}>PREDICTION</span>
          </h1>
          {/* League selector */}
          <div style={{ display: "flex", gap: 4 }}>
            {(["NBA", "NHL"] as const).map(lg => {
              const lt = leagueTheme(lg)
              const isActive = selectedLeague === lg
              return (
                <button
                  key={lg}
                  onClick={() => setSelectedLeague(lg)}
                  style={{
                    padding: "8px 20px",
                    fontFamily: "var(--font-mono), monospace", fontSize: 11, fontWeight: 800, letterSpacing: "0.22em",
                    color: isActive ? lt.hex : "#334155",
                    background: isActive ? `${lt.hex}10` : "transparent",
                    border: `1px solid ${isActive ? lt.hex + "50" : "rgba(148,163,184,0.1)"}`,
                    borderRadius: 3, cursor: "pointer",
                    boxShadow: isActive ? `0 0 16px ${lt.hex}20` : "none",
                  }}
                >
                  {lg}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Champion Hero */}
      {championTeam && (
        <ChampionHero team={championTeam} league={league} prob={championProb} />
      )}

      {/* Bracket — by conference sections, rounds as columns */}
      {CONFERENCES.map(conf => {
        const r1 = getSeriesForRound(1, conf)
        const r2 = getSeriesForRound(2, conf)
        const r3 = getSeriesForRound(3, conf)

        return (
          <div key={conf} style={{ marginBottom: 36 }}>
            {/* Conference header */}
            <div style={{
              display: "flex", alignItems: "center", gap: 12, marginBottom: 16,
              paddingBottom: 10, borderBottom: `1px solid ${t.hex}22`,
            }}>
              <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 14, fontWeight: 900, color: t.hex, letterSpacing: "0.22em" }}>
                {conf.toUpperCase()} CONFERENCE
              </span>
              <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 8, color: "#334155", letterSpacing: "0.18em" }}>
                {r1.length} SERIES
              </span>
            </div>

            <div style={{
              display: "flex",
              flexDirection: isMobile ? "column" : "row",
              gap: 12,
              alignItems: "flex-start",
            }}>
              <RoundColumn round={1} seriesList={r1} league={league} isMobile={isMobile} />
              <RoundColumn round={2} seriesList={r2} league={league} isMobile={isMobile} />
              <RoundColumn round={3} seriesList={r3} league={league} isMobile={isMobile} />
            </div>
          </div>
        )
      })}

      {/* Finals */}
      <div style={{ marginBottom: 20 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 12, marginBottom: 16,
          paddingBottom: 10, borderBottom: "1px solid rgba(251,191,36,0.2)",
        }}>
          <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 14, fontWeight: 900, color: "#fbbf24", letterSpacing: "0.22em" }}>
            {selectedLeague === "NBA" ? "NBA FINALS" : "STANLEY CUP FINAL"}
          </span>
        </div>
        <div style={{ maxWidth: isMobile ? "100%" : 280 }}>
          {finalsSeries ? (
            <SeriesCard series={finalsSeries} league={league} />
          ) : (
            <div style={{
              background: "rgba(15,23,42,0.3)",
              border: "1px solid rgba(251,191,36,0.1)",
              borderTop: "2px solid #fbbf24",
              borderRadius: "0 0 4px 4px",
              padding: 20, opacity: 0.5,
            }}>
              <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, color: "#475569", letterSpacing: "0.2em" }}>
                TBD — BRACKET SIMULATION REQUIRED
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Model note */}
      <div style={{
        marginTop: 32, padding: "12px 16px",
        background: "rgba(15,23,42,0.3)", border: "1px solid rgba(148,163,184,0.05)", borderRadius: 3,
      }}>
        <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 7, color: "#1e293b", letterSpacing: "0.28em" }}>
          MODEL NOTE: Predictions generated via negative binomial simulation using physio edge scores + recovery indices.
          Future rounds simulated from current in-progress series. Upset threshold: lower seed winning 50%+ probability.
        </div>
      </div>

    </div>
  )
}
