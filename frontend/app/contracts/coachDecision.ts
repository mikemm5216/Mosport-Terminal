export type CoachDecisionAction =
  // universal structure
  | 'KEEP_STRUCTURE'
  | 'NO_FORCED_CHANGE'
  | 'ADJUST_ROTATION'

  // universal player load
  | 'LIMIT_USAGE'
  | 'REST_KEY_PLAYER'
  | 'INCREASE_USAGE'

  // universal matchup/tactical
  | 'REASSIGN_MATCHUP'
  | 'TARGET_MATCHUP_EDGE'

  // MLB only
  | 'BULLPEN_ALERT'
  | 'PINCH_HIT_WINDOW'
  | 'DEFENSIVE_SUBSTITUTION'

  // NBA only
  | 'STAGGER_MINUTES'
  | 'PROTECT_PRIMARY_HANDLER'

  // NHL only
  | 'LINE_CHANGE_ALERT'
  | 'SHORTEN_SHIFTS'
  | 'GOALIE_PROTECTION'

  // EPL/UCL only
  | 'SUBSTITUTION_WINDOW'
  | 'PRESSING_ADJUSTMENT'
  | 'BLOCK_SHAPE_ADJUSTMENT'

export type CoachDecisionLevel =
  | 'INFO'
  | 'WATCH'
  | 'ACTION'
  | 'URGENT'

export type CoachDecision = {
  action: CoachDecisionAction
  level: CoachDecisionLevel
  target?: string
  summary: string
  rationale: string[]
  confidence: number
  sourceSignals: string[]
}
