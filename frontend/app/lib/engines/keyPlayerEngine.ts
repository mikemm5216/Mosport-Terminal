/**
 * keyPlayerEngine.ts — League-aware key player selection engine
 *
 * Responsibility boundary:
 * - This engine owns key-player scoring/selection logic.
 * - playerReadiness.ts must only own identity freshness and display formatting.
 *
 * Current model is intentionally conservative:
 * - It never crosses team boundaries.
 * - It does not hardcode league-wide famous player pools.
 * - Position is only a small baseline prior, not the final answer.
 * - Future matchup/tactical engines should feed matchupLeverage and tacticalFit.
 */

export type League = string
export type TeamCode = string

export type AvailabilityStatus = 'ACTIVE' | 'QUESTIONABLE' | 'DOUBTFUL' | 'OUT' | 'UNKNOWN'

export type KeyPlayerEngineInput = {
  name: string
  league: League
  teamCode: TeamCode
  position?: string
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

function roleBaselinePrior(league: League, position?: string): number {
  const normalizedLeague = String(league ?? '').toUpperCase()
  const p = String(position ?? '').toUpperCase()

  // Small prior only. Do not treat this as the final key-player answer.
  if (normalizedLeague === 'NBA') {
    if (['PG', 'SG', 'G', 'GUARD'].includes(p)) return 3
    if (['SF', 'PF', 'F', 'FORWARD', 'WING'].includes(p)) return 2.5
    if (['C', 'CENTER'].includes(p)) return 2
  }

  if (normalizedLeague === 'MLB') {
    if (['SP', 'P', 'STARTING PITCHER'].includes(p)) return 3
    if (['C', '1B', '2B', '3B', 'SS', 'OF', 'DH'].includes(p)) return 2.5
    if (['RP', 'RELIEF PITCHER'].includes(p)) return 1.5
  }

  if (normalizedLeague === 'NHL') {
    if (['C', 'LW', 'RW', 'F', 'FORWARD'].includes(p)) return 3
    if (['D', 'DEFENSE', 'DEFENDER'].includes(p)) return 2.25
    if (['G', 'GOALIE'].includes(p)) return 2
  }

  if (normalizedLeague === 'EPL' || normalizedLeague === 'UCL') {
    if (['F', 'FW', 'ST', 'CF', 'FORWARD'].includes(p)) return 2.75
    if (['M', 'MID', 'MIDFIELDER', 'AM', 'CM', 'DM'].includes(p)) return 2.75
    if (['D', 'DEF', 'DEFENDER'].includes(p)) return 2.25
    if (['GK', 'GOALKEEPER'].includes(p)) return 2
  }

  return 2
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

  const usage = player.usageRate === undefined ? 0 : clamp(player.usageRate, 0, 40) * 0.8
  const minutes = player.projectedMinutes === undefined ? 0 : clamp(player.projectedMinutes, 0, 48) * 0.45
  const starter = player.isStarter ? 6 : 0
  const depth = player.depthRank === undefined ? 0 : Math.max(0, 8 - clamp(player.depthRank, 1, 12))
  const rolePrior = roleBaselinePrior(context.league, player.position)

  // These are the real future drivers. They are optional today because the
  // matchup/tactical engines are separate layers and may not exist yet.
  const matchupLeverage = numericSignal(context.matchupLeverage, player.name) * 1.8
  const tacticalFit = numericSignal(context.tacticalFit, player.name) * 1.2
  const gameContextLeverage = numericSignal(context.gameContextLeverage, player.name) * 1.1

  return usage
    + minutes
    + starter
    + depth
    + rolePrior
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
