/**
 * playerReadiness.ts — Deterministic key player state helper
 *
 * Final identity model:
 * 1. Fresh live roster snapshot by league + teamCode
 * 2. Fresh cached team roster by league + teamCode
 * 3. Neutral team-safe placeholder fallback
 *
 * Key-player model:
 * - Real players are ranked inside their own team roster only.
 * - Ranking prefers provider metadata when present: usage, minutes, starter,
 *   depth, position, availability.
 * - Missing metadata falls back to deterministic tie-breakers, never random.
 *
 * Critical trust rules:
 * - Never use league-wide player name pools.
 * - Never assign a real player unless it came from that exact team's roster store.
 * - Never claim real-time roster telemetry when no fresh provider snapshot exists.
 * - Missing or stale roster data must fall back to neutral placeholders.
 */

import type { Match, KeyPlayer, ReadinessFlag } from '../data/mockData'

type League = string
type TeamCode = string

type PlayerSource =
  | 'live_roster_provider'
  | 'cached_team_roster'
  | 'simulated_player_state_team_placeholder'

type AvailabilityStatus = 'ACTIVE' | 'QUESTIONABLE' | 'DOUBTFUL' | 'OUT' | 'UNKNOWN'

type ProviderRosterPlayer = {
  name: string
  position?: string
  isStarter?: boolean
  projectedMinutes?: number
  usageRate?: number
  depthRank?: number
  availability?: AvailabilityStatus
}

type RosterEntry = {
  name: string
  league: League
  teamCode: TeamCode
  updatedAtMs: number
  position?: string
  isStarter?: boolean
  projectedMinutes?: number
  usageRate?: number
  depthRank?: number
  availability: AvailabilityStatus
}

type TeamRosterStore = Record<League, Record<TeamCode, readonly RosterEntry[]>>

const LIVE_ROSTER_MAX_AGE_MS = 15 * 60 * 1000
const CACHED_ROSTER_MAX_AGE_MS = 24 * 60 * 60 * 1000

// Provider-backed stores. These are intentionally empty by default.
// A crawler/API adapter must hydrate them with league + teamCode scoped data.
export const TEAM_PLAYER_POOL: TeamRosterStore = {}
const CACHED_TEAM_PLAYER_POOL: TeamRosterStore = {}

