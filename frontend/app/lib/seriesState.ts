/**
 * seriesState.ts
 * Helper: derive real playoff series scores from completed games.
 * Source of truth: live/completed games always override simulation seed data.
 */

import type { Match } from '../data/mockData'

export interface SeriesState {
  /** Team A abbreviation (typically the higher seed / home team) */
  teamA: string
  /** Team B abbreviation */
  teamB: string
  teamAWins: number
  teamBWins: number
  lastUpdated: string | null   // ISO string of the most recent completed game
  source: 'live_completed_games' | 'simulation_seed'
}

interface SeriesKey {
  teamA: string
  teamB: string
  round?: number
  league?: string
}

/** Normalize a team pair so OKC vs PHX === PHX vs OKC (alphabetical) */
function normalizePair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a]
}

/**
 * getSeriesStateFromCompletedGames
 *
 * Given a list of Match objects, count wins per team for each series
 * identified by the (teamA, teamB) pair.
 *
 * Rules:
 *  - Only considers status === 'FINAL' games (score is authoritative)
 *  - A game is won by whoever scored more
 *  - Ties are skipped (shouldn't happen in NBA/NHL)
 *
 * Returns a map keyed by `${normalizedTeamA}_${normalizedTeamB}`.
 */
export function getSeriesStateFromCompletedGames(
  games: Match[]
): Map<string, SeriesState> {
  const map = new Map<string, SeriesState>()

  const completed = games.filter(
    (g) => g.status === 'FINAL' && g.score != null
  )

  for (const game of completed) {
    const { home, away, score } = game
    if (!score) continue

    const homeWon = score.home > score.away
    const awayWon = score.away > score.home
    if (!homeWon && !awayWon) continue   // tie — skip

    const winner = homeWon ? home.abbr : away.abbr
    const loser  = homeWon ? away.abbr : home.abbr

    const [a, b] = normalizePair(home.abbr, away.abbr)
    const key = `${a}_${b}`

    if (!map.has(key)) {
      map.set(key, {
        teamA: a,
        teamB: b,
        teamAWins: 0,
        teamBWins: 0,
        lastUpdated: game.id,
        source: 'live_completed_games',
      })
    }

    const state = map.get(key)!
    if (winner === a) state.teamAWins++
    else state.teamBWins++
    // keep the id of last game seen (games aren't dated so we use id as proxy)
    state.lastUpdated = game.id
  }

  return map
}

/**
 * resolveSeriesWins
 *
 * Given a BracketSeries-like key and the completed-games map,
 * return the real wins if available, else fall back to the seed values.
 *
 * @param homeAbbr   - home team abbreviation
 * @param awayAbbr   - away team abbreviation
 * @param seedHome   - winsHome from static bracket data (fallback)
 * @param seedAway   - winsAway from static bracket data (fallback)
 * @param liveMap    - result of getSeriesStateFromCompletedGames
 */
export function resolveSeriesWins(
  homeAbbr: string,
  awayAbbr: string,
  seedHome: number,
  seedAway: number,
  liveMap: Map<string, SeriesState>
): { winsHome: number; winsAway: number; source: SeriesState['source'] } {
  const [a, b] = normalizePair(homeAbbr, awayAbbr)
  const key = `${a}_${b}`
  const live = liveMap.get(key)

  if (live) {
    // map teamA/B back to home/away
    const winsHome = homeAbbr === a ? live.teamAWins : live.teamBWins
    const winsAway = awayAbbr === b ? live.teamBWins : live.teamAWins
    return { winsHome, winsAway, source: 'live_completed_games' }
  }

  return { winsHome: seedHome, winsAway: seedAway, source: 'simulation_seed' }
}

// ── Smoke test (pure functions, runs at import time in dev) ───────────────

if (process.env.NODE_ENV !== 'production') {
  function makeGame(id: string, homeAbbr: string, awayAbbr: string, homeScore: number, awayScore: number): Match {
    return {
      id,
      league: 'NBA',
      status: 'FINAL',
      time: 'FT',
      home: { abbr: homeAbbr, name: homeAbbr, city: homeAbbr },
      away: { abbr: awayAbbr, name: awayAbbr, city: awayAbbr },
      score: { home: homeScore, away: awayScore },
      baseline_win: 0.5,
      physio_adjusted: 0.5,
      wpa: 0,
      perspective: 'HOME',
      tactical_label: 'UNCERTAIN',
      matchup_complexity: 0.5,
      recovery_away: 0.7,
      recovery_home: 0.7,
    }
  }

  // Test 1: OKC vs PHX — OKC wins 2, PHX wins 2 → series 2-2
  const test1Games: Match[] = [
    makeGame('g1', 'OKC', 'PHX', 110, 100),  // OKC wins
    makeGame('g2', 'OKC', 'PHX', 95, 102),   // PHX wins
    makeGame('g3', 'PHX', 'OKC', 108, 101),  // PHX wins (home = PHX)
    makeGame('g4', 'PHX', 'OKC', 99, 115),   // OKC wins (away)
  ]
  const map1 = getSeriesStateFromCompletedGames(test1Games)
  const r1 = resolveSeriesWins('OKC', 'PHX', 0, 0, map1)
  console.assert(r1.winsHome === 2 && r1.winsAway === 2,
    `[seriesState] FAIL test1: OKC-PHX expected 2-2, got ${r1.winsHome}-${r1.winsAway}`)
  if (r1.winsHome === 2 && r1.winsAway === 2)
    console.log('[seriesState] ✓ test1 PASS: OKC vs PHX → 2-2')

  // Test 2: DET vs ORL — DET wins 3, ORL wins 2 → series 3-2
  const test2Games: Match[] = [
    makeGame('g1', 'DET', 'ORL', 102, 95),   // DET wins
    makeGame('g2', 'DET', 'ORL', 88, 97),    // ORL wins
    makeGame('g3', 'ORL', 'DET', 103, 99),   // ORL wins (home = ORL)
    makeGame('g4', 'ORL', 'DET', 91, 108),   // DET wins (away)
    makeGame('g5', 'DET', 'ORL', 115, 104),  // DET wins
  ]
  const map2 = getSeriesStateFromCompletedGames(test2Games)
  const r2 = resolveSeriesWins('DET', 'ORL', 0, 0, map2)
  console.assert(r2.winsHome === 3 && r2.winsAway === 2,
    `[seriesState] FAIL test2: DET-ORL expected 3-2, got ${r2.winsHome}-${r2.winsAway}`)
  if (r2.winsHome === 3 && r2.winsAway === 2)
    console.log('[seriesState] ✓ test2 PASS: DET vs ORL → 3-2')
}
