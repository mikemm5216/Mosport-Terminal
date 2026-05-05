import { PregameFeatureSet } from "../../../types/features";
import { WorldEngineState } from "../../../types/world";
import { buildInsufficientDataWorldState } from "../../engine/engineStatus";

export function deriveNFLWorldState(features: PregameFeatureSet): WorldEngineState {
  if (!features.nfl) {
    return buildInsufficientDataWorldState(features, ["MISSING_QB_CONTEXT"]);
  }

  const { nfl, teamContext } = features;

  return {
    matchId: features.matchId,
    league: "NFL",
    sport: "FOOTBALL",
    engineStatus: "READY",
    evidenceStatus: "VALIDATED",
    missingEvidence: [],
    pressure: nfl.gameScriptPressure ?? 0.5,
    fatigue: teamContext.home.travelFatigue ?? 0.5,
    volatility: nfl.turnoverVolatility ?? 0.5,
    momentum: teamContext.home.recentFormScore ?? 0.5,
    mismatch: nfl.qbStability ?? 0.5,
    sportSpecific: {
      passRushMismatch: nfl.passRushMismatch ?? 0.5,
      offensiveLineHealth: nfl.offensiveLineHealth ?? 0.5,
      redZoneEdge: nfl.redZoneEdge ?? 0.5,
    },
    coachEvidence: [
      {
        label: "QB Stability",
        valueLabel: nfl.qbStability && nfl.qbStability > 0.7 ? "STABLE" : "RISKY",
        severity: "MEDIUM",
        explanation: "Evaluating quarterback health and offensive line protection.",
        source: "WORLD_ENGINE",
      }
    ],
    generatedAt: new Date().toISOString(),
  };
}
