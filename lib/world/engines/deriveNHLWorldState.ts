import { PregameFeatureSet } from "../../../types/features";
import { WorldEngineState } from "../../../types/world";
import { buildInsufficientDataWorldState } from "../../engine/engineStatus";

export function deriveNHLWorldState(features: PregameFeatureSet): WorldEngineState {
  if (!features.nhl) {
    return buildInsufficientDataWorldState(features, ["MISSING_GOALIE_STATUS"]);
  }

  const { nhl, teamContext } = features;

  return {
    matchId: features.matchId,
    league: "NHL",
    sport: "HOCKEY",
    engineStatus: "READY",
    evidenceStatus: "VALIDATED",
    missingEvidence: [],
    pressure: nhl.shotQualityEdge ?? 0.5,
    fatigue: nhl.backToBackFatigue ?? 0.5,
    volatility: nhl.specialTeamsEdge ?? 0.5,
    momentum: teamContext.home.recentFormScore ?? 0.5,
    mismatch: nhl.goalieAdvantage ?? 0.5,
    sportSpecific: {
      defensivePairingStability: nhl.defensivePairingStability ?? 0.5,
    },
    coachEvidence: [
      {
        label: "Goalie Advantage",
        valueLabel: nhl.goalieAdvantage && nhl.goalieAdvantage > 0.65 ? "ELITE" : "MODERATE",
        severity: "HIGH",
        explanation: "Evaluating netminder form and defensive pairing support.",
        source: "WORLD_ENGINE",
      }
    ],
    generatedAt: new Date().toISOString(),
  };
}
