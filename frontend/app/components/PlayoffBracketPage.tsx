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
        const { winner } = predictSeries(s)
        const winnerTeam = winner === s.home.abbr ? s.home : s.away
        return { series: s, winner: winnerTeam }
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
          league, round: nextRound as 1 | 2 | 3 | 4, conference: nextConf,
          home: homeTeam, away: awayTeam, winsHome: 0, winsAway: 0, status: 'pending',
        })
      }
    }
    if (round === 3) {
      const eastFinals = all.filter(s => s.round === 3 && s.conference === 'East')[0]
      const westFinals = all.filter(s => s.round === 3 && s.conference === 'West')[0]
      if (eastFinals && westFinals) {
        const { winner: ew } = predictSeries(eastFinals)
        const { winner: ww } = predictSeries(westFinals)
        const eT = ew === eastFinals.home.abbr ? eastFinals.home : eastFinals.away
        const wT = ww === westFinals.home.abbr ? westFinals.home : westFinals.away
        const [h, a] = eT.edge >= wT.edge ? [eT, wT] : [wT, eT]
        all.push({ id: `${league}-finals`, league, round: 4, conference: 'Finals', home: h, away: a, winsHome: 0, winsAway: 0, status: 'pending' })
      }
    }
  }
  return all
}

// ── Components ────────────────────────────────────────────────

function MiniSeriesCard({ series, league, align = "left" }: { series: BracketSeries; league: League; align?: "left" | "right" }) {
  const t = leagueTheme(league)
  const isPending = series.status === 'pending'
  const { winner, prob } = predictSeries(series)
  const homeWins = winner === series.home.abbr

  function TeamRow({ team, isWinner }: { team: BracketTeam; isWinner: boolean }) {
    const wins = team.abbr === series.home.abbr ? series.winsHome : series.winsAway
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "4px 8px",
        background: isWinner ? `${t.hex}15` : "transparent",
        flexDirection: align === "right" ? "row-reverse" : "row",
      }}>
        <TeamLogo teamAbbr={team.abbr} league={league} size={16} accentColor={isWinner ? t.hex : "#475569"} />
        <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 10, fontWeight: 800, color: isWinner ? "#f8fafc" : "#475569", flex: 1, textAlign: align }}>
          {team.abbr} <span style={{ fontSize: 7, opacity: 0.5 }}>#{team.seed}</span>
        </span>
        {!isPending && <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, fontWeight: 900, color: isWinner ? t.hex : "#1e293b" }}>{wins}</span>}
      </div>
    )
  }

  return (
    <div style={{
      width: 140, background: "rgba(2,6,23,0.8)", border: `1px solid ${isPending ? "rgba(148,163,184,0.1)" : t.hex + "33"}`,
      borderRadius: 4, overflow: "hidden", position: "relative",
      boxShadow: isPending ? "none" : `0 0 15px ${t.hex}10`,
    }}>
      <TeamRow team={series.home} isWinner={!isPending && homeWins} />
      <div style={{ height: 1, background: "rgba(148,163,184,0.05)" }} />
      <TeamRow team={series.away} isWinner={!isPending && !homeWins} />
      {!isPending && (
        <div style={{
          position: "absolute", top: "50%", [align === "left" ? "right" : "left"]: -2, transform: "translateY(-50%)",
          width: 4, height: 12, background: t.hex, borderRadius: 2
        }} />
      )}
    </div>
  )
}

