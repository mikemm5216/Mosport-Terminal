import type { LiveDecisionAgentInput } from "../live-decision/types";
import type { ValidationReport } from "../validation/types";
import type { SimulationReport } from "../simulation/types";
import type { PlayerCoachAction, PlayerState } from "./player-state";

export type TeamState = "STABLE" | "UNDER_PRESSURE" | "COLLAPSING" | "ADVANTAGE";

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

  playerContext?: {
    players: Array<{
      playerId: string;
      playerName: string;
      teamCode: string;
      momentum: number;
      fatigue: number;
      pressure: number;
    }>;
  } | null;
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

  teamState: TeamState;

  worldState: {
    teamState: TeamState;
    currentWinChance: number;
    ifNoChangeWinChance: number;
    ifAdjustedWinChance: number;
    primaryRisk: string;
  };

  playerDecisions: Array<{
    playerId: string;
    playerName: string;
    state: PlayerState;
    coachAction: PlayerCoachAction;
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
