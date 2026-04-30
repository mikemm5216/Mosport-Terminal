import type { League } from '../data/mockData'

export type CoachMetricLabels = {
  recovery: string
  readiness: string
  momentum: string
  fatigue: string
}

const LABELS: Record<League, CoachMetricLabels> = {
  MLB: {
    recovery: 'AGGREGATE RECOVERY',
    readiness: 'BULLPEN READINESS',
    momentum: 'MOMENTUM TREND',
    fatigue: 'TRAVEL FATIGUE',
  },
  NBA: {
    recovery: 'ROTATION READINESS',
    readiness: 'BENCH ENERGY',
    momentum: 'MOMENTUM TREND',
    fatigue: 'TRAVEL FATIGUE',
  },
  EPL: {
    recovery: 'SQUAD FITNESS',
    readiness: 'PRESSING INTENSITY',
    momentum: 'MOMENTUM TREND',
    fatigue: 'TRAVEL FATIGUE',
  },
  UCL: {
    recovery: 'SQUAD FITNESS',
    readiness: 'PRESSING INTENSITY',
    momentum: 'MOMENTUM TREND',
    fatigue: 'TRAVEL FATIGUE',
  },
  NHL: {
    recovery: 'LINE READINESS',
    readiness: 'GOALIE STABILITY',
    momentum: 'MOMENTUM TREND',
    fatigue: 'TRAVEL FATIGUE',
  },
}

export function getCoachMetricLabels(league: League): CoachMetricLabels {
  return LABELS[league]
}
