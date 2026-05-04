'use client'

import { useEffect, useMemo, useState } from 'react'
import { useWindowWidth } from '../lib/useWindowWidth'
import type { League } from '../data/mockData'
import { leagueTheme } from './ui'
import TeamLogo from './TeamLogo'
import type { PlayoffSimulationSummary, SimulationOkSummary, SimulationSummaryResponse } from '../contracts/product'
import { useMatchesContext, DataFreshnessBadge } from '../context/MatchesContext'
import { getSeriesStateFromCompletedGames } from '../lib/seriesState'
import { PAGE_SHELL_STYLE, BREAKPOINTS } from '../lib/ui'

// ── Visual bracket engine ────────────────────────────────────────
function gameWinProb(home: BracketTeam, away: BracketTeam): number {
  const diff = home.edge - away.edge
  const recoveryBoost = (home.recovery - away.recovery) * 0.1
  return Math.max(0.25, Math.min(0.75, 0.52 + diff * 0.55 + recoveryBoost))
}

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

function predictSeries(s: BracketSeries, iterations = 5000): { winner: string; prob: number } {
  if (s.status === 'completed' && s.winner) return { winner: s.winner, prob: 1 }
  let homeWins = 0
  for (let i = 0; i < iterations; i++) {
    if (simulateSeries(s.home, s.away, s.winsHome, s.winsAway).winner === s.home.abbr) homeWins++
  }
  const p = homeWins / iterations
  return { winner: p >= 0.5 ? s.home.abbr : s.away.abbr, prob: p >= 0.5 ? p : 1 - p }
}

function simulateBracket(inputSeries: BracketSeries[], league: League): BracketSeries[] {
  const all: BracketSeries[] = [...inputSeries]
  const conferences: PlayoffConference[] = ['East', 'West']

  const getOrSim = (round: number, conf: PlayoffConference, id: string, t1: BracketTeam, t2: BracketTeam) => {
    const existing = all.find(s => s.round === round && s.conference === conf && 
      ((s.home.abbr === t1.abbr && s.away.abbr === t2.abbr) || (s.home.abbr === t2.abbr && s.away.abbr === t1.abbr)))
    if (existing) return existing
    
    const [h, a] = t1.edge >= t2.edge ? [t1, t2] : [t2, t1]
    const newSeries: BracketSeries = { 
      id, league, round, conference: conf, home: h, away: a, 
      winsHome: 0, winsAway: 0, status: 'pending' 
    }
    all.push(newSeries)
    return newSeries
  }

  for (const conf of conferences) {
    const r1S = all.filter(s => s.round === 1 && s.conference === conf)
    if (r1S.length < 4) continue

    for (let i = 0; i < r1S.length; i += 2) {
      const { winner: w1 } = predictSeries(r1S[i], 2000)
      const { winner: w2 } = predictSeries(r1S[i + 1], 2000)
      const t1 = w1 === r1S[i].home.abbr ? r1S[i].home : r1S[i].away
      const t2 = w2 === r1S[i + 1].home.abbr ? r1S[i + 1].home : r1S[i + 1].away
      getOrSim(2, conf, `${league}-r2-${conf}-${i / 2}`, t1, t2)
    }
  }

  for (const conf of conferences) {
    const r2S = all.filter(s => s.round === 2 && s.conference === conf)
    if (r2S.length < 2) continue

    const { winner: w1 } = predictSeries(r2S[0], 2000)
    const { winner: w2 } = predictSeries(r2S[1], 2000)
    const t1 = w1 === r2S[0].home.abbr ? r2S[0].home : r2S[0].away
    const t2 = w2 === r2S[1].home.abbr ? r2S[1].home : r2S[1].away
    getOrSim(3, conf, `${league}-r3-${conf}`, t1, t2)
  }

  const eF = all.find(s => s.round === 3 && s.conference === 'East')
  const wF = all.find(s => s.round === 3 && s.conference === 'West')
  if (eF && wF) {
    const { winner: we } = predictSeries(eF, 2000)
    const { winner: ww } = predictSeries(wF, 2000)
    const tE = we === eF.home.abbr ? eF.home : eF.away
    const tW = ww === wF.home.abbr ? wF.home : wF.away
    getOrSim(4, 'Finals', `${league}-finals`, tE, tW)
  }

  return all
}

