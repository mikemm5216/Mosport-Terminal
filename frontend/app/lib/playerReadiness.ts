/**
 * playerReadiness.ts — Deterministic simulated key player state helper
 *
 * Heartbeat: 2026-04-30T12:45:00Z
 *
 * Generates impact-based player rows per match using realistic name pools
 * per sport. All output is fully deterministic via djb2 hash — no Math.random().
 * No real biometric claims.
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

function pick<T>(pool: readonly T[], seed: string): T {
  return pool[djb2(seed) % pool.length]
}

// ── Player name pools (realistic per sport) ───────────────────────────────────
const PLAYER_POOLS: Record<string, readonly string[]> = {
  NBA: [
    'G. Curry',   'L. James',    'N. Jokic',     'G. Antetokounmpo', 'J. Tatum',
    'D. Mitchell','J. Embiid',   'K. Durant',    'T. Young',         'D. Lillard',
    'J. Morant',  'A. Davis',    'K. Thompson',  'B. Adebayo',       'P. George',
    'Z. LaVine',  'T. Haliburton','C. Cunningham','E. Gordon',        'J. Holiday',
  ],
  MLB: [
    'M. Betts',   'A. Judge',    'R. Acuña',     'F. Freeman',       'V. Guerrero',
    'J. Alvarez', 'G. Cole',     'S. Alcantara', 'P. Goldschmidt',   'M. Machado',
    'T. Turner',  'J. Ohtani',   'W. Franco',    'R. Devers',        'B. Woodruff',
    'F. Valdez',  'S. Strider',  'D. Cease',     'G. Kirby',         'M. Olson',
  ],
  EPL: [
    'E. Haaland', 'K. De Bruyne','M. Salah',     'H. Kane',          'B. Saka',
    'P. Foden',   'B. Fernandes','M. Rashford',  'R. James',         'T. Werner',
    'C. Palmer',  'J. Grealish', 'O. Watkins',   'M. Mount',         'R. Mahrez',
    'T. Alexander-Arnold',       'V. Díaz',      'A. Robertson',     'I. Gündogan','L. Dunk',
  ],
  UCL: [
    'K. Mbappé',  'J. Bellingham','V. Osimhen',  'L. Pedri',         'R. Lewandowski',
    'T. Müller',  'C. Pulisic',  'A. Griezmann', 'F. Valverde',      'V. Vinicius',
    'R. Benzema', 'N. Barella',  'P. Dybala',    'D. Mertens',       'H. Mkhitaryan',
    'A. Di María','S. Gnabry',   'J. Gavi',      'M. Camavinga',     'L. Hernández',
  ],
  NHL: [
    'C. McDavid', 'N. MacKinnon','A. Matthews',  'S. Crosby',        'D. Pastrnak',
    'A. Ovechkin','J. Draisaitl','M. Tkachuk',   'E. Lindholm',      'V. Tarasenko',
    'B. Tkachuk', 'J. Robertson','T. Hall',      'P. Kane',          'J. Toews',
    'R. O\'Reilly','K. Okposo',  'M. Scheifele', 'Z. Hyman',         'T. Barrie',
  ],
}

function getPool(league: string): readonly string[] {
  return PLAYER_POOLS[league] ?? PLAYER_POOLS['NBA']
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

// Match-specific feel, not generic templates
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

// ── HRV + sleep derived from state ────────────────────────────────────────────
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

// ── Initials from "G. Curry" → "GC" ─────────────────────────────────────────
function toInitials(name: string): string {
  const parts = name.replace(/'/g, '').split(/[\s.]+/).filter(Boolean)
  return parts
    .map(p => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 3)
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Generates 2 key player rows for a given match side (home | away).
 * Players are selected from a realistic name pool via deterministic hash.
 * Never produces "Captain", "Key Starter", or "Rotation" labels.
 */
export function generateSimulatedPlayers(
  match: Match,
  side: 'home' | 'away',
): KeyPlayer[] {
  const team   = match[side]
  const tc     = team.abbr
  const league = match.league
  const pool   = getPool(league)

  // Generate 2 key players per team
  return [0, 1].map((idx) => {
    const nameSeed   = `${match.id}::${tc}::name::${idx}`
    const stateSeed  = `${match.id}::${tc}::state::${idx}`
    const entropySeed = `${match.id}::${tc}::entropy::${idx}`

    // Pick a name — ensure the two players don't collide
    let name = pick(pool, nameSeed)
    if (idx === 1) {
      const alt = pick(pool, nameSeed + '::alt')
      if (alt !== name) name = alt
      else name = pool[(djb2(nameSeed) + 1) % pool.length]
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
      // Extra meta (optional, won't break KeyPlayer interface)
      _state:       state,
      _reason:      STATE_REASON[state],
      _coachAction: STATE_COACH_ACTION[state],
      _source:      'simulated_player_state' as const,
    } as KeyPlayer & {
      _state: PlayerState
      _reason: string
      _coachAction: string
      _source: string
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
  return (p as any)._source === 'simulated_player_state'
}
