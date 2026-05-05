import { PregameFeatureSet } from "../../../types/features";
import { WorldEngineState } from "../../../types/world";
import { buildInsufficientDataWorldState } from "../../engine/engineStatus";

export function deriveEPLWorldState(features: PregameFeatureSet): WorldEngineState {
  if (!features.epl) {
    return buildInsufficientDataWorldState(features, ["MISSING_FIXTURE_CONTEXT"]);
  }

  const { epl, teamContext } = features;

  return {
    matchId: features.matchId,
    league: "EPL",
    sport: "SOCCER",
    engineStatus: "READY",
    evidenceStatus: "VALIDATED",
    missingEvidence: [],
    pressure: epl.pressResistance ?? 0.5,
    fatigue: epl.fixtureCongestion ?? 0.5,
    volatility: epl.defensiveLineRisk ?? 0.5,
    momentum: teamContext.home.recentFormScore ?? 0.5,
    mismatch: epl.strikerForm ?? 0.5,
    sportSpecific: {
      midfieldControl: epl.midfieldControl ?? 0.5,
      setPieceRisk: epl.setPieceRisk ?? 0.5,
    },
    coachEvidence: [
      {
        label: "Fixture Congestion",
        valueLabel: epl.fixtureCongestion && epl.fixtureCongestion > 0.7 ? "CRITICAL" : "MANAGEABLE",
        severity: "MEDIUM",
        explanation: "Evaluating fatigue levels from recent fixture density.",
        source: "WORLD_ENGINE",
      }
    ],
    generatedAt: new Date().toISOString(),
  };
}
