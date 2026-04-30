import type { V12PlayerState, V12TeamState } from '../v11'

/**
 * Aggregates player states into team-level states.
 * Enforces the boundary between player evaluation and team impact analysis.
 */
export function buildTeamStateV12(
  players: V12PlayerState[],
  side: 'home' | 'away',
  teamAbbr: string,
): V12TeamState {
  const count = players.length
  if (count === 0) {
    return {
      team: teamAbbr,
      side,
      physical_load: 0.4,
      mental_pressure: 0.5,
      rotation_risk: 0.3,
      star_dependency: 0.5,
      bench_fragility: 0.4,
      collapse_probability: 0.35,
      key_player_count: 0,
      placeholder_count: 0,
      data_confidence: 0.3,
    }
  }

  const avgRecovery = players.reduce((s, p) => s + p.physical.recovery, 0) / count
  const avgCollapse = players.reduce((s, p) => s + p.physical.collapse_risk, 0) / count
  const avgConfidence = players.reduce((s, p) => s + p.psychological.confidence, 0) / count
  const placeholderCount = players.filter(p => p.placeholder).length
  const dataConfidence = parseFloat((1 - (placeholderCount / count) * 0.7).toFixed(2))

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
