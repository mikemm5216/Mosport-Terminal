import { AnalysisPhase, LiveStatus } from "./gameStatus";
import { TeamRef } from "./sports";

export type CoachDecisionType =
  | "CALL_TIMEOUT"
  | "BENCH_PLAYER"
  | "ATTACK_MISMATCH"
  | "DOUBLE_TEAM_STAR"
  | "SLOW_TEMPO"
  | "SPEED_UP"
  | "PROTECT_FOUL_TROUBLE"
  | "TRUST_BENCH"
  | "CHANGE_LINEUP"
  | "CHALLENGE_CALL"
  | "PLAY_SMALL"
  | "PLAY_BIG"
  | "PRESS_HIGH"
  | "DROP_COVERAGE"
  | "SWITCH_EVERYTHING"
  | "ROTATION_COMPRESSION"
  | "STARTER_LOAD_MANAGEMENT"
  | "TARGET_WEAK_DEFENDER"
  | "CONTROL_REBOUNDING"
  | "SET_PIECE_FOCUS"
  | "BULLPEN_TIMING"
  | "MIDFIELD_PRESS"
  | "PROTECT_LEAD"
  | "EARLY_AGGRESSION";

export type CoachEvidence = {
  label: string;
  valueLabel: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  explanation: string;
  source: "WORLD_ENGINE" | "VALIDATED_FACT" | "HISTORICAL_PATTERN" | "ROSTER_CONTEXT";
};

export type CoachReadDTO = {
  matchId: string;
  league: string;
  sport: string;
  analysisPhase: AnalysisPhase;

  generatedAt: string;
  lockedAt?: string;
  generatedBeforeStart: true;
  isPregameOnly: true;
  lockReason?: string;

  homeTeam: TeamRef;
  awayTeam: TeamRef;
  gameStatus: LiveStatus;

  coachQuestion: string;
  coachDecision: CoachDecisionType;
  coachRead: string;
  emotionalHook: string;
  whyItMatters: string[];
  worldEngineEvidence: CoachEvidence[];
  opposingView: string;
  fanPrompt: string;

  confidenceLabel: "LOW" | "MEDIUM" | "HIGH";
  debateIntensity: "QUIET" | "ACTIVE" | "HOT";

  engineStatus: "READY" | "PARTIAL" | "INSUFFICIENT_DATA" | "SKELETON_DISABLED";
  evidenceStatus: "VALIDATED" | "PARTIAL" | "MISSING";
  missingEvidence?: string[];
  noLeanReason?: string;
  isProductionEngine: boolean;
  engineVersion: string;
  featureVersion: string;
  translatorVersion: string;

  fanVoteSummary?: {
    agreePct: number;
    disagreePct: number;
    alternativePct: number;
    watchOnlyPct?: number;
    totalVotes: number;
  };

  sourcePredictionId?: string;
  sourceSignalIds?: string[];
  sourceWorldEngineSnapshotId?: string;
};

export type GameFollowDTO = {
  matchId: string;
  analysisPhase: "LIVE_FOLLOW_ONLY";
  liveStatus: LiveStatus;
  score: {
    home?: number;
    away?: number;
  };
  lockedCoachRead: CoachReadDTO;
  userPregameVote?: {
    stance: "AGREE" | "DISAGREE" | "ALTERNATIVE" | "WATCH_ONLY";
    confidence?: number;
  };
  fanVoteSummary?: CoachReadDTO["fanVoteSummary"];
  commentsEnabled: boolean;
  postgameVerdictPending: boolean;
};

export type PostgameVerdictDTO = {
  matchId: string;
  analysisPhase: "POSTGAME_VERDICT";
  lockedCoachReadId: string;
  result: "HIT" | "MISS" | "PARTIAL";
  verdictTitle: string;
  verdictExplanation: string;
  whatWeLearned: string[];
  fanVoteResult: {
    majorityStance: "AGREE" | "DISAGREE" | "ALTERNATIVE" | "WATCH_ONLY";
    wasMajorityRight?: boolean;
  };
  topKeyboardCoaches?: Array<{
    userId: string;
    displayName: string;
    reputationDelta: number;
  }>;
};