type BracketMatchup = PlayoffSimulationSummary['bracket']['rounds'][number]['matchups'][number]

export function useSummary(league: string) {
  const [summary, setSummary] = useState<SimulationSummaryResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setSummary(null)

    fetch(`/api/playoffs/summary?league=${league}`)
      .then(r => r.json())
      .then((data: SimulationSummaryResponse) => {
        if (!cancelled) setSummary(data)
      })
      .catch(() => {
        if (!cancelled) {
          setSummary({
            status: 'error',
            mode: 'simulation',
            message: 'Unable to load playoff projection summary',
            data: null,
            meta: {
              league: league as any,
              simulationRuns: 0,
              generatedAt: null,
              validationMode: 'unvalidated',
            },
          })
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [league])

  return { summary, loading }
}

function StatusShell({ league, title, message, embedded }: { league: League; title: string; message: string; embedded?: boolean }) {
  const t = leagueTheme(league)
  return (
    <div style={embedded ? { width: '100%' } : PAGE_SHELL_STYLE}>
      <div style={{ padding: '80px 24px', border: `1px dashed ${t.hex}33`, borderRadius: 12, textAlign: 'center', background: 'rgba(15,23,42,0.35)' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: t.hex, letterSpacing: '0.36em', fontWeight: 900, marginBottom: 14 }}>
          [ {title} ]
        </div>
        <div style={{ fontFamily: 'var(--font-inter)', fontSize: 13, color: '#94a3b8' }}>
          {message}
        </div>
      </div>
    </div>
  )
}

function LiveSeriesStrip({ league, seriesMap }: { league: League; seriesMap: ReturnType<typeof getSeriesStateFromCompletedGames> }) {
  const t = leagueTheme(league)
  const series = Array.from(seriesMap.entries())
  if (series.length === 0) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 24 }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: '#64748b', letterSpacing: '0.28em', fontWeight: 900 }}>
        LIVE SERIES RECONSTRUCTION
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
        {series.map(([key, state]) => {
          const complete = state.teamAWins >= 4 || state.teamBWins >= 4
          const winner = complete ? (state.teamAWins >= 4 ? state.teamA : state.teamB) : null
          return (
            <div key={key} style={{ padding: 14, background: 'rgba(2,6,23,0.72)', border: `1px solid ${complete ? t.hex + '66' : 'rgba(148,163,184,0.14)'}`, borderRadius: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <TeamLogo teamAbbr={state.teamA} league={league} size={22} accentColor={winner === state.teamA ? t.hex : '#64748b'} />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 900, color: winner === state.teamA ? '#fff' : '#94a3b8' }}>{state.teamA}</span>
                </div>
                <span style={{ fontFamily: 'var(--font-inter)', fontSize: 18, fontWeight: 900, color: complete ? t.hex : '#f8fafc' }}>{state.teamAWins}:{state.teamBWins}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 900, color: winner === state.teamB ? '#fff' : '#94a3b8' }}>{state.teamB}</span>
                  <TeamLogo teamAbbr={state.teamB} league={league} size={22} accentColor={winner === state.teamB ? t.hex : '#64748b'} />
                </div>
              </div>
              <div style={{ marginTop: 8, fontFamily: 'var(--font-mono)', fontSize: 8, color: complete ? t.hex : '#64748b', letterSpacing: '0.18em', fontWeight: 800 }}>
                {complete ? `WINNER: ${winner}` : 'ACTIVE SERIES'} · LIVE_COMPLETED_GAMES
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SeriesCard({ matchup, league, compact = false }: { matchup: BracketMatchup; league: League; compact?: boolean }) {
  const t = leagueTheme(league)
  return (
    <div style={{
      minHeight: compact ? 58 : 70,
      padding: compact ? '9px 12px' : '11px 14px',
      background: 'linear-gradient(180deg, rgba(15,23,42,0.74), rgba(2,6,23,0.82))',
      border: `1px solid ${matchup.seriesScore ? t.hex + '55' : 'rgba(148,163,184,0.13)'}`,
      borderLeft: `3px solid ${t.hex}`,
      borderRadius: 6,
      boxShadow: matchup.seriesScore ? `0 0 18px ${t.hex}20` : 'none',
    }}>
      {[matchup.teamA, matchup.teamB].map(team => {
        const isProjected = team.shortName === matchup.projectedWinner.shortName
        return (
          <div key={team.shortName} style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between', opacity: isProjected ? 1 : 0.58, marginBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
              <TeamLogo teamAbbr={team.shortName} league={league} size={compact ? 16 : 20} accentColor={isProjected ? t.hex : '#475569'} displayName={team.displayName} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: compact ? 9 : 10, fontWeight: 900, color: isProjected ? '#f8fafc' : '#64748b', overflow: 'hidden', textOverflow: 'ellipsis' }}>{team.shortName}</span>
            </div>
            {isProjected && <span style={{ color: t.hex, fontSize: 10, fontWeight: 900 }}>›</span>}
          </div>
        )
      })}
      <div style={{ marginTop: 5, display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 7, color: '#64748b', letterSpacing: '0.12em', fontWeight: 800 }}>
        <span>{matchup.seriesScore ? `SERIES ${matchup.seriesScore}` : 'PROJECTION'}</span>
        <span style={{ color: t.hex }}>{(matchup.winProbability * 100).toFixed(1)}%</span>
      </div>
    </div>
  )
}

