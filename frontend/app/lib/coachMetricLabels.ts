import type { League } from '../data/mockData'

export type Sport = 'BASEBALL' | 'BASKETBALL' | 'SOCCER' | 'HOCKEY'

export interface CoachMetricLabels {
  recovery: string      // Stat 1: aggregate readiness metric
  depth: string         // Stat 2: sport-specific depth/readiness label
  momentum: string      // Stat 3: always "MOMENTUM TREND"
  fatigue: string       // Stat 4: always "TRAVEL FATIGUE"
  depthFactor: string   // Causal factor label in MatchupGauge
}

// ── 球種 → labels ───────────────────────────────────────────────
const SPORT_LABELS: Record<Sport, CoachMetricLabels> = {
  BASEBALL: {
    recovery: 'AGGREGATE RECOVERY',
    depth: 'BULLPEN READINESS',
    momentum: 'MOMENTUM TREND',
    fatigue: 'TRAVEL FATIGUE',
    depthFactor: 'BULLPEN FATIGUE PENALTY',
  },
  BASKETBALL: {
    recovery: 'ROTATION READINESS',
    depth: 'BENCH ENERGY',
    momentum: 'MOMENTUM TREND',
    fatigue: 'TRAVEL FATIGUE',
    depthFactor: 'ROTATION DEPTH PENALTY',
  },
  SOCCER: {
    recovery: 'SQUAD FITNESS',
    depth: 'PRESSING INTENSITY',
    momentum: 'MOMENTUM TREND',
    fatigue: 'TRAVEL FATIGUE',
    depthFactor: 'SQUAD LOAD PENALTY',
  },
  HOCKEY: {
    recovery: 'LINE READINESS',
    depth: 'GOALIE STABILITY',
    momentum: 'MOMENTUM TREND',
    fatigue: 'TRAVEL FATIGUE',
    depthFactor: 'LINE FATIGUE PENALTY',
  },
}

// ── League → Sport mapper（新增 league 只改這裡）────────────────
const LEAGUE_TO_SPORT: Record<string, Sport> = {
  MLB: 'BASEBALL',
  NBA: 'BASKETBALL',
  WNBA: 'BASKETBALL',
  EPL: 'SOCCER',
  UCL: 'SOCCER',
  MLS: 'SOCCER',
  NHL: 'HOCKEY',
}

const DEFAULT_LABELS: CoachMetricLabels = {
  recovery: 'AGGREGATE RECOVERY',
  depth: 'BENCH READINESS',
  momentum: 'MOMENTUM TREND',
  fatigue: 'TRAVEL FATIGUE',
  depthFactor: 'DEPTH PENALTY',
}

export function leagueToSport(league: League | string): Sport | undefined {
  return LEAGUE_TO_SPORT[league]
}

export function getCoachMetricLabels(league: League | string): CoachMetricLabels {
  const sport = LEAGUE_TO_SPORT[league]
  return sport ? SPORT_LABELS[sport] : DEFAULT_LABELS
}
