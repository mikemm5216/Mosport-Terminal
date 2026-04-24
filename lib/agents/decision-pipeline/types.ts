import type { LiveDecisionAgentInput } from "../live-decision/types";
import type { ValidationReport } from "../validation/types";
import type { SimulationReport } from "../simulation/types";

export type DecisionPipelineInput = {
  match: LiveDecisionAgentInput;

  validationContext?: Pick<
    ValidationReport,
    "overallAccuracy" | "upsetLift" | "decisionCoverage" | "calibrationScore"
  > | null;

  simulationContext?: Pick<
    SimulationReport,
    "projectedChampion" | "matchupResults" | "titleDistribution"
  > | null;
};

export type DecisionPipelineReport = {
  agent: "DecisionPipelineAgent";

  decision: {
    label: "STRONG" | "UPSET" | "CHAOS" | "WEAK" | "NONE";
    action: "LEAN_HOME" | "LEAN_AWAY" | "UPSET_WATCH" | "AVOID" | "NO_ACTION";
    confidence: number;
    explanation: string;
    drivers: string[];
  };

  validationContext: {
    overallAccuracy: number | null;
    upsetLift: number | null;
    decisionCoverage: number | null;
    calibrationScore: number | null;
    trustMultiplier: number;
  };

  simulationContext: {
    projectedChampionCode: string | null;
    championProbability: number | null;
    matchupConfidence: number | null;
  };

  worldState: {
    teamState: "stable" | "under_pressure" | "collapsing";
    currentWinChance: number;
    ifNoChangeWinChance: number;
    ifAdjustedWinChance: number;
    primaryRisk: string;
  };

  // Coach Mode v1 infers player decisions from team and rotation context.
  // True player-level actions require PlayerState / LineupState inputs in v2.
  playerDecisions: Array<{
    playerId: string;
    playerName: string;
    state: "hot" | "neutral" | "fatigued" | "collapse_risk";
    coachAction: "KEEP_ON" | "FEATURE_MORE" | "REDUCE_MINUTES" | "BENCH";
    reason: string;
  }>;

  lineupAction:
    | "KEEP_LINEUP"
    | "ADJUST_ROTATION"
    | "BENCH_PLAYER"
    | "ATTACK_MISMATCH";

  finalConfidence: number;
  decisionMode: "ATTACK" | "ADJUST" | "KEEP" | "BENCH";
  reason: string[];
  coachInsight: string;

  diagnostics: {
    confidenceBeforeAdjustment: number;
    confidenceAfterValidation: number;
    confidenceAfterSimulation: number;
    appliedAdjustments: string[];
    notes: string[];
  };
};
