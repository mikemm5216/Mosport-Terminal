import { type Match, type KeyPlayer } from '../data/mockData'
import { isRosterPlaceholder, getPlayerSource } from './playerReadiness'
import { type CoachDecision, type CoachDecisionAction, type CoachDecisionLevel } from '../contracts/coachDecision'

export function buildCoachDecision(input: {
  match: Match
  homePlayers: KeyPlayer[]
  awayPlayers: KeyPlayer[]
  selectedSide?: 'home' | 'away'
  teamState?: {
    physical_load?: number
    mental_pressure?: number
    rotation_risk?: number
    star_dependency?: number
    bench_fragility?: number
    collapse_probability?: number
    key_player_count?: number
    placeholder_count?: number
    data_confidence?: number
  }
  v11Decision?: any
}): CoachDecision {
  const { match, homePlayers, awayPlayers, selectedSide = 'home' } = input
  const players = selectedSide === 'home' ? homePlayers : awayPlayers
  const league = match.league
  
  // Infer state if not provided
  const placeholderCount = players.filter(isRosterPlaceholder).length
  const totalCount = players.length
  const dataConfidence = input.teamState?.data_confidence ?? (placeholderCount / totalCount > 0.5 ? 0.35 : 0.75)
  
  const rotationRisk = input.teamState?.rotation_risk ?? (match.recovery_home < 0.6 ? 0.7 : 0.4)
  const benchFragility = input.teamState?.bench_fragility ?? 0.5
  const collapseProbability = input.teamState?.collapse_probability ?? (match.tactical_label === 'VULNERABILITY' ? 0.65 : 0.3)
  const starDependency = input.teamState?.star_dependency ?? 0.6
  const mentalPressure = input.teamState?.mental_pressure ?? 0.5
  const physicalLoad = input.teamState?.physical_load ?? 0.5

  // 1. Low confidence / placeholder-heavy
  if (dataConfidence < 0.4 || placeholderCount / totalCount >= 0.5) {
    return {
      action: 'NO_FORCED_CHANGE',
      level: 'WATCH',
      confidence: Math.round(dataConfidence * 100),
      summary: "Player-layer confidence is limited; avoid aggressive personnel changes without staff confirmation.",
      rationale: [
        "Roster signal may be placeholder-driven.",
        "Player-state confidence is capped.",
        "No reliable single-player directive is available."
      ],
      sourceSignals: ["DATA_CONFIDENCE_LOW", "PLACEHOLDER_DOMINANT"]
    }
  }

  // 2. High-risk real player
  const highRiskPlayer = players.find(p => !isRosterPlaceholder(p) && p.risk >= 0.75)
  if (highRiskPlayer) {
    const isUrgent = highRiskPlayer.risk >= 0.85
    return {
      action: isUrgent ? 'REST_KEY_PLAYER' : 'LIMIT_USAGE',
      level: isUrgent ? 'URGENT' : 'ACTION',
      target: highRiskPlayer.name,
      confidence: 85,
      summary: `Decision: ${isUrgent ? 'REST KEY PLAYER' : 'LIMIT USAGE'} — ${highRiskPlayer.name}. Elevated load signal suggests reducing exposure.`,
      rationale: [
        `${highRiskPlayer.name} load signal at ${Math.round(highRiskPlayer.risk * 100)}%.`,
        `Source: ${getPlayerSource(highRiskPlayer)}`,
        isUrgent ? "Risk concentration exceeds safety thresholds." : "Load management advised to prevent structural degradation."
      ],
      sourceSignals: ["PLAYER_RISK_ELEVATED", "BIOMETRIC_STRESS"]
    }
  }

  // 3. Sport-specific rules
  if (league === 'NBA') {
    const guard = players.find(p => !isRosterPlaceholder(p) && (p.pos?.includes('G') || p.pos?.includes('GUARD')) && p.risk >= 0.70)
    if (guard) {
      return {
        action: 'PROTECT_PRIMARY_HANDLER',
        level: 'ACTION',
        target: guard.name,
        confidence: 72,
        summary: `Decision: PROTECT PRIMARY HANDLER — ${guard.name}. Reduce continuous on-ball load and stagger creation minutes.`,
        rationale: [
          "Primary creator load elevated.",
          `Roster-backed source: ${getPlayerSource(guard)}`,
          "Bench fragility raises late-game exposure."
        ],
        sourceSignals: ["CREATOR_LOAD", "NBA_GUARD_ROTATION"]
      }
    }
    if (starDependency >= 0.70 && benchFragility >= 0.60) {
      return {
        action: 'STAGGER_MINUTES',
        level: 'ACTION',
        confidence: 65,
        summary: "Decision: STAGGER MINUTES. Stagger primary usage to reduce single-player dependency.",
        rationale: [
          "High dependency on starting unit detected.",
          "Bench fragility exceeds threshold.",
          "Staggered rotation reduces collapse probability."
        ],
        sourceSignals: ["BENCH_FRAGILITY", "STAR_DEPENDENCY"]
      }
    }
  }

  if (league === 'MLB') {
    const sp = players.find(p => !isRosterPlaceholder(p) && (p.pos?.includes('SP') || p.pos?.includes('STARTING PITCHER')) && p.risk >= 0.65)
    if (sp) {
      return {
        action: 'BULLPEN_ALERT',
        level: 'ACTION',
        target: sp.name,
        confidence: 78,
        summary: `Decision: BULLPEN ALERT — ${sp.name}. Prepare earlier bullpen coverage; starter load signal is elevated.`,
        rationale: [
          "Starting pitcher load signal elevated.",
          "Early exit probability increased.",
          "Rotation stress metrics suggest backup preparation."
        ],
        sourceSignals: ["SP_LOAD", "MLB_BULLPEN_READINESS"]
      }
    }
    if (rotationRisk >= 0.65) {
      return {
        action: 'BULLPEN_ALERT',
        level: 'WATCH',
        confidence: 70,
        summary: "Decision: BULLPEN ALERT. Starter or rotation stress is elevated.",
        rationale: ["Rotation risk signal elevated.", "Bullpen availability needs monitoring."],
        sourceSignals: ["ROTATION_STRESS"]
      }
    }
  }

  if (league === 'NHL') {
    const topForward = players.find(p => !isRosterPlaceholder(p) && (p.pos?.includes('C') || p.pos?.includes('LW') || p.pos?.includes('RW')) && p.risk >= 0.70)
    if (topForward) {
      return {
        action: 'SHORTEN_SHIFTS',
        level: 'ACTION',
        target: topForward.name,
        confidence: 74,
        summary: `Decision: SHORTEN SHIFTS — ${topForward.name}. Reduce shift exposure while preserving line structure.`,
        rationale: ["Top-line forward fatigue detected.", "Shift duration exceeding optimal load window."],
        sourceSignals: ["FORWARD_FATIGUE", "NHL_SHIFT_METRICS"]
      }
    }
    if (collapseProbability >= 0.60 && mentalPressure >= 0.60) {
      return {
        action: 'LINE_CHANGE_ALERT',
        level: 'ACTION',
        confidence: 68,
        summary: "Decision: LINE CHANGE ALERT. Adjust line matching to protect defensive structure.",
        rationale: ["Line matching risk detected.", "Protective defensive structure adjustment required."],
        sourceSignals: ["MATCHING_RISK"]
      }
    }
    if (collapseProbability >= 0.70) {
      return {
        action: 'GOALIE_PROTECTION',
        level: 'URGENT',
        confidence: 82,
        summary: "Decision: GOALIE PROTECTION. Reduce defensive exposure and prioritize structure around the crease.",
        rationale: ["High collapse probability detected.", "Crease exposure needs immediate mitigation."],
        sourceSignals: ["DEFENSIVE_EXPOSURE"]
      }
    }
  }

  if (league === 'EPL' || league === 'UCL') {
    const attacker = players.find(p => !isRosterPlaceholder(p) && (p.pos?.match(/F|FW|ST|LW|RW|M|AM/)) && p.risk >= 0.70)
    if (attacker) {
      return {
        action: 'SUBSTITUTION_WINDOW',
        level: 'ACTION',
        target: attacker.name,
        confidence: 71,
        summary: `Decision: SUBSTITUTION_WINDOW — ${attacker.name}. Prepare a managed substitution window before load degrades team structure.`,
        rationale: ["Attacker load signal elevated.", "Transition coverage risk detected."],
        sourceSignals: ["ATTACKER_LOAD", "SOCCER_SUB_WINDOW"]
      }
    }
    if (physicalLoad >= 0.65 && mentalPressure >= 0.55) {
      return {
        action: 'PRESSING_ADJUSTMENT',
        level: 'ACTION',
        confidence: 66,
        summary: "Decision: PRESSING ADJUSTMENT. Reduce or redirect pressing triggers to protect late-phase structure.",
        rationale: ["Pressing load exceeding threshold.", "Late-game structure protection required."],
        sourceSignals: ["PRESSING_LOAD"]
      }
    }
  }

  // 4. General tactical rules
  if (match.matchup_complexity > 0.75) {
    return {
      action: 'REASSIGN_MATCHUP',
      level: 'ACTION',
      confidence: 62,
      summary: "Decision: REASSIGN MATCHUP. Reassign coverage to reduce exposure against the opponent’s leverage point.",
      rationale: ["High matchup complexity detected.", "Leverage pocket requires reassignment."],
      sourceSignals: ["MATCHUP_COMPLEXITY"]
    }
  }
  
  if (match.matchup_complexity < 0.4 && physicalLoad < 0.55) {
    return {
      action: 'TARGET_MATCHUP_EDGE',
      level: 'INFO',
      confidence: 58,
      summary: "Decision: TARGET MATCHUP EDGE. Use the favorable matchup window without forcing a full structure change.",
      rationale: ["Favorable matchup window detected.", "Managed load supports tactical expansion."],
      sourceSignals: ["TACTICAL_EDGE"]
    }
  }

  // 5. Rotation stress without target
  if (rotationRisk >= 0.65 && benchFragility >= 0.55) {
    return {
      action: 'ADJUST_ROTATION',
      level: 'ACTION',
      target: "rotation unit",
      confidence: 64,
      summary: "Decision: ADJUST ROTATION. Rotation stress and bench fragility justify a controlled personnel adjustment.",
      rationale: ["Rotation stress exceeds threshold.", "Bench fragility indicates limited depth support."],
      sourceSignals: ["ROTATION_STRESS", "BENCH_FRAGILITY"]
    }
  }

  // 6. Stable structure
  return {
    action: 'KEEP_STRUCTURE',
    level: 'INFO',
    confidence: 90,
    summary: "Decision: KEEP STRUCTURE. Current player load and matchup profile do not justify a forced change.",
    rationale: ["Structure metrics within safety bounds.", "No urgent personnel alerts detected."],
    sourceSignals: ["STABLE_STRUCTURE"]
  }
}
