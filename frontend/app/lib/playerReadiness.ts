/**
 * playerReadiness.ts — Deterministic key player identity/readiness helper
 *
 * Responsibility boundary:
 * - Owns roster identity freshness: live roster -> cached roster -> safe placeholder.
 * - Owns display readiness formatting for KeyPlayer cards.
 * - Does NOT own tactical matchup scoring. That belongs to keyPlayerEngine.ts.
 *
 * Critical trust rules:
 * - Never use league-wide player name pools.
 * - Never assign a real player unless it came from that exact team's roster store.
 * - Never display a position/role as if it were a player name.
 * - Missing/stale roster data must fall back to explicit non-player placeholders.
 */

import type { Match, KeyPlayer, ReadinessFlag } from '../data/mockData'
import {
  rankKeyPlayers,
  type AvailabilityStatus,
  type KeyPlayerEngineInput,
} from './engines/keyPlayerEngine'

type League = string
type TeamCode = string

type PlayerSource =
  | 'live_roster_provider'
  | 'cached_team_roster'
  | 'mock_seeded_team_roster'
  | 'simulated_player_state_team_placeholder'

type ProviderRosterPlayer = {
  name: string
  position?: string
  isStarter?: boolean
  projectedMinutes?: number
  usageRate?: number
  depthRank?: number
  availability?: AvailabilityStatus
}

type RosterEntry = KeyPlayerEngineInput & {
  updatedAtMs: number
  isPlaceholder?: boolean
}

type TeamRosterStore = Record<League, Record<TeamCode, readonly RosterEntry[]>>

const LIVE_ROSTER_MAX_AGE_MS = 15 * 60 * 1000
const CACHED_ROSTER_MAX_AGE_MS = 24 * 60 * 60 * 1000

// Provider-backed stores. Empty by default; hydrate from a roster provider/crawler.
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

const PLACEHOLDER_NAMES = ['Team Key Player', 'Team Rotation Player'] as const

function placeholderEntries(league: League, teamCode: TeamCode): readonly RosterEntry[] {
  return PLACEHOLDER_NAMES.map((name, idx) => ({
    name,
    league,
    teamCode,
    updatedAtMs: nowMs(),
    position: 'ROSTER_PENDING',
    depthRank: idx + 1,
    availability: 'UNKNOWN' as const,
    isPlaceholder: true,
  }))
}

type ResolvedPlayerPool = {
  players: readonly RosterEntry[]
  source: PlayerSource
}

function resolvePlayerPool(match: Match, side: 'home' | 'away', league: League, teamCode: TeamCode): ResolvedPlayerPool {
  const matchRoster = match.rosters?.[side]
  if (matchRoster && matchRoster.players.length > 0 && matchRoster.source !== 'unavailable') {
    return {
      players: toRosterEntries(league, teamCode, matchRoster.players, nowMs()),
      source: matchRoster.source,
    }
  }

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
  if (name === 'Team Key Player') return 'TKP'
  if (name === 'Team Rotation Player') return 'TRP'

  const parts = name.replace(/'/g, '').split(/[\s.]+/).filter(Boolean)
  return parts.map(p => p[0]).join('').toUpperCase().slice(0, 3)
}

function displayPosition(position: string | undefined, source: PlayerSource): string {
  if (source === 'simulated_player_state_team_placeholder') {
    return 'KEY PLAYER · ROSTER PENDING'
  }
  return position ? `${position} · KEY PLAYER` : 'KEY PLAYER'
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Generates 2 key player rows for a given match side (home | away).
 * Real names can only come from fresh live or fresh cached roster data for the
 * exact league + teamCode. Missing/stale data uses explicit non-player placeholders.
 */
export function generateSimulatedPlayers(
  match: Match,
  side: 'home' | 'away',
): KeyPlayer[] {
  const team = match[side]
  const opponent = match[side === 'home' ? 'away' : 'home']
  const tc = normalizeCode(team.abbr)
  const opponentCode = normalizeCode(opponent.abbr)
  const league = normalizeLeague(match.league)
  const resolved = resolvePlayerPool(match, side, league, tc)
  const rankedPlayers = rankKeyPlayers(resolved.players, {
    matchId: String(match.id),
    league,
    teamCode: tc,
    opponentTeamCode: opponentCode,
  })

  return [0, 1].map((idx) => {
    const stateSeed = `${match.id}::${league}::${tc}::state::${idx}`
    const entropySeed = `${match.id}::${league}::${tc}::entropy::${idx}`
    const player = rankedPlayers[idx % rankedPlayers.length]
    const state = STATES[djb2(stateSeed) % 4]
    const entropy = djb2(entropySeed)

    return {
      name: player.name,
      initials: toInitials(player.name),
      pos:      displayPosition(player.position, resolved.source),
      hrv:      computeHrv(state, entropy),
      sleep:    computeSleep(state, entropy),
      flag:     STATE_TO_FLAG[state],
      _state:       state,
      _reason:      STATE_REASON[state],
      _coachAction: STATE_COACH_ACTION[state],
      _source:      resolved.source,
      _importanceScore: player._importanceScore,
      _teamCode: tc,
      _opponentTeamCode: opponentCode,
    } as KeyPlayer & {
      _state: PlayerState
      _reason: string
      _coachAction: string
      _source: PlayerSource
      _importanceScore: number
      _teamCode: TeamCode
      _opponentTeamCode: TeamCode
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

export function isRosterPlaceholder(p: KeyPlayer): boolean {
  return (p as any)._source === 'simulated_player_state_team_placeholder'
}

export function isSimulatedPlayer(p: KeyPlayer): boolean {
  const source = getPlayerSource(p)
  return source === 'live_roster_provider'
    || source === 'cached_team_roster'
    || source === 'mock_seeded_team_roster'
    || source === 'simulated_player_state_team_placeholder'
}

export function isRosterBackedPlayer(p: KeyPlayer): boolean {
  const source = getPlayerSource(p)
  return source === 'live_roster_provider'
    || source === 'cached_team_roster'
    || source === 'mock_seeded_team_roster'
}
