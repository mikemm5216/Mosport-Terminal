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

  finalConfidence: number;

  recommendation: "ACT" | "WATCH" | "AVOID" | "NO_ACTION";

  diagnostics: {
    confidenceBeforeAdjustment: number;
    confidenceAfterValidation: number;
    confidenceAfterSimulation: number;
    appliedAdjustments: string[];
    notes: string[];
  };
};
