'use client'

import { useState, useMemo, useEffect } from 'react'
import { useWindowWidth } from '../lib/useWindowWidth'
import {
  NBA_BRACKET_2026, NHL_BRACKET_2026,
  type BracketSeries, type BracketTeam, type League, type PlayoffConference,
} from '../data/mockData'
import { leagueTheme } from './ui'
import TeamLogo from './TeamLogo'

// ── Prediction engine ──────────────────────────────────────────

// ── Real Monte Carlo Prediction Engine ──────────────────────────
// We run millions of iterations to find the empirical win probability

function simulateSeries(home: BracketTeam, away: BracketTeam, winsHome: number, winsAway: number): { winner: string } {
  let h = winsHome
  let a = winsAway
  const pGame = gameWinProb(home, away)
  
  while (h < 4 && a < 4) {
    if (Math.random() < pGame) h++
    else a++
  }
  return { winner: h === 4 ? home.abbr : away.abbr }
}

function gameWinProb(home: BracketTeam, away: BracketTeam): number {
  const diff = home.edge - away.edge
  const recoveryBoost = (home.recovery - away.recovery) * 0.1
  return Math.max(0.25, Math.min(0.75, 0.52 + diff * 0.55 + recoveryBoost))
}

/**
 * Runs a full bracket simulation 
 * Returns the champion abbreviation
 */
function runOneBracket(firstRound: BracketSeries[], league: League): string {
  const winnersR1: Record<string, BracketTeam> = {}
  for (const s of firstRound) {
    const { winner } = simulateSeries(s.home, s.away, s.winsHome, s.winsAway)
    winnersR1[s.id] = winner === s.home.abbr ? s.home : s.away
  }

  const conferences: PlayoffConference[] = ['West', 'East']
  
  // Round 2 (Semis)
  const winnersR2: Record<string, BracketTeam> = {}
  for (const conf of conferences) {
    const r1S = firstRound.filter(s => s.round === 1 && s.conference === conf)
    // Map R1 winners to R2 slots
    for (let i = 0; i < r1S.length; i += 2) {
      const tA = winnersR1[r1S[i].id]
      const tB = winnersR1[r1S[i + 1].id]
      if (!tA || !tB) continue
      const [h, a] = tA.edge >= tB.edge ? [tA, tB] : [tB, tA]
      const { winner } = simulateSeries(h, a, 0, 0)
      winnersR2[`${conf}-${i/2}`] = winner === h.abbr ? h : a
    }
  }

  // Round 3 (Conf Finals)
  const winnersR3: Record<string, BracketTeam> = {}
  for (const conf of conferences) {
    const tC = winnersR2[`${conf}-0`]
    const tD = winnersR2[`${conf}-1`]
    if (!tC || !tD) continue
    const [h, a] = tC.edge >= tD.edge ? [tC, tD] : [tD, tC]
    const { winner } = simulateSeries(h, a, 0, 0)
    winnersR3[conf] = winner === h.abbr ? h : a
  }

  // Round 4 (Finals)
  const eastC = winnersR3['East']
  const westC = winnersR3['West']
  if (!eastC || !westC) return eastC?.abbr || westC?.abbr || "UNK"
  
  const [h, a] = eastC.edge >= westC.edge ? [eastC, westC] : [westC, eastC]
  const { winner } = simulateSeries(h, a, 0, 0)
  return winner
}

// For UI display of a single series prediction (uses 10k sub-simulations for speed)
function predictSeries(s: BracketSeries, iterations = 5000): { winner: string; prob: number } {
  if (s.status === 'completed' && s.winner) return { winner: s.winner, prob: 1 }
  let homeWins = 0
  for (let i = 0; i < iterations; i++) {
    if (simulateSeries(s.home, s.away, s.winsHome, s.winsAway).winner === s.home.abbr) homeWins++
  }
  const p = homeWins / iterations
  return {
    winner: p >= 0.5 ? s.home.abbr : s.away.abbr,
    prob: p >= 0.5 ? p : 1 - p
  }
}

