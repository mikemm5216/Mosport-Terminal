import type { Match, League, TacticalLabel } from '../data/mockData'
import { generateSimulatedPlayers } from './playerReadiness'

// ── V11 Response types (unchanged — DO NOT break these) ───────────────────────

export interface V11Opinion {
  agent: string
  lean: 'HOME' | 'AWAY' | 'NO_EDGE'
  confidence: number
  reasoning: string
  features_used: string[]
}

export interface V11Decision {
  game_id: string
  final_probability_home: number
  market_home_prob: number
  decision_score: number
  label: 'STRONG' | 'UPSET' | 'WEAK' | 'CHAOS'
  action: 'LEAN_HOME' | 'LEAN_AWAY' | 'WATCH_UPSET' | 'AVOID_HIGH_VOLATILITY' | 'NO_ACTION'
  edge_vs_market: number
  dominant_agent: 'SHARP' | 'ANALYST' | 'HYBRID'
  explanation: string
  opinions: V11Opinion[]
}

// ── V12 input types (frontend-side only) ─────────────────────────────────────

export interface V12PlayerState {
  name: string
  team: string
  side: 'home' | 'away'
  role: string
  source: string
  placeholder: boolean
  importance_score: number
  physical: {
    recovery: number
    fatigue: number
    sleep_debt: number
    hrv_delta: number
    collapse_risk: number
  }
  psychological: {
    confidence: number
    pressure_response: number
    volatility: number
    clutch_stability: number
    tilt_risk: number
  }
  readiness: {
    flag: 'CLEAR' | 'MONITOR' | 'REST'
    minutes_risk: number
    collapse_risk: number
  }
}

export interface V12TeamState {
  team: string
  side: 'home' | 'away'
  physical_load: number
  mental_pressure: number
  rotation_risk: number
  star_dependency: number
  bench_fragility: number
  collapse_probability: number
  key_player_count: number
  placeholder_count: number
  data_confidence: number
}

export interface V12MatchupContext {
  player_edges: Record<string, unknown>
  unit_edges: Record<string, unknown>
  zone_edges: Record<string, unknown>
}

// ── Static helpers ─────────────────────────────────────────────────────────────

export const V11_LABEL_MAP: Record<string, TacticalLabel> = {
  STRONG: 'HIGH_CONFIDENCE',
  UPSET: 'OUTLIER_POTENTIAL',
  WEAK: 'UNCERTAIN',
  CHAOS: 'VULNERABILITY',
}

export function actionLabel(action: V11Decision['action'], homeAbbr: string, awayAbbr: string): string {
  switch (action) {
    case 'LEAN_HOME':             return `ATTACK MISMATCH // ${homeAbbr}`
    case 'LEAN_AWAY':             return `ATTACK MISMATCH // ${awayAbbr}`
    case 'WATCH_UPSET':           return 'ADJUST ROTATION // PRESSURE'
    case 'AVOID_HIGH_VOLATILITY': return 'KEEP LINEUP // READ NEXT SHIFT'
    case 'NO_ACTION':             return 'KEEP LINEUP // NO FORCED CHANGE'
  }
}

const SPORT_MAP: Record<League, string> = {
  MLB: 'baseball',
  NBA: 'basketball',
  EPL: 'soccer',
  UCL: 'soccer',
  NHL: 'hockey',
}

// ── V12 Player State builder ──────────────────────────────────────────────────

function buildPlayerStatesV12(m: Match): { home: V12PlayerState[]; away: V12PlayerState[] } {
  const toV12 = (kp: ReturnType<typeof generateSimulatedPlayers>[0], side: 'home' | 'away', team: string): V12PlayerState => {
    const hrv = kp.hrv ?? 0
    const sleep = kp.sleep ?? 0.8
    const flag = kp.flag ?? 'CLEAR'
    const collapseRisk = flag === 'REST' ? 0.55 : flag === 'MONITOR' ? 0.35 : 0.2
    const recovery = hrv >= 0 ? Math.min(1, 0.7 + hrv) : Math.max(0, 0.7 + hrv)
    return {
      name: kp.name,
      team,
      side,
      role: kp.pos ?? 'KEY PLAYER',
      source: (kp as any)._source ?? 'simulated_player_state',
      placeholder: true,
      importance_score: 0.5,
      physical: {
        recovery,
        fatigue: parseFloat((1 - recovery).toFixed(2)),
        sleep_debt: sleep,
        hrv_delta: hrv,
        collapse_risk: collapseRisk,
      },
      psychological: {
        confidence: hrv >= 0 ? 0.62 : 0.42,
        pressure_response: 0.55,
        volatility: 0.45,
        clutch_stability: 0.50,
        tilt_risk: flag === 'REST' ? 0.55 : 0.25,
      },
      readiness: {
        flag,
        minutes_risk: collapseRisk * 0.6,
        collapse_risk: collapseRisk,
      },
    }
  }

  const homePlayers = generateSimulatedPlayers(m, 'home')
  const awayPlayers = generateSimulatedPlayers(m, 'away')

  return {
    home: homePlayers.map(p => toV12(p, 'home', m.home.abbr)),
    away: awayPlayers.map(p => toV12(p, 'away', m.away.abbr)),
  }
}

// ── V12 Team State builder (Step E — teamStateEngine logic inlined) ───────────

