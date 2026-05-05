import { PregameFeatureSet } from "../../../types/features";
import { WorldEngineState } from "../../../types/world";
import { buildInsufficientDataWorldState } from "../../engine/engineStatus";

export function deriveNBAWorldState(features: PregameFeatureSet): WorldEngineState {
  if (!features.nba) {
    return buildInsufficientDataWorldState(features, ["MISSING_ROSTER"]);
  }

  const { nba, teamContext } = features;

  return {
    matchId: features.matchId,
    league: "NBA",
    sport: "BASKETBALL",
    engineStatus: "READY",
    evidenceStatus: "VALIDATED",
    missingEvidence: [],
    pressure: nba.pacePressure ?? 0.5,
    fatigue: teamContext.home.travelFatigue ?? 0.5,
    volatility: nba.rotationRisk ?? 0.5,
    momentum: teamContext.home.recentFormScore ?? 0.5,
    mismatch: nba.matchupMismatch ?? 0.5,
    sportSpecific: {
      benchStability: nba.benchStability ?? 0.5,
      starLoad: nba.starLoad ?? 0.5,
      foulTroubleRisk: nba.foulTroubleRisk ?? 0.5,
    },
    coachEvidence: [
      {
        label: "Rotation Risk",
        valueLabel: nba.rotationRisk && nba.rotationRisk > 0.7 ? "HIGH" : "NORMAL",
        severity: nba.rotationRisk && nba.rotationRisk > 0.7 ? "HIGH" : "LOW",
        explanation: "Analysis of rotation compression and bench unit stability.",
        source: "WORLD_ENGINE",
      }
    ],
    generatedAt: new Date().toISOString(),
  };
}