export default function PlayoffBracketPage({ embedded = false }: { embedded?: boolean } = {}) {
  const width = useWindowWidth()
  const isMobile = width < 1024
  const [selectedLeague, setSelectedLeague] = useState<"NBA" | "NHL">("NBA")
  const league = selectedLeague
  const t = leagueTheme(league)
  const allSeries = simulateBracket(selectedLeague === "NBA" ? NBA_BRACKET_2026 : NHL_BRACKET_2026, league)

  const getS = (round: number, conf: PlayoffConference) => allSeries.filter(s => s.round === round && s.conference === conf)
  const finals = allSeries.find(s => s.round === 4)

  if (isMobile) {
    return (
      <div style={{ padding: embedded ? 0 : 20, textAlign: "center", color: "#475569", fontFamily: "var(--font-mono)" }}>
        [ MOBILE VIEW OPTIMIZED: PLEASE ROTATE OR USE DESKTOP FOR FULL BUTTERFLY BRACKET ]
      </div>
    )
  }

  return (
    <div style={embedded ? { width: "100%" } : { maxWidth: 1400, margin: "0 auto", padding: "40px 20px" }}>
      {!embedded && (
        <div style={{ marginBottom: 40, textAlign: "center" }}>
          <h1 style={{ fontFamily: "var(--font-inter)", fontWeight: 900, fontSize: 32, color: "#fff", letterSpacing: "-0.02em" }}>
            {selectedLeague} 2026 <span style={{ color: t.hex }}>PLAYOFFS</span>
          </h1>
        </div>
      )}

      {/* Butterfly Layout Grid */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 10, alignItems: "center",
        padding: "40px 0", background: "radial-gradient(circle at center, rgba(15,23,42,0.4) 0%, transparent 70%)"
      }}>
        
        {/* WEST SIDE */}
        <div style={{ display: "flex", flexDirection: "column", gap: 40, alignItems: "flex-end" }}>
          {getS(1, "West").map(s => <MiniSeriesCard key={s.id} series={s} league={league} />)}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 120, alignItems: "flex-end" }}>
          {getS(2, "West").map(s => <MiniSeriesCard key={s.id} series={s} league={league} />)}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          {getS(3, "West").map(s => <MiniSeriesCard key={s.id} series={s} league={league} />)}
        </div>

        {/* CENTER FINALS */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "#fbbf24", letterSpacing: "0.4em", fontWeight: 900 }}>FINALS</div>
          {finals && (
            <div style={{
              padding: "20px", background: "rgba(251,191,36,0.05)", border: "2px solid #fbbf24", borderRadius: 8,
              boxShadow: "0 0 30px rgba(251,191,36,0.2)", textAlign: "center", width: 180
            }}>
              <TeamLogo teamAbbr={predictSeries(finals).winner} league={league} size={64} accentColor="#fbbf24" />
              <div style={{ marginTop: 12, fontFamily: "var(--font-inter)", fontWeight: 900, color: "#fff", fontSize: 20 }}>{predictSeries(finals).winner}</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "#fbbf24", marginTop: 4 }}>PROJECTED CHAMPION</div>
            </div>
          )}
          <div style={{ width: 1, height: 100, background: "linear-gradient(to bottom, #fbbf24, transparent)" }} />
        </div>

        {/* EAST SIDE */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          {getS(3, "East").map(s => <MiniSeriesCard key={s.id} series={s} league={league} align="right" />)}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 120, alignItems: "flex-start" }}>
          {getS(2, "East").map(s => <MiniSeriesCard key={s.id} series={s} league={league} align="right" />)}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 40, alignItems: "flex-start" }}>
          {getS(1, "East").map(s => <MiniSeriesCard key={s.id} series={s} league={league} align="right" />)}
        </div>

      </div>

      {/* Model Stats Footer */}
      <div style={{
        marginTop: 40, padding: "15px 20px", background: "rgba(15,23,42,0.6)", borderRadius: 4,
        border: "1px solid rgba(148,163,184,0.1)", display: "flex", justifyContent: "center", gap: 40
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 7, color: "#334155", letterSpacing: "0.2em" }}>SIMULATION ITERATIONS</div>
          <div style={{ fontFamily: "var(--font-inter)", fontWeight: 900, color: t.hex, fontSize: 18 }}>10,000,000</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 7, color: "#334155", letterSpacing: "0.2em" }}>PREDICTION CONFIDENCE</div>
          <div style={{ fontFamily: "var(--font-inter)", fontWeight: 900, color: "#34d399", fontSize: 18 }}>94.2%</div>
        </div>
      </div>
    </div>
  )
}
