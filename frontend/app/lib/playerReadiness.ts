/**
 * playerReadiness.ts — Deterministic simulated player state helper
 *
 * Generates KeyPlayer rows for any match without depending on KEY_PLAYERS map.
 * All output is deterministic: same inputs always produce same outputs.
 * No Math.random(). No real biometric claims.
 *
 * Source tag: "simulated_player_state"
 */

import type { Match, KeyPlayer, ReadinessFlag } from '../data/mockData'

// ── Deterministic hash ────────────────────────────────────────────────────────
function djb2(s: string): number {
  let h = 5381
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(33, h) ^ s.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

function hashSlice(seed: string, offset: number, range: number): number {
  return djb2(seed + String(offset)) % range
}

// ── State definitions ─────────────────────────────────────────────────────────
type PlayerState = 'HOT' | 'STABLE' | 'FATIGUED' | 'COLLAPSE_RISK'

const STATE_TO_FLAG: Record<PlayerState, ReadinessFlag> = {
  HOT:            'CLEAR',
  STABLE:         'CLEAR',
  FATIGUED:       'MONITOR',
  COLLAPSE_RISK:  'REST',
}

const STATE_REASON: Record<PlayerState, string> = {
  HOT:           'Rhythm is trending up and role impact is positive.',
  STABLE:        'Current workload looks manageable within the rotation.',
  FATIGUED:      'Workload pressure is rising; reduce minutes before rhythm drops.',
  COLLAPSE_RISK: 'Pressure and fatigue are combining into a lineup risk.',
}

// ── Role definitions ──────────────────────────────────────────────────────────
interface RoleConfig {
  name: (teamCode: string) => string
  initials: (teamCode: string) => string
  pos: string
}

const ROLES: RoleConfig[] = [
  {
    name: (tc) => `Captain · ${tc}`,
    initials: (tc) => tc.slice(0, 2).toUpperCase(),
    pos: 'ROSTER LEAD',
  },
  {
    name: () => 'Key Starter',
    initials: () => 'KS',
    pos: 'KEY STARTER',
  },
  {
    name: () => 'Rotation',
    initials: () => 'RT',
    pos: 'ROTATION',
  },
]

// ── HRV + sleep from state ───────────────────────────────────────────────────
function computeHrv(state: PlayerState, seed: string): number {
  const r = hashSlice(seed, 11, 10) // 0–9
  switch (state) {
    case 'HOT':           return +(0.06 + r * 0.009).toFixed(3)   // 0.06–0.141
    case 'STABLE':        return +(0.01 + r * 0.005).toFixed(3)   // 0.01–0.055
    case 'FATIGUED':      return -(0.05 + r * 0.005).toFixed(3)   // -0.05 to -0.095
    case 'COLLAPSE_RISK': return -(0.10 + r * 0.006).toFixed(3)   // -0.10 to -0.154
  }
}

function computeSleep(state: PlayerState, seed: string): number {
  const r = hashSlice(seed, 17, 10) // 0–9
  switch (state) {
    case 'HOT':           return +(0.2 + r * 0.04).toFixed(1)   // 0.2–0.56
    case 'STABLE':        return +(0.7 + r * 0.05).toFixed(1)   // 0.7–1.15
    case 'FATIGUED':      return +(1.2 + r * 0.08).toFixed(1)   // 1.2–1.92
    case 'COLLAPSE_RISK': return +(2.0 + r * 0.09).toFixed(1)   // 2.0–2.81
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Generates 3 KeyPlayer rows for a given match side (home | away).
 * Fully deterministic — no randomness.
 */
export function generateSimulatedPlayers(
  match: Match,
  side: 'home' | 'away',
): KeyPlayer[] {
  const team = match[side]
  const tc   = team.abbr

  return ROLES.map((role, i) => {
    const seed  = `${match.league}::${tc}::${match.id}::${i}`
    const stateIndex = hashSlice(seed, 7, 4) as 0 | 1 | 2 | 3
    const states: PlayerState[] = ['HOT', 'STABLE', 'FATIGUED', 'COLLAPSE_RISK']
    const state = states[stateIndex]

    return {
      name:     role.name(tc),
      initials: role.initials(tc),
      pos:      role.pos,
      hrv:      computeHrv(state, seed),
      sleep:    computeSleep(state, seed),
      flag:     STATE_TO_FLAG[state],
      // Extra meta for potential richer display — these are optional and
      // won't break KeyPlayer type since it only reads the above 5 fields
      _state:       state,
      _reason:      STATE_REASON[state],
      _source:      'simulated_player_state' as const,
    } as KeyPlayer & { _state: PlayerState; _reason: string; _source: string }
  })
}

/**
 * Returns the human-readable state reason for a simulated player.
 * Safe to call on any KeyPlayer — returns null if not simulated.
 */
export function getSimulatedReason(p: KeyPlayer): string | null {
  return (p as any)._reason ?? null
}

export function isSimulatedPlayer(p: KeyPlayer): boolean {
  return (p as any)._source === 'simulated_player_state'
}
