/**
 * playerReadiness.ts — Deterministic key player state helper
 *
 * Final identity model:
 * 1. Fresh live roster snapshot by league + teamCode
 * 2. Fresh cached team roster by league + teamCode
 * 3. Neutral team-safe placeholder fallback
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

type RosterEntry = {
  name: string
  league: League
  teamCode: TeamCode
  updatedAtMs: number
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

function pick<T>(pool: readonly T[], seed: string): T {
  return pool[djb2(seed) % pool.length]
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

function isFresh(entry: RosterEntry, maxAgeMs: number, atMs = nowMs()): boolean {
  return Number.isFinite(entry.updatedAtMs)
    && entry.updatedAtMs > 0
    && atMs - entry.updatedAtMs <= maxAgeMs
}

function ensureLeagueBucket(store: TeamRosterStore, league: League): Record<TeamCode, readonly RosterEntry[]> {
  store[league] ??= {}
  return store[league]
}

function toRosterEntries(
  league: League,
  teamCode: TeamCode,
  names: readonly string[],
  updatedAtMs: number,
): readonly RosterEntry[] {
  return names
    .map((rawName) => String(rawName ?? '').trim())
    .filter(Boolean)
    .map((name) => ({ name, league, teamCode, updatedAtMs }))
}

/**
 * Hydrate the fresh live roster read model from a provider adapter.
 * The caller must pass only players belonging to the exact league + teamCode.
 */
export function upsertLiveTeamRoster(
  leagueInput: League,
  teamCodeInput: TeamCode,
  playerNames: readonly string[],
  updatedAtMs = nowMs(),
): void {
  const league = normalizeLeague(leagueInput)
  const teamCode = normalizeCode(teamCodeInput)
  if (!league || !teamCode) return

  ensureLeagueBucket(TEAM_PLAYER_POOL, league)[teamCode] = toRosterEntries(
    league,
    teamCode,
    playerNames,
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
  playerNames: readonly string[],
  updatedAtMs: number,
): void {
  const league = normalizeLeague(leagueInput)
  const teamCode = normalizeCode(teamCodeInput)
  if (!league || !teamCode) return

  ensureLeagueBucket(CACHED_TEAM_PLAYER_POOL, league)[teamCode] = toRosterEntries(
    league,
    teamCode,
    playerNames,
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
  names: readonly string[]
  source: PlayerSource
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
      names: liveRoster.map((entry) => entry.name),
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
      names: cachedRoster.map((entry) => entry.name),
      source: 'cached_team_roster',
    }
  }

  return {
    names: getPlaceholderPool(league),
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

  return [0, 1].map((idx) => {
    const nameSeed = `${match.id}::${league}::${tc}::name::${idx}`
    const stateSeed = `${match.id}::${league}::${tc}::state::${idx}`
    const entropySeed = `${match.id}::${league}::${tc}::entropy::${idx}`

    let name = pick(resolved.names, nameSeed)

    // Keep the two rows distinct without leaving the resolved team-scoped pool.
    if (idx === 1) {
      const alt = pick(resolved.names, `${nameSeed}::alt`)
      if (alt !== name) name = alt
      else name = resolved.names[(djb2(nameSeed) + 1) % resolved.names.length]
    }

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
    } as KeyPlayer & {
      _state: PlayerState
      _reason: string
      _coachAction: string
      _source: PlayerSource
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

export function isSimulatedPlayer(p: KeyPlayer): boolean {
  const source = getPlayerSource(p)
  return source === 'live_roster_provider'
    || source === 'cached_team_roster'
    || source === 'simulated_player_state_team_placeholder'
}
