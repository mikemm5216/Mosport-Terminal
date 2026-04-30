/**
 * playerReadiness.ts — Deterministic simulated key player state helper
 *
 * Generates impact-based player rows per match using team-scoped fallback pools.
 * All output is deterministic via djb2 hash — no Math.random().
 * No real biometric claims and no real-time roster telemetry claims.
 *
 * Critical identity rule:
 * Do not use league-wide player name pools. A generated player must be selected
 * from TEAM_PLAYER_POOL[league][teamCode]. Missing pools use neutral placeholders.
 */

import type { Match, KeyPlayer, ReadinessFlag } from '../data/mockData'

type League = string
type TeamCode = string
type PlayerSource = 'simulated_player_state' | 'simulated_player_state_team_placeholder'

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

function buildTeamSpecificPool(
  teamCodes: readonly TeamCode[],
  roles: readonly string[],
): Record<TeamCode, readonly string[]> {
  return Object.fromEntries(
    teamCodes.map((teamCode) => [
      teamCode,
      roles.map((role) => `${teamCode} ${role}`),
    ]),
  )
}

const NBA_TEAM_CODES = [
  'ATL', 'BOS', 'BKN', 'CHA', 'CHI', 'CLE', 'DAL', 'DEN', 'DET', 'GSW',
  'HOU', 'IND', 'LAC', 'LAL', 'MEM', 'MIA', 'MIL', 'MIN', 'NOP', 'NYK',
  'OKC', 'ORL', 'PHI', 'PHX', 'POR', 'SAC', 'SAS', 'TOR', 'UTA', 'WAS',
] as const

const MLB_TEAM_CODES = [
  'ARI', 'ATL', 'BAL', 'BOS', 'CHC', 'CWS', 'CIN', 'CLE', 'COL', 'DET',
  'HOU', 'KC', 'LAA', 'LAD', 'MIA', 'MIL', 'MIN', 'NYM', 'NYY', 'OAK',
  'PHI', 'PIT', 'SD', 'SEA', 'SF', 'STL', 'TB', 'TEX', 'TOR', 'WSH',
] as const

// ── Team-scoped fallback player pools ─────────────────────────────────────────
// These are team-safe simulated labels, not live roster data.
// Real player names must only be introduced here when verified for that exact team.
export const TEAM_PLAYER_POOL: Record<League, Record<TeamCode, readonly string[]>> = {
  NBA: buildTeamSpecificPool(NBA_TEAM_CODES, ['Key Guard', 'Key Forward', 'Rotation Player']),
  MLB: buildTeamSpecificPool(MLB_TEAM_CODES, ['Starting Pitcher', 'Relief Arm', 'Rotation Player']),
}

const TEAM_PLACEHOLDERS: Record<League, readonly string[]> = {
  NBA: ['Key Guard', 'Key Forward', 'Rotation Player'],
  MLB: ['Starting Pitcher', 'Relief Arm', 'Rotation Player'],
  NHL: ['Top Line Forward', 'Blue Line Defender', 'Rotation Player'],
  EPL: ['Key Forward', 'Key Midfielder', 'Rotation Player'],
  UCL: ['Key Forward', 'Key Midfielder', 'Rotation Player'],
}

const DEFAULT_PLACEHOLDERS = ['Key Guard', 'Key Forward', 'Rotation Player'] as const

function getTeamPool(league: League, teamCode: TeamCode): readonly string[] | null {
  return TEAM_PLAYER_POOL[league]?.[teamCode] ?? null
}

function getPlaceholderPool(league: League): readonly string[] {
  return TEAM_PLACEHOLDERS[league] ?? DEFAULT_PLACEHOLDERS
}

function resolvePlayerName(
  league: League,
  teamCode: TeamCode,
  seed: string,
): { name: string; source: PlayerSource; pool: readonly string[] } {
  const teamPool = getTeamPool(league, teamCode)
  if (teamPool?.length) {
    return {
      name: pick(teamPool, seed),
      source: 'simulated_player_state_team_placeholder',
      pool: teamPool,
    }
  }

  const placeholderPool = getPlaceholderPool(league)
  return {
    name: pick(placeholderPool, seed),
    source: 'simulated_player_state_team_placeholder',
    pool: placeholderPool,
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
 * Selection is team-scoped: TEAM_PLAYER_POOL[league][teamCode] only.
 * Missing team pools use neutral placeholders. No cross-team famous names.
 */
export function generateSimulatedPlayers(
  match: Match,
  side: 'home' | 'away',
): KeyPlayer[] {
  const team   = match[side]
  const tc     = normalizeCode(team.abbr)
  const league = String(match.league)

  return [0, 1].map((idx) => {
    const nameSeed    = `${match.id}::${league}::${tc}::name::${idx}`
    const stateSeed   = `${match.id}::${league}::${tc}::state::${idx}`
    const entropySeed = `${match.id}::${league}::${tc}::entropy::${idx}`

    const resolved = resolvePlayerName(league, tc, nameSeed)
    let name = resolved.name

    // Keep the two rows distinct without leaving the team-scoped pool.
    if (idx === 1) {
      const alt = pick(resolved.pool, `${nameSeed}::alt`)
      if (alt !== name) name = alt
      else name = resolved.pool[(djb2(nameSeed) + 1) % resolved.pool.length]
    }

    const state   = STATES[djb2(stateSeed) % 4]
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

export function isSimulatedPlayer(p: KeyPlayer): boolean {
  const source = (p as any)._source
  return source === 'simulated_player_state'
    || source === 'simulated_player_state_team_placeholder'
}