function PendingSeriesCard({ league, label }: { league: League; label: string }) {
  const t = leagueTheme(league)
  return (
    <div style={{ minHeight: 58, padding: '10px 12px', background: 'linear-gradient(180deg, rgba(15,23,42,0.58), rgba(2,6,23,0.72))', border: '1px dashed rgba(148,163,184,0.16)', borderLeft: `3px solid ${t.hex}`, borderRadius: 6 }}>
      <div style={{ height: 9, width: '55%', background: 'rgba(148,163,184,0.12)', borderRadius: 999, marginBottom: 10 }} />
      <div style={{ height: 9, width: '42%', background: 'rgba(148,163,184,0.08)', borderRadius: 999, marginBottom: 9 }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 7, color: t.hex, letterSpacing: '0.12em', fontWeight: 900 }}>
        <span>{label}</span>
        <span>SYNC</span>
      </div>
    </div>
  )
}

function PendingButterflyBracket({ league, message }: { league: League; message: string }) {
  const t = leagueTheme(league)
  const left = ['R1', 'R1', 'R1', 'R1']
  const right = ['R1', 'R1', 'R1', 'R1']
  return (
    <div style={{ position: 'relative', minHeight: 520, padding: '28px 24px', border: `1px solid ${t.hex}22`, borderRadius: 10, background: 'radial-gradient(circle at center, rgba(34,211,238,0.08), rgba(2,6,23,0) 45%)', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: '50%', top: 70, bottom: 40, width: 1, background: `linear-gradient(180deg, transparent, ${t.hex}77, transparent)` }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 0.9fr 220px 0.9fr 1fr 1.2fr', gap: 16, alignItems: 'center', height: '100%' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>{left.map((label, i) => <PendingSeriesCard key={`pl1-${i}`} league={league} label={label} />)}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 42 }}>{left.slice(0, 2).map((label, i) => <PendingSeriesCard key={`pl2-${i}`} league={league} label="R2" />)}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 96 }}><PendingSeriesCard league={league} label="CONF" /></div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#fbbf24', letterSpacing: '0.42em', fontWeight: 900 }}>FINALS</div>
          <div style={{ padding: 22, background: 'rgba(251,191,36,0.05)', border: '2px dashed rgba(251,191,36,0.55)', borderRadius: 8, boxShadow: '0 0 30px rgba(251,191,36,0.12)', textAlign: 'center', minWidth: 190 }}>
            <div style={{ fontFamily: 'var(--font-inter)', fontWeight: 900, color: '#fff', fontSize: 18, marginBottom: 8 }}>SYNC PENDING</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: '#fbbf24', letterSpacing: '0.2em' }}>PROJECTION RECALCULATING</div>
            <div style={{ marginTop: 14, fontFamily: 'var(--font-inter)', fontSize: 12, lineHeight: 1.5, color: '#94a3b8' }}>{message}</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 96 }}><PendingSeriesCard league={league} label="CONF" /></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 42 }}>{right.slice(0, 2).map((label, i) => <PendingSeriesCard key={`pr2-${i}`} league={league} label="R2" />)}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>{right.map((label, i) => <PendingSeriesCard key={`pr1-${i}`} league={league} label={label} />)}</div>
      </div>
    </div>
  )
}

