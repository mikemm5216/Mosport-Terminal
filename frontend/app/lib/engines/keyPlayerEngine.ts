/**
 * keyPlayerEngine.ts — Data-driven key player selection engine
 *
 * Responsibility boundary:
 * - This engine owns key-player scoring/selection logic.
 * - playerReadiness.ts must only own identity freshness and display formatting.
 *
 * Core rule:
 * - A player becomes key because of this matchup/context, not because a sport
 *   position was hardcoded as globally more important.
 *
 * The engine accepts optional matchup/tactical/context signals from upstream
 * engines. Until those exist, it falls back to provider metadata and stable
 * deterministic tie-breaking only.
 */

export type League = string
export type TeamCode = string

export type AvailabilityStatus = 'ACTIVE' | 'QUESTIONABLE' | 'DOUBTFUL' | 'OUT' | 'UNKNOWN'

export type KeyPlayerEngineInput = {
  name: string
  league: League
  teamCode: TeamCode
  position?: string
  jersey?: string
  isStarter?: boolean
  projectedMinutes?: number
  usageRate?: number
  depthRank?: number
  availability: AvailabilityStatus
}

export type KeyPlayerContext = {
  matchId: string
  league: League
  teamCode: TeamCode
  opponentTeamCode?: TeamCode
  matchupLeverage?: Record<string, number>
  tacticalFit?: Record<string, number>
  gameContextLeverage?: Record<string, number>
}

export type RankedKeyPlayer = KeyPlayerEngineInput & {
  _importanceScore: number
}

function djb2(s: string): number {
  let h = 5381
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(33, h) ^ s.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function numericSignal(signal: Record<string, number> | undefined, playerName: string): number {
  const value = signal?.[playerName]
  return Number.isFinite(value) ? Number(value) : 0
}

function availabilityPenalty(availability: AvailabilityStatus): number {
  switch (availability) {
    case 'ACTIVE': return 0
    case 'UNKNOWN': return 0
    case 'QUESTIONABLE': return -8
    case 'DOUBTFUL': return -18
    case 'OUT': return -999
  }
}

export function computeKeyPlayerScore(
  player: KeyPlayerEngineInput,
  context: KeyPlayerContext,
): number {
  const seed = `${context.matchId}::${context.league}::${context.teamCode}::${player.name}`
  const stableTieBreaker = (djb2(seed) % 1000) / 1000

  // Provider metadata: useful, but not a tactical conclusion by itself.
  const usage = player.usageRate === undefined ? 0 : clamp(player.usageRate, 0, 40) * 0.45
  const minutes = player.projectedMinutes === undefined ? 0 : clamp(player.projectedMinutes, 0, 120) * 0.20
  const starter = player.isStarter ? 3 : 0
  const depth = player.depthRank === undefined ? 0 : Math.max(0, 8 - clamp(player.depthRank, 1, 12)) * 0.5

  // Main future drivers. These should be produced by matchup/tactical/context engines.
  const matchupLeverage = numericSignal(context.matchupLeverage, player.name) * 2.0
  const tacticalFit = numericSignal(context.tacticalFit, player.name) * 1.4
  const gameContextLeverage = numericSignal(context.gameContextLeverage, player.name) * 1.2

  return usage
    + minutes
    + starter
    + depth
    + matchupLeverage
    + tacticalFit
    + gameContextLeverage
    + availabilityPenalty(player.availability)
    + stableTieBreaker
}

export function rankKeyPlayers(
  players: readonly KeyPlayerEngineInput[],
  context: KeyPlayerContext,
): readonly RankedKeyPlayer[] {
  return players
    .filter((player) => player.availability !== 'OUT')
    .map((player) => ({
      ...player,
      _importanceScore: computeKeyPlayerScore(player, context),
    }))
    .sort((a, b) => {
      const scoreDelta = b._importanceScore - a._importanceScore
      if (scoreDelta !== 0) return scoreDelta
      return a.name.localeCompare(b.name)
    })
}