// ── Deterministic hash ────────────────────────────────────────────────────────
function djb2(s: string): number {
  let h = 5381
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(33, h) ^ s.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

function normalizeCode(code: string | undefined): TeamCode {
  return String(code ?? '').trim().toUpperCase()
}

function normalizeLeague(league: string | undefined): League {
  return String(league ?? '').trim().toUpperCase()
}

function nowMs(): number {
  return Date.now()
}

function finiteOrUndefined(value: unknown): number | undefined {
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function normalizeAvailability(value: unknown): AvailabilityStatus {
  const v = String(value ?? 'UNKNOWN').trim().toUpperCase()
  if (v === 'ACTIVE' || v === 'QUESTIONABLE' || v === 'DOUBTFUL' || v === 'OUT') return v
  return 'UNKNOWN'
}

function isFresh(entry: RosterEntry, maxAgeMs: number, atMs = nowMs()): boolean {
  return Number.isFinite(entry.updatedAtMs)
    && entry.updatedAtMs > 0
    && atMs - entry.updatedAtMs <= maxAgeMs
}

function ensureLeagueBucket(store: TeamRosterStore, league: League): Record<TeamCode, readonly RosterEntry[]> {
  store[league] ??= {}
  return store[league]
}

function toProviderPlayers(players: readonly (string | ProviderRosterPlayer)[]): readonly ProviderRosterPlayer[] {
  return players
    .map((player) => typeof player === 'string' ? { name: player } : player)
    .filter((player): player is ProviderRosterPlayer => Boolean(String(player?.name ?? '').trim()))
}

function toRosterEntries(
  league: League,
  teamCode: TeamCode,
  players: readonly (string | ProviderRosterPlayer)[],
  updatedAtMs: number,
): readonly RosterEntry[] {
  return toProviderPlayers(players).map((player) => ({
    name: String(player.name).trim(),
    league,
    teamCode,
    updatedAtMs,
    position: player.position ? String(player.position).trim().toUpperCase() : undefined,
    isStarter: typeof player.isStarter === 'boolean' ? player.isStarter : undefined,
    projectedMinutes: finiteOrUndefined(player.projectedMinutes),
    usageRate: finiteOrUndefined(player.usageRate),
    depthRank: finiteOrUndefined(player.depthRank),
    availability: normalizeAvailability(player.availability),
  }))
}

/**
 * Hydrate the fresh live roster read model from a provider adapter.
 * The caller must pass only players belonging to the exact league + teamCode.
 */
export function upsertLiveTeamRoster(
  leagueInput: League,
  teamCodeInput: TeamCode,
  players: readonly (string | ProviderRosterPlayer)[],
  updatedAtMs = nowMs(),
): void {
  const league = normalizeLeague(leagueInput)
  const teamCode = normalizeCode(teamCodeInput)
  if (!league || !teamCode) return

  ensureLeagueBucket(TEAM_PLAYER_POOL, league)[teamCode] = toRosterEntries(
    league,
    teamCode,
    players,
    updatedAtMs,
  )
}

/**
 * Hydrate the cache layer from persisted provider data.
 * Stale cache will not be used by generateSimulatedPlayers.
 */
export function upsertCachedTeamRoster(
  leagueInput: League,
  teamCodeInput: TeamCode,
  players: readonly (string | ProviderRosterPlayer)[],
  updatedAtMs: number,
): void {
  const league = normalizeLeague(leagueInput)
  const teamCode = normalizeCode(teamCodeInput)
  if (!league || !teamCode) return

  ensureLeagueBucket(CACHED_TEAM_PLAYER_POOL, league)[teamCode] = toRosterEntries(
    league,
    teamCode,
    players,
    updatedAtMs,
  )
}

function getFreshRoster(
  store: TeamRosterStore,
  league: League,
  teamCode: TeamCode,
  maxAgeMs: number,
): readonly RosterEntry[] | null {
  const roster = store[league]?.[teamCode]
  if (!roster?.length) return null

  const fresh = roster.filter((entry) =>
    entry.league === league
    && entry.teamCode === teamCode
    && entry.availability !== 'OUT'
    && isFresh(entry, maxAgeMs),
  )

  return fresh.length ? fresh : null
}

const TEAM_PLACEHOLDERS: Record<League, readonly string[]> = {
  NBA: ['Key Guard', 'Key Forward', 'Rotation Player'],
  MLB: ['Starting Pitcher', 'Relief Arm', 'Rotation Player'],
  NHL: ['Top Line Forward', 'Blue Line Defender', 'Rotation Player'],
  EPL: ['Key Forward', 'Key Midfielder', 'Rotation Player'],
  UCL: ['Key Forward', 'Key Midfielder', 'Rotation Player'],
}

const DEFAULT_PLACEHOLDERS = ['Key Guard', 'Key Forward', 'Rotation Player'] as const

function getPlaceholderPool(league: League): readonly string[] {
  return TEAM_PLACEHOLDERS[league] ?? DEFAULT_PLACEHOLDERS
}

type ResolvedPlayerPool = {
  players: readonly RosterEntry[]
  source: PlayerSource
}

function placeholderEntries(league: League, teamCode: TeamCode): readonly RosterEntry[] {
  return getPlaceholderPool(league).map((name) => ({
    name,
    league,
    teamCode,
    updatedAtMs: nowMs(),
    availability: 'UNKNOWN' as const,
  }))
}

function resolvePlayerPool(league: League, teamCode: TeamCode): ResolvedPlayerPool {
  const liveRoster = getFreshRoster(
    TEAM_PLAYER_POOL,
    league,
    teamCode,
    LIVE_ROSTER_MAX_AGE_MS,
  )

  if (liveRoster) {
    return {
      players: liveRoster,
      source: 'live_roster_provider',
    }
  }

  const cachedRoster = getFreshRoster(
    CACHED_TEAM_PLAYER_POOL,
    league,
    teamCode,
    CACHED_ROSTER_MAX_AGE_MS,
  )

  if (cachedRoster) {
    return {
      players: cachedRoster,
      source: 'cached_team_roster',
    }
  }

  return {
    players: placeholderEntries(league, teamCode),
    source: 'simulated_player_state_team_placeholder',
  }
}

function positionPriority(league: League, position?: string): number {
  const p = String(position ?? '').toUpperCase()

  if (league === 'NBA') {
    if (['PG', 'SG', 'G', 'GUARD'].includes(p)) return 9
    if (['SF', 'PF', 'F', 'FORWARD', 'WING'].includes(p)) return 8
    if (['C', 'CENTER'].includes(p)) return 7
  }

  if (league === 'MLB') {
    if (['SP', 'P', 'STARTING PITCHER'].includes(p)) return 9
    if (['C', '1B', '2B', '3B', 'SS', 'OF', 'DH'].includes(p)) return 8
    if (['RP', 'RELIEF PITCHER'].includes(p)) return 6
  }

  if (league === 'NHL') {
    if (['C', 'LW', 'RW', 'F', 'FORWARD'].includes(p)) return 9
    if (['D', 'DEFENSE', 'DEFENDER'].includes(p)) return 7
    if (['G', 'GOALIE'].includes(p)) return 6
  }

  if (league === 'EPL' || league === 'UCL') {
    if (['F', 'FW', 'ST', 'CF', 'FORWARD'].includes(p)) return 9
    if (['M', 'MID', 'MIDFIELDER', 'AM', 'CM', 'DM'].includes(p)) return 8
    if (['D', 'DEF', 'DEFENDER'].includes(p)) return 6
    if (['GK', 'GOALKEEPER'].includes(p)) return 5
  }

  return 5
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

function importanceScore(
  player: RosterEntry,
  league: League,
  teamCode: TeamCode,
  matchId: string,
): number {
  const seed = `${matchId}::${league}::${teamCode}::${player.name}`
  const stableTieBreaker = (djb2(seed) % 1000) / 1000
  const usage = player.usageRate === undefined ? 0 : clamp(player.usageRate, 0, 40) * 1.1
  const minutes = player.projectedMinutes === undefined ? 0 : clamp(player.projectedMinutes, 0, 48) * 0.7
  const starter = player.isStarter ? 12 : 0
  const depth = player.depthRank === undefined ? 0 : Math.max(0, 8 - clamp(player.depthRank, 1, 12)) * 2
  const position = positionPriority(league, player.position)

  return usage
    + minutes
    + starter
    + depth
    + position
    + availabilityPenalty(player.availability)
    + stableTieBreaker
}

function rankKeyPlayers(
  players: readonly RosterEntry[],
  league: League,
  teamCode: TeamCode,
  matchId: string,
): readonly RosterEntry[] {
  return [...players].sort((a, b) => {
    const scoreDelta = importanceScore(b, league, teamCode, matchId)
      - importanceScore(a, league, teamCode, matchId)
    if (scoreDelta !== 0) return scoreDelta
    return a.name.localeCompare(b.name)
  })
}

// ── State definitions ─────────────────────────────────────────────────────────
type PlayerState = 'HOT' | 'STABLE' | 'FATIGUED' | 'COLLAPSE_RISK'
const STATES: PlayerState[] = ['HOT', 'STABLE', 'FATIGUED', 'COLLAPSE_RISK']

const STATE_TO_FLAG: Record<PlayerState, ReadinessFlag> = {
  HOT:            'CLEAR',
  STABLE:         'CLEAR',
  FATIGUED:       'MONITOR',
  COLLAPSE_RISK:  'REST',
}

const STATE_REASON: Record<PlayerState, string> = {
  HOT:           'Driving offensive momentum and creating matchup pressure.',
  STABLE:        'Maintaining role contribution — workload within manageable range.',
  FATIGUED:      'Workload is rising, reducing efficiency late in game.',
  COLLAPSE_RISK: 'Under pressure, decision-making is breaking down.',
}

const STATE_COACH_ACTION: Record<PlayerState, string> = {
  HOT:           'FEATURE_MORE',
  STABLE:        'KEEP_ON',
  FATIGUED:      'REDUCE_MINUTES',
  COLLAPSE_RISK: 'BENCH',
}

function computeHrv(state: PlayerState, entropy: number): number {
  const r = entropy % 10
  switch (state) {
    case 'HOT':           return +(0.06 + r * 0.009).toFixed(3)
    case 'STABLE':        return +(0.01 + r * 0.005).toFixed(3)
    case 'FATIGUED':      return -(0.05 + r * 0.005).toFixed(3)
    case 'COLLAPSE_RISK': return -(0.10 + r * 0.006).toFixed(3)
  }
}

function computeSleep(state: PlayerState, entropy: number): number {
  const r = entropy % 10
  switch (state) {
    case 'HOT':           return +(0.2 + r * 0.04).toFixed(1)
    case 'STABLE':        return +(0.7 + r * 0.05).toFixed(1)
    case 'FATIGUED':      return +(1.2 + r * 0.08).toFixed(1)
    case 'COLLAPSE_RISK': return +(2.0 + r * 0.09).toFixed(1)
  }
}

function toInitials(name: string): string {
  const parts = name.replace(/'/g, '').split(/[\s.]+/).filter(Boolean)
  return parts.map(p => p[0]).join('').toUpperCase().slice(0, 3)
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Generates 2 key player rows for a given match side (home | away).
 * Real names can only come from fresh live or fresh cached roster data for the
 * exact league + teamCode. Missing/stale data uses neutral placeholders.
 */
export function generateSimulatedPlayers(
  match: Match,
  side: 'home' | 'away',
): KeyPlayer[] {
  const team = match[side]
  const tc = normalizeCode(team.abbr)
  const league = normalizeLeague(match.league)
  const resolved = resolvePlayerPool(league, tc)
  const rankedPlayers = rankKeyPlayers(resolved.players, league, tc, String(match.id))

  return [0, 1].map((idx) => {
    const stateSeed = `${match.id}::${league}::${tc}::state::${idx}`
    const entropySeed = `${match.id}::${league}::${tc}::entropy::${idx}`
    const player = rankedPlayers[idx % rankedPlayers.length]
    const name = player.name
    const state = STATES[djb2(stateSeed) % 4]
    const entropy = djb2(entropySeed)

    return {
      name,
      initials: toInitials(name),
      pos:      `KEY PLAYER`,
      hrv:      computeHrv(state, entropy),
      sleep:    computeSleep(state, entropy),
      flag:     STATE_TO_FLAG[state],
      _state:       state,
      _reason:      STATE_REASON[state],
      _coachAction: STATE_COACH_ACTION[state],
      _source:      resolved.source,
      _importanceScore: importanceScore(player, league, tc, String(match.id)),
    } as KeyPlayer & {
      _state: PlayerState
      _reason: string
      _coachAction: string
      _source: PlayerSource
      _importanceScore: number
    }
  })
}

export function getSimulatedReason(p: KeyPlayer): string | null {
  return (p as any)._reason ?? null
}

export function getSimulatedCoachAction(p: KeyPlayer): string | null {
  return (p as any)._coachAction ?? null
}

export function getPlayerSource(p: KeyPlayer): PlayerSource | null {
  return (p as any)._source ?? null
}

export function getPlayerImportanceScore(p: KeyPlayer): number | null {
  return (p as any)._importanceScore ?? null
}

export function isSimulatedPlayer(p: KeyPlayer): boolean {
  const source = getPlayerSource(p)
  return source === 'live_roster_provider'
    || source === 'cached_team_roster'
    || source === 'simulated_player_state_team_placeholder'
}