function ChampionCard({ summary, league, loading }: { summary: SimulationOkSummary | null; league: League; loading: boolean }) {
  const champion = summary?.data.projectedChampion
  return (
    <div style={{ padding: '22px', background: 'rgba(251,191,36,0.05)', border: '2px solid #fbbf24', borderRadius: 8, boxShadow: '0 0 30px rgba(251,191,36,0.18)', textAlign: 'center', minWidth: 190 }}>
      {champion ? <TeamLogo teamAbbr={champion.team.shortName} league={league} size={64} accentColor="#fbbf24" displayName={champion.team.displayName} /> : null}
      <div style={{ marginTop: 12, fontFamily: 'var(--font-inter)', fontWeight: 900, color: '#fff', fontSize: 22 }}>
        {loading ? '—' : champion?.team.shortName ?? 'RECALCULATING'}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: '#fbbf24', marginTop: 4, letterSpacing: '0.2em' }}>PROJECTED CHAMPION</div>
      <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid rgba(251,191,36,0.2)' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 7, color: '#64748b', letterSpacing: '0.15em', marginBottom: 2 }}>TITLE PROBABILITY</div>
        <div style={{ fontFamily: 'var(--font-inter)', fontWeight: 900, fontSize: 18, color: loading ? '#475569' : '#fbbf24' }}>
          {loading ? '—' : champion ? `${(champion.titleProbability * 100).toFixed(2)}%` : 'SYNC PENDING'}
        </div>
      </div>
    </div>
  )
}

function ButterflyBracket({ data, league }: { data: PlayoffSimulationSummary; league: League }) {
  const t = leagueTheme(league)
  const rounds = data.bracket.rounds
  const r1 = rounds[0]?.matchups ?? []
  const r2 = rounds[1]?.matchups ?? []
  const r3 = rounds[2]?.matchups ?? []
  const finals = rounds[3]?.matchups?.[0]
  const split = <T,>(items: T[]): [T[], T[]] => [items.slice(0, Math.ceil(items.length / 2)), items.slice(Math.ceil(items.length / 2))]
  const [r1Left, r1Right] = split(r1)
  const [r2Left, r2Right] = split(r2)
  const [r3Left, r3Right] = split(r3)

  return (
    <div style={{ position: 'relative', minHeight: 520, padding: '28px 24px', border: `1px solid ${t.hex}18`, borderRadius: 10, background: 'radial-gradient(circle at center, rgba(34,211,238,0.08), rgba(2,6,23,0) 45%)', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: '50%', top: 70, bottom: 40, width: 1, background: `linear-gradient(180deg, transparent, ${t.hex}77, transparent)` }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 0.9fr 220px 0.9fr 1fr 1.2fr', gap: 16, alignItems: 'center', height: '100%' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>{r1Left.map((m, i) => <SeriesCard key={`l-r1-${i}`} matchup={m} league={league} compact />)}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 42 }}>{r2Left.map((m, i) => <SeriesCard key={`l-r2-${i}`} matchup={m} league={league} compact />)}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 96 }}>{r3Left.map((m, i) => <SeriesCard key={`l-r3-${i}`} matchup={m} league={league} />)}</div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#fbbf24', letterSpacing: '0.42em', fontWeight: 900 }}>FINALS</div>
          {finals ? <SeriesCard matchup={finals} league={league} /> : null}
          <ChampionCard summary={{ status: 'ok', mode: 'simulation', data, meta: { league: league as any, simulationRuns: 0, generatedAt: null, validationMode: 'unvalidated' } }} league={league} loading={false} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 96 }}>{r3Right.map((m, i) => <SeriesCard key={`r-r3-${i}`} matchup={m} league={league} />)}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 42 }}>{r2Right.map((m, i) => <SeriesCard key={`r-r2-${i}`} matchup={m} league={league} compact />)}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>{r1Right.map((m, i) => <SeriesCard key={`r-r1-${i}`} matchup={m} league={league} compact />)}</div>
      </div>
    </div>
  )
}

