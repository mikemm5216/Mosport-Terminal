/**
 * seriesState.ts
 * Helper: derive real playoff series scores from completed games.
 * Source of truth: live/completed games always override simulation seed data.
 */

import type { Match } from '../data/mockData'

export interface SeriesState {
  /** Team A abbreviation, normalized alphabetically for stable pair keys. */
  teamA: string
  /** Team B abbreviation, normalized alphabetically for stable pair keys. */
  teamB: string
  teamAWins: number
  teamBWins: number
  lastUpdated: string | null
  source: 'live_completed_games' | 'simulation_seed'
}

/** Normalize a team pair so OKC vs PHX === PHX vs OKC. */
function normalizePair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a]
}

function getSeasonFromGame(game: Match): string | null {
  if (game.season) return String(game.season)
  if (game.seasonYear) return String(game.seasonYear)

  const dateCandidate = (game as Match & { date?: string; startsAt?: string }).date ?? (game as Match & { date?: string; startsAt?: string }).startsAt
  if (dateCandidate) {
    const parsed = new Date(dateCandidate)
    if (!Number.isNaN(parsed.getTime())) return String(parsed.getUTCFullYear())
  }

  const parts = game.id.split('_')
  if (parts[1]?.length === 4 && !Number.isNaN(Number(parts[1]))) return parts[1]

  return null
}

function getPlayoffRound(game: Match): string | null {
  if (game.playoff?.round != null) return String(game.playoff.round)
  return game.seasonType === 'postseason' ? 'inferred' : null
}

/**
 * Given completed playoff Match objects, count wins per series.
 */
export function getSeriesStateFromCompletedGames(games: Match[]): Map<string, SeriesState> {
  const map = new Map<string, SeriesState>()

  const completed = games.filter(
    (g) => g.status === 'FINAL' && g.score != null && (g.seasonType === 'postseason' || g.playoff != null)
  )

  for (const game of completed) {
    const { home, away, score, league } = game
    if (!score) continue

    const season = getSeasonFromGame(game)
    const playoffRound = getPlayoffRound(game)
    if (!season || !playoffRound) continue

    const homeWon = score.home > score.away
    const awayWon = score.away > score.home
    if (!homeWon && !awayWon) continue

    const winner = homeWon ? home.abbr : away.abbr
    const [a, b] = normalizePair(home.abbr, away.abbr)
    const key = `${league}_${season}_${playoffRound}_${a}_${b}`

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
    state.lastUpdated = game.id
  }

  return map
}

/**
 * Given a BracketSeries-like key and the completed-games map, return real wins if available.
 */
export function resolveSeriesWins(
  homeAbbr: string,
  awayAbbr: string,
  seedHome: number,
  seedAway: number,
  liveMap: Map<string, SeriesState>,
  league: string,
  season: string,
  round: string | number
): { winsHome: number; winsAway: number; source: SeriesState['source']; isComplete: boolean; winner?: string } {
  const [a, b] = normalizePair(homeAbbr, awayAbbr)
  const key = `${league}_${season}_${round}_${a}_${b}`
  const live = liveMap.get(key)

  let winsHome = seedHome
  let winsAway = seedAway
  let source: SeriesState['source'] = 'simulation_seed'

  if (live) {
    winsHome = homeAbbr === a ? live.teamAWins : live.teamBWins
    winsAway = awayAbbr === b ? live.teamBWins : live.teamAWins
    source = 'live_completed_games'
  }

  const isComplete = winsHome >= 4 || winsAway >= 4
  const winner = isComplete ? (winsHome >= 4 ? homeAbbr : awayAbbr) : undefined

  return { winsHome, winsAway, source, isComplete, winner }
}
