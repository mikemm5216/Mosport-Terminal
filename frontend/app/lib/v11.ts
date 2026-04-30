import type { Match, League, TacticalLabel, KeyPlayer } from '../data/mockData'
import {
  generateSimulatedPlayers,
  getPlayerImportanceScore,
  getPlayerSource,
  isRosterPlaceholder,
} from './playerReadiness'

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

export const V11_LABEL_MAP: Record<string, TacticalLabel> = {
  STRONG: 'HIGH_CONFIDENCE',
  UPSET: 'OUTLIER_POTENTIAL',
  WEAK: 'UNCERTAIN',
  CHAOS: 'VULNERABILITY',
}

export function actionLabel(action: V11Decision['action'], homeAbbr: string, awayAbbr: string): string {
  switch (action) {
    case 'LEAN_HOME':
      return `ATTACK MISMATCH // ${homeAbbr}`
    case 'LEAN_AWAY':
      return `ATTACK MISMATCH // ${awayAbbr}`
    case 'WATCH_UPSET':
      return 'ADJUST ROTATION // PRESSURE'
    case 'AVOID_HIGH_VOLATILITY':
      return 'KEEP LINEUP // READ NEXT SHIFT'
    case 'NO_ACTION':
      return 'KEEP LINEUP // NO FORCED CHANGE'
  }
}

const SPORT_MAP: Record<League, string> = {
  MLB: 'baseball',
  NBA: 'basketball',
  EPL: 'soccer',
  UCL: 'soccer',
  NHL: 'hockey',
}

type V11PlayerContextItem = {
  name: string
  team: string
  side: 'home' | 'away'
  role: string
  readiness_flag: KeyPlayer['flag']
  hrv_delta: number
  sleep_debt: number
  source: string | null
  placeholder: boolean
  importance_score: number | null
}

function toV11PlayerContextItem(
  player: KeyPlayer,
  side: 'home' | 'away',
  teamCode: string,
): V11PlayerContextItem {
  return {
    name: player.name,
    team: teamCode,
    side,
    role: player.pos,
    readiness_flag: player.flag,
    hrv_delta: player.hrv,
    sleep_debt: player.sleep,
    source: getPlayerSource(player),
    placeholder: isRosterPlaceholder(player),
    importance_score: getPlayerImportanceScore(player),
  }
}

function buildPlayerContext(m: Match) {
  const awayPlayers = generateSimulatedPlayers(m, 'away')
  const homePlayers = generateSimulatedPlayers(m, 'home')
  const keyPlayers = [
    ...awayPlayers.map((p) => toV11PlayerContextItem(p, 'away', m.away.abbr)),
    ...homePlayers.map((p) => toV11PlayerContextItem(p, 'home', m.home.abbr)),
  ]

  const usableRealPlayers = keyPlayers.filter((p) => !p.placeholder)
  const rosterRiskByTeam = keyPlayers.reduce<Record<string, number>>((acc, player) => {
    const fatigueLoad = Math.min(1, Math.abs(player.hrv_delta) * 2.5 + player.sleep_debt / 4)
    acc[player.team] = Math.max(acc[player.team] ?? 0, Number(fatigueLoad.toFixed(3)))
    return acc
  }, {})

  return {
    source: usableRealPlayers.length > 0 ? 'player_readiness_resolved' : 'placeholder_only',
    key_players: keyPlayers,
    roster_risk: rosterRiskByTeam,
  }
}

export function matchToV11Input(m: Match, recoveryOverride?: number) {
  const rec = recoveryOverride ?? m.recovery_away
  const mismatch = parseFloat(
    Math.min(1, Math.max(0, (rec - m.recovery_home) * 2.5 + Math.max(0, m.baseline_win - 0.5) * 3)).toFixed(2),
  )
  const volatility = parseFloat(Math.min(0.69, m.matchup_complexity).toFixed(2))
  const playerContext = buildPlayerContext(m)
  const rosterRiskValues = Object.values(playerContext.roster_risk)
  const rosterRisk = rosterRiskValues.length
    ? parseFloat((rosterRiskValues.reduce((sum, risk) => sum + risk, 0) / rosterRiskValues.length).toFixed(2))
    : 0

  return {
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
      roster_risk: rosterRisk,
    },
    player_context: playerContext,
    tags: [m.status === 'LIVE' ? 'live' : m.status === 'FINAL' ? 'final' : 'pre_game'],
  }
}

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