function FinalsMatchupCard({ summary, league, loading }: { summary: SimulationOkSummary | null; league: League; loading: boolean }) {
  const t = leagueTheme(league)
  const matchup = summary?.data.mostLikelyFinalsMatchup
  return (
    <div style={{ flex: 1, padding: '16px 20px', background: 'rgba(15,23,42,0.6)', border: `1px solid ${t.hex}33`, borderRadius: 4 }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 7, color: '#475569', letterSpacing: '0.2em', marginBottom: 10 }}>MOST LIKELY FINALS MATCHUP</div>
      {loading || !matchup ? <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#334155' }}>—</div> : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <TeamLogo teamAbbr={matchup.teamA.shortName} league={league} size={28} accentColor={t.hex} displayName={matchup.teamA.displayName} />
            <span style={{ fontFamily: 'var(--font-inter)', fontWeight: 900, fontSize: 18, color: '#f8fafc' }}>{matchup.teamA.shortName}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#475569' }}>vs</span>
            <span style={{ fontFamily: 'var(--font-inter)', fontWeight: 900, fontSize: 18, color: '#f8fafc' }}>{matchup.teamB.shortName}</span>
            <TeamLogo teamAbbr={matchup.teamB.shortName} league={league} size={28} accentColor={t.hex} displayName={matchup.teamB.displayName} />
          </div>
          <div style={{ fontFamily: 'var(--font-inter)', fontWeight: 900, fontSize: 20, color: t.hex }}>{(matchup.probability * 100).toFixed(1)}%</div>
        </>
      )}
    </div>
  )
}