function simulateBracket(firstRound: BracketSeries[], league: League): BracketSeries[] {
  const all: BracketSeries[] = [...firstRound]
  const conferences: PlayoffConference[] = ['East', 'West']

  // Round 2 Generation
  for (const conf of conferences) {
    const r1S = firstRound.filter(s => s.round === 1 && s.conference === conf)
    for (let i = 0; i < r1S.length; i += 2) {
      const { winner: w1 } = predictSeries(r1S[i], 2000)
      const { winner: w2 } = predictSeries(r1S[i+1], 2000)
      const t1 = w1 === r1S[i].home.abbr ? r1S[i].home : r1S[i].away
      const t2 = w2 === r1S[i+1].home.abbr ? r1S[i+1].home : r1S[i+1].away
      const [h, a] = t1.edge >= t2.edge ? [t1, t2] : [t2, t1]
      all.push({ id: `${league}-r2-${conf}-${i/2}`, league, round: 2, conference: conf, home: h, away: a, winsHome: 0, winsAway: 0, status: 'pending' })
    }
  }

  // Round 3 Generation
  for (const conf of conferences) {
    const r2S = all.filter(s => s.round === 2 && s.conference === conf)
    const { winner: w1 } = predictSeries(r2S[0], 2000)
    const { winner: w2 } = predictSeries(r2S[1], 2000)
    const t1 = w1 === r2S[0].home.abbr ? r2S[0].home : r2S[0].away
    const t2 = w2 === r2S[1].home.abbr ? r2S[1].home : r2S[1].away
    const [h, a] = t1.edge >= t2.edge ? [t1, t2] : [t2, t1]
    all.push({ id: `${league}-r3-${conf}`, league, round: 3, conference: conf, home: h, away: a, winsHome: 0, winsAway: 0, status: 'pending' })
  }

  // Round 4 (Finals)
  const eF = all.find(s => s.round === 3 && s.conference === 'East')
  const wF = all.find(s => s.round === 3 && s.conference === 'West')
  if (eF && wF) {
    const { winner: we } = predictSeries(eF, 2000)
    const { winner: ww } = predictSeries(wF, 2000)
    const tE = we === eF.home.abbr ? eF.home : eF.away
    const tW = ww === wF.home.abbr ? wF.home : wF.away
    const [h, a] = tE.edge >= tW.edge ? [tE, tW] : [tW, tE]
    all.push({ id: `${league}-finals`, league, round: 4, conference: 'Finals', home: h, away: a, winsHome: 0, winsAway: 0, status: 'pending' })
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

  // ── Monte Carlo State ────────────────────────────────────────
  const [simProgress, setSimProgress] = useState(0)
  const totalIterations = 10000000
  const [mcConfidence, setMcConfidence] = useState(0)
  const [isSimulating, setIsSimulating] = useState(false)

  const initialSeries = selectedLeague === "NBA" ? NBA_BRACKET_2026 : NHL_BRACKET_2026
  const allSeries = useMemo(() => simulateBracket(initialSeries, league), [initialSeries, league])
  const finals = allSeries.find(s => s.round === 4)
  const championTeam = finals ? (predictSeries(finals).winner === finals.home.abbr ? finals.home : finals.away) : null

  useEffect(() => {
    if (!championTeam) return
    
    setIsSimulating(true)
    setSimProgress(0)
    let current = 0
    let champWins = 0
    const chunkSize = 25000 // optimized chunk size
    const championAbbr = championTeam.abbr

    const runChunk = () => {
      const end = Math.min(current + chunkSize, totalIterations)
      for (let i = current; i < end; i++) {
        if (runOneBracket(initialSeries, league) === championAbbr) champWins++
      }
      current = end
      setSimProgress(current)

      if (current < totalIterations) {
        requestAnimationFrame(runChunk)
      } else {
        setMcConfidence(champWins / totalIterations)
        setIsSimulating(false)
      }
    }

    runChunk()
  }, [league, championTeam, initialSeries])

  const getS = (round: number, conf: PlayoffConference) => allSeries.filter(s => s.round === round && s.conference === conf)

  if (isMobile) {
    return (
      <div style={{ padding: embedded ? 0 : 20 }}>
        {!embedded && (
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontFamily: "var(--font-inter)", fontWeight: 900, fontSize: 24, color: "#fff" }}>
              {selectedLeague} 2026 <span style={{ color: t.hex }}>PREDICTION</span>
            </h1>
          </div>
        )}
        
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Mobile Summary Card */}
          <div style={{ 
            padding: 16, background: "rgba(15,23,42,0.6)", borderRadius: 4, 
            border: `1px solid ${t.hex}33`, borderLeft: `4px solid ${t.hex}` 
          }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "#475569", letterSpacing: "0.2em", marginBottom: 8 }}>PROJECTED CHAMPION</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <TeamLogo teamAbbr={championTeam?.abbr || ""} league={league} size={48} accentColor={t.hex} />
              <div>
                <div style={{ fontFamily: "var(--font-inter)", fontWeight: 900, fontSize: 24, color: "#fff" }}>{championTeam?.abbr}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#34d399", fontWeight: 800 }}>
                  {(mcConfidence * 100).toFixed(1)}% CONFIDENCE
                </div>
              </div>
            </div>
          </div>

          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "#334155", textAlign: "center", padding: "10px 0" }}>
            [ FULL BRACKET INTEL IN WAR ROOM ]
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={embedded ? { width: "100%" } : { maxWidth: 1400, margin: "0 auto", padding: "40px 20px" }}>
      {!embedded && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 40, borderBottom: `1px solid ${t.hex}33`, paddingBottom: 20 }}>
          <div>
            <h1 style={{ fontFamily: "var(--font-inter)", fontWeight: 900, fontSize: 32, color: "#fff", letterSpacing: "-0.02em", margin: 0 }}>
              {selectedLeague} 2026 <span style={{ color: t.hex }}>PLAYOFFS</span>
            </h1>
          </div>
          
          <div style={{ textAlign: "right", minWidth: 240 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "#64748b", marginBottom: 6, letterSpacing: "0.1em" }}>
              MONTE CARLO SIMULATION: {(simProgress / totalIterations * 100).toFixed(1)}%
            </div>
            <div style={{ width: "100%", height: 2, background: "rgba(255,255,255,0.05)", position: "relative", overflow: "hidden" }}>
              <div style={{ 
                position: "absolute", left: 0, top: 0, bottom: 0, 
                width: `${(simProgress / totalIterations) * 100}%`,
                background: t.hex,
                boxShadow: `0 0 10px ${t.hex}`
              }} />
            </div>
          </div>
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
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 7, color: "#475569", letterSpacing: "0.2em" }}>SIMULATION ITERATIONS</div>
          <div style={{ fontFamily: "var(--font-inter)", fontWeight: 900, color: t.hex, fontSize: 18 }}>
            {simProgress.toLocaleString()}
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 7, color: "#475569", letterSpacing: "0.2em" }}>PREDICTION CONFIDENCE</div>
          <div style={{ fontFamily: "var(--font-inter)", fontWeight: 900, color: isSimulating ? "#475569" : "#34d399", fontSize: 18 }}>
            {isSimulating ? "CALCULATING..." : `${(mcConfidence * 100).toFixed(2)}%`}
          </div>
        </div>
      </div>
    </div>
  )
}
