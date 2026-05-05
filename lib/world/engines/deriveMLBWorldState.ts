import { PregameFeatureSet } from "../../../types/features";
import { WorldEngineState } from "../../../types/world";
import { buildInsufficientDataWorldState } from "../../engine/engineStatus";

export function deriveMLBWorldState(features: PregameFeatureSet): WorldEngineState {
  if (!features.mlb) {
    return buildInsufficientDataWorldState(features, ["MISSING_STARTING_PITCHER"]);
  }

  const { mlb, teamContext } = features;

  return {
    matchId: features.matchId,
    league: "MLB",
    sport: "BASEBALL",
    engineStatus: "READY",
    evidenceStatus: "VALIDATED",
    missingEvidence: [],
    pressure: mlb.lateInningLeverageRisk ?? 0.5,
    fatigue: mlb.bullpenFreshness ?? 0.5,
    volatility: mlb.thirdTimeThroughOrderRisk ?? 0.5,
    momentum: teamContext.home.recentFormScore ?? 0.5,
    mismatch: mlb.starterAdvantage ?? 0.5,
    sportSpecific: {
      parkFactor: mlb.parkFactor ?? 0.5,
      handednessSplit: mlb.handednessSplitAdvantage ?? 0.5,
      lineupQuality: mlb.lineupQuality ?? 0.5,
      defensiveStability: mlb.defensiveStability ?? 0.5,
    },
    coachEvidence: [
      {
        label: "Starter Advantage",
        valueLabel: mlb.starterAdvantage && mlb.starterAdvantage > 0.6 ? "STRONG" : "NEUTRAL",
        severity: "MEDIUM",
        explanation: "Evaluating starter vs opponent lineup and park factors.",
        source: "WORLD_ENGINE",
      }
    ],
    generatedAt: new Date().toISOString(),
  };
}