function TitleDistributionTable({ summary, league, loading }: { summary: SimulationOkSummary | null; league: League; loading: boolean }) {
  const t = leagueTheme(league)
  const top5 = summary?.data.titleDistribution.slice(0, 5) ?? []
  return (
    <div style={{ flex: 1, padding: '16px 20px', background: 'rgba(15,23,42,0.6)', border: `1px solid ${t.hex}33`, borderRadius: 4 }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 7, color: '#475569', letterSpacing: '0.2em', marginBottom: 10 }}>TITLE DISTRIBUTION</div>
      {loading ? <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#334155' }}>—</div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {top5.length === 0 ? <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#334155' }}>SYNC PENDING</div> : top5.map((entry, i) => (
            <div key={entry.team.shortName} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: '#475569', width: 12 }}>{i + 1}.</span>
              <TeamLogo teamAbbr={entry.team.shortName} league={league} size={16} accentColor={i === 0 ? t.hex : '#475569'} displayName={entry.team.displayName} />
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 10, color: i === 0 ? '#f8fafc' : '#94a3b8', flex: 1 }}>{entry.team.shortName}</span>
              <span style={{ fontFamily: 'var(--font-inter)', fontWeight: 900, fontSize: 13, color: i === 0 ? t.hex : '#64748b' }}>{(entry.probability * 100).toFixed(1)}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ValidationSummaryCard({ summary, loading }: { summary: SimulationOkSummary | null; loading: boolean }) {
  const validation = summary?.data.validation
  return (
    <div style={{ flex: 1, padding: '16px 20px', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(148,163,184,0.1)', borderRadius: 4 }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 7, color: '#475569', letterSpacing: '0.2em', marginBottom: 10 }}>VALIDATION</div>
      {loading || !validation ? <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#334155' }}>—</div> : (
        <div style={{ fontFamily: 'var(--font-inter)', fontWeight: 800, fontSize: 11, color: '#34d399' }}>
          {validation.mode === 'live_projection' ? 'MODEL ACCURACY' : `${(Number(validation.overallAccuracy) * 100).toFixed(1)}% ACCURACY`}
        </div>
      )}
    </div>
  )
}

export default function PlayoffBracketPage({ embedded = false, league = 'NBA' }: { embedded?: boolean; league?: League } = {}) {
  const width = useWindowWidth()
  const isTablet = width < BREAKPOINTS.tablet
  const selectedLeague = league
  const t = leagueTheme(selectedLeague)
  const { summary, loading } = useSummary(selectedLeague)
  const { matches: allMatches, dataFreshness } = useMatchesContext()

  const summaryOk = summary?.status === 'ok' ? summary : null
  const summaryPending = summary?.status === 'pending'
  const summaryError = summary?.status === 'error'
  const liveLeaguePlayoffGames = useMemo(
    () => allMatches.filter(m => m.league === selectedLeague && m.status === 'FINAL' && (m.seasonType === 'postseason' || m.playoff != null)),
    [allMatches, selectedLeague]
  )
  const liveSeriesMap = useMemo(() => getSeriesStateFromCompletedGames(liveLeaguePlayoffGames), [liveLeaguePlayoffGames])
  const allSeries = useMemo(() => {
    // Priority 1: Live reconstruction from API summary
    if (summary?.status === 'ok' && summary.data.bracket.rounds.length > 0 && summary.data.validation.notes?.includes('ESPN')) {
      const apiSeries: BracketSeries[] = []
      summary.data.bracket.rounds.forEach(r => {
        r.matchups.forEach(m => {
          apiSeries.push({
            id: `live-${m.teamA.code}-${m.teamB.code}`,
            league: 'NBA',
            round: m.round || 1,
            conference: (m.conference as PlayoffConference) || 'East',
            home: { abbr: m.teamA.code, seed: m.teamA.seed || 0, edge: 0.5, recovery: 0.7, name: m.teamA.displayName },
            away: { abbr: m.teamB.code, seed: m.teamB.seed || 0, edge: 0.5, recovery: 0.7, name: m.teamB.displayName },
            winsHome: m.winsA || 0,
            winsAway: m.winsB || 0,
            status: (m.winsA || 0) >= 4 || (m.winsB || 0) >= 4 ? 'completed' : 'active',
            winner: (m.winsA || 0) >= 4 ? m.teamA.code : ((m.winsB || 0) >= 4 ? m.teamB.code : undefined),
            _source: 'live_espn_reconstruction'
          } as any)
        })
      })
      return simulateBracket(apiSeries, league)
    }

    // Priority 2: Fallback to static bracket + context games (Hydration)
    const baseBracket = selectedLeague === 'NBA' ? NBA_BRACKET_2026 : []
    const hydrated = baseBracket.map(s => {
      const season = '2026' 
      const { winsHome, winsAway, source, isComplete, winner } = resolveSeriesWins(
        s.home.abbr, s.away.abbr, s.winsHome, s.winsAway, liveSeriesMap, selectedLeague, season, s.round
      )
      return { 
        ...s, winsHome, winsAway, status: isComplete ? 'completed' : s.status,
        winner: winner ?? s.winner, _source: source 
      } as BracketSeries & { _source: string }
    })

    if (hydrated.length > 0) return simulateBracket(hydrated, league)
    return []
  }, [summary, liveSeriesMap, selectedLeague, league])

  const hasLiveSeriesData = allSeries.some(s => (s as any)._source === 'live_espn_reconstruction' || (s as any)._source === 'live_completed_games')

  // Map back to PlayoffSimulationSummary for the ButterflyBracket component
  const simulatedSummaryData = useMemo(() => {
    if (!summaryOk) return null
    const rounds: PlayoffSimulationSummary['bracket']['rounds'] = [
      { roundName: 'Round 1', matchups: [] },
      { roundName: 'Conference Semifinals', matchups: [] },
      { roundName: 'Conference Finals', matchups: [] },
      { roundName: 'Finals', matchups: [] }
    ]
    
    allSeries.forEach(s => {
      const roundIdx = s.round - 1
      if (rounds[roundIdx]) {
        rounds[roundIdx].matchups.push({
          teamA: teamRef(s.league as any, s.away.abbr, s.away.seed, s.away.name),
          teamB: teamRef(s.league as any, s.home.abbr, s.home.seed, s.home.name),
          projectedWinner: teamRef(s.league as any, predictSeries(s).winner),
          winProbability: predictSeries(s).prob,
          seriesScore: s.winsHome || s.winsAway ? `${s.winsAway}-${s.winsHome}` : undefined
        } as any)
      }
    })
    
    return { ...summaryOk.data, bracket: { rounds } }
  }, [allSeries, summaryOk])

  if (!loading && summaryError && !hasLiveSeriesData) {
    return <StatusShell embedded={embedded} league={selectedLeague} title={`${selectedLeague} PLAYOFF SNAPSHOT UNAVAILABLE`} message={summary?.message ?? 'Projection snapshot unavailable.'} />
  }

  const pendingMessage = summaryPending
    ? 'Waiting for live playoff snapshot or completed series reconstruction. No mock bracket is shown in production.'
    : 'Waiting for projection snapshot. No mock bracket is shown in production.'

  return (
    <div style={embedded ? { width: '100%' } : PAGE_SHELL_STYLE}>
      <div className={embedded ? '' : isTablet ? 'py-8 sm:py-12' : 'py-12 sm:py-16'}>
        {!embedded && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 42, borderBottom: `1px solid ${t.hex}33`, paddingBottom: 28 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 800, letterSpacing: '0.32em', color: '#475569' }}>PLAYOFF INTELLIGENCE</span>
                <span style={{ color: '#1e293b', fontFamily: 'var(--font-mono)', fontSize: 9 }}>//</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, letterSpacing: '0.28em', color: '#334155' }}>PROJECTION AGENT ENGINE</span>
              </div>
              <h1 style={{ fontFamily: 'var(--font-inter), Inter, sans-serif', fontWeight: 900, fontSize: 'clamp(34px, 6vw, 56px)', color: '#fff', letterSpacing: '-0.04em', margin: 0, lineHeight: 0.9, fontStyle: 'italic' }}>
                {selectedLeague} <span style={{ color: t.hex, fontStyle: 'normal' }}>PLAYOFF PROJECTION</span>
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 20, flexWrap: 'wrap' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#475569', letterSpacing: '0.2em', fontWeight: 800 }}>
                  {(summaryOk?.meta.simulationRuns ?? 0).toLocaleString()} model iterations · {summaryOk ? 'snapshot' : 'sync pending'}
                </div>
                <DataFreshnessBadge freshness={dataFreshness} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: hasLiveSeriesData ? t.hex : '#64748b', letterSpacing: '0.15em', fontWeight: 900 }}>
                  SYNC: {hasLiveSeriesData ? 'LIVE_RECONSTRUCTION' : summaryPending ? 'PENDING' : summaryError ? 'ERROR' : 'SNAPSHOT'}
                </span>
              </div>
            </div>
          </div>
        )}

        {simulatedSummaryData ? <ButterflyBracket data={simulatedSummaryData} league={selectedLeague} /> : <PendingButterflyBracket league={selectedLeague} message={pendingMessage} />}

        <LiveSeriesStrip league={selectedLeague} seriesMap={liveSeriesMap} />

        <div style={{ display: 'flex', gap: 20, marginTop: 32, flexWrap: 'wrap' }}>
          <FinalsMatchupCard summary={summaryOk} league={selectedLeague} loading={loading} />
          <TitleDistributionTable summary={summaryOk} league={selectedLeague} loading={loading} />
          <ValidationSummaryCard summary={summaryOk} loading={loading} />
        </div>
      </div>
    </div>
  )
}
