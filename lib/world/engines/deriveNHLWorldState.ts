import { PregameFeatureSet } from "../../../types/features";
import { WorldEngineState } from "../../../types/world";
import { buildInsufficientDataWorldState } from "../../engine/engineStatus";

export function deriveNHLWorldState(features: PregameFeatureSet): WorldEngineState {
  const missing: string[] = [];
  const { nhl, teamContext } = features;

  if (!nhl) missing.push("MISSING_GOALIE_STATUS");
  if (teamContext.home.recentFormScore === undefined) missing.push("MISSING_RECENT_FORM");
  
  if (missing.length > 0) {
    return buildInsufficientDataWorldState(features, missing as any);
  }

  const isPartial = !nhl?.goalieAdvantage || !nhl?.shotQualityEdge;

  return {
    matchId: features.matchId,
    league: "NHL",
    sport: "HOCKEY",
    engineStatus: isPartial ? "PARTIAL" : "READY",
    evidenceStatus: isPartial ? "PARTIAL" : "VALIDATED",
    missingEvidence: isPartial ? ["MISSING_ADVANCED_METRICS"] : [],
    pressure: nhl?.shotQualityEdge ?? null,
    fatigue: nhl?.backToBackFatigue ?? null,
    volatility: nhl?.specialTeamsEdge ?? null,
    momentum: teamContext.home.recentFormScore ?? null,
    mismatch: nhl?.goalieAdvantage ?? null,
    sportSpecific: {
      defensivePairingStability: nhl?.defensivePairingStability ?? null,
    },
    coachEvidence: [
      {
        label: "Goalie Advantage",
        valueLabel: nhl?.goalieAdvantage && nhl.goalieAdvantage > 0.65 ? "ELITE" : (nhl?.goalieAdvantage ? "MODERATE" : "UNKNOWN"),
        severity: "HIGH",
        explanation: nhl?.goalieAdvantage ? "Evaluating netminder form and defensive pairing support." : "Goalie metrics unavailable.",
        source: "WORLD_ENGINE",
      }
    ],
    generatedAt: new Date().toISOString(),
  };
}