function buildTeamStateV12(
  players: V12PlayerState[],
  side: 'home' | 'away',
  teamAbbr: string,
): V12TeamState {
  const count = players.length
  if (count === 0) {
    return {
      team: teamAbbr, side,
      physical_load: 0.4, mental_pressure: 0.5, rotation_risk: 0.3,
      star_dependency: 0.5, bench_fragility: 0.4, collapse_probability: 0.35,
      key_player_count: 0, placeholder_count: 0, data_confidence: 0.3,
    }
  }

  const avgRecovery = players.reduce((s, p) => s + p.physical.recovery, 0) / count
  const avgCollapse = players.reduce((s, p) => s + p.physical.collapse_risk, 0) / count
  const avgConfidence = players.reduce((s, p) => s + p.psychological.confidence, 0) / count
  const placeholderCount = players.filter(p => p.placeholder).length
  const dataConfidence = parseFloat((1 - placeholderCount / count * 0.7).toFixed(2))

  return {
    team: teamAbbr,
    side,
    physical_load: parseFloat((1 - avgRecovery).toFixed(2)),
    mental_pressure: parseFloat((1 - avgConfidence).toFixed(2)),
    rotation_risk: parseFloat(Math.min(0.8, avgCollapse * 1.2).toFixed(2)),
    star_dependency: count <= 2 ? 0.7 : 0.45,
    bench_fragility: parseFloat((0.3 + placeholderCount * 0.1).toFixed(2)),
    collapse_probability: parseFloat(avgCollapse.toFixed(2)),
    key_player_count: count - placeholderCount,
    placeholder_count: placeholderCount,
    data_confidence: dataConfidence,
  }
}

// ── Main input builder ────────────────────────────────────────────────────────

/**
 * Builds V11 + V12 payload for /api/organism.
 * V11 fields are always present and unchanged.
 * V12 fields (player_states, team_states, matchup_context, new signals)
 * are appended additively.
 */
export function matchToV11Input(m: Match, recoveryOverride?: number) {
  const rec = recoveryOverride ?? m.recovery_away
  const mismatch = parseFloat(
    Math.min(1, Math.max(0, (rec - m.recovery_home) * 2.5 + Math.max(0, m.baseline_win - 0.5) * 3)).toFixed(2),
  )
  const volatility = parseFloat(Math.min(0.69, m.matchup_complexity).toFixed(2))

  // V12: build player + team context
  const playerStates = buildPlayerStatesV12(m)
  const homeTeamState = buildTeamStateV12(playerStates.home, 'home', m.home.abbr)
  const awayTeamState = buildTeamStateV12(playerStates.away, 'away', m.away.abbr)

  // V12 aggregate signals derived from team states
  const rosterRisk = parseFloat(
    ((homeTeamState.collapse_probability + awayTeamState.collapse_probability) / 2).toFixed(2)
  )
  const teamCollapseRisk = parseFloat(
    Math.max(homeTeamState.collapse_probability, awayTeamState.collapse_probability).toFixed(2)
  )
  const playerLeverage = parseFloat(
    ((homeTeamState.star_dependency + awayTeamState.star_dependency) / 2).toFixed(2)
  )

  return {
    // ── V11 fields (unchanged) ─────────────────────────────────────────────
    game_id: m.id,
    sport: SPORT_MAP[m.league],
    home_team: m.home.name,
    away_team: m.away.name,
    market_home_prob: m.baseline_win,
    signals: {
      pressure: volatility,
      fatigue: parseFloat((1 - rec).toFixed(2)),
      volatility,
      momentum: 0.5,
      mismatch,
      // V12 aggregate signals in signals envelope
      roster_risk: rosterRisk,
      team_collapse_risk: teamCollapseRisk,
      player_leverage: playerLeverage,
    },
    tags: [m.status === 'LIVE' ? 'live' : m.status === 'FINAL' ? 'final' : 'pre_game'],

    // ── V12 additive fields ────────────────────────────────────────────────
    player_states: playerStates,
    team_states: {
      home: homeTeamState,
      away: awayTeamState,
    },
    matchup_context: {
      player_edges: {},
      unit_edges: {},
      zone_edges: {},
    },
  }
}

// ── Message builder (unchanged) ───────────────────────────────────────────────

export function buildV11Message(v11: V11Decision, homeAbbr: string, awayAbbr: string): string {
  const analyst = v11.opinions.find((o) => o.agent === 'AnalystAgent')
  const sharp = v11.opinions.find((o) => o.agent === 'SharpAgent')

  const dominantLabel: Record<string, string> = {
    SHARP: 'Rotation read overrides baseline read.',
    ANALYST: 'Baseline read leads the coach view.',
    HYBRID: 'Coach Mode is in hybrid consensus.',
  }

  const parts = [
    dominantLabel[v11.dominant_agent] ?? '',
    analyst
      ? ` Analyst read: ${analyst.lean} @ ${(analyst.confidence * 100).toFixed(0)}% // "${analyst.reasoning.split('.')[0]}."`
      : '',
    sharp
      ? ` Rotation read: ${sharp.lean} @ ${(sharp.confidence * 100).toFixed(0)}% // "${sharp.reasoning.split('.')[0]}."`
      : '',
    ` Coach Mode read: ${homeAbbr} game control ${(v11.final_probability_home * 100).toFixed(1)}% vs baseline ${(v11.market_home_prob * 100).toFixed(1)}%.`,
    ` Team State swing: ${v11.edge_vs_market >= 0 ? '+' : ''}${(v11.edge_vs_market * 100).toFixed(1)}%.`,
    ` >> ${actionLabel(v11.action, homeAbbr, awayAbbr)}.`,
  ]

  return parts.join('')
}
