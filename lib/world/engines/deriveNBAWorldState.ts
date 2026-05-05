import { PregameFeatureSet } from "../../../types/features";
import { WorldEngineState } from "../../../types/world";
import { buildInsufficientDataWorldState } from "../../engine/engineStatus";
import { checkEvidenceRequirements } from "../../engine/evidenceRequirements";

export function deriveNBAWorldState(features: PregameFeatureSet): WorldEngineState {
  const missing = checkEvidenceRequirements(features);
  
  if (missing.length > 0 && (missing.includes("MISSING_ROSTER") || missing.includes("MISSING_RECENT_FORM"))) {
    return buildInsufficientDataWorldState(features, missing);
  }

  const { nba, teamContext } = features;
  const isPartial = missing.length > 0;

  return {
    matchId: features.matchId,
    league: "NBA",
    sport: "BASKETBALL",
    engineStatus: isPartial ? "PARTIAL" : "READY",
    evidenceStatus: isPartial ? "PARTIAL" : "VALIDATED",
    missingEvidence: missing,
    pressure: nba?.pacePressure ?? null,
    fatigue: teamContext.home.travelFatigue ?? null,
    volatility: nba?.rotationRisk ?? null,
    momentum: teamContext.home.recentFormScore ?? null,
    mismatch: nba?.matchupMismatch ?? null,
    sportSpecific: {
      benchStability: nba?.benchStability ?? null,
      starLoad: nba?.starLoad ?? null,
      foulTroubleRisk: nba?.foulTroubleRisk ?? null,
    },
    coachEvidence: [
      {
        label: "Rotation Risk",
        valueLabel: nba?.rotationRisk && nba.rotationRisk > 0.7 ? "HIGH" : (nba?.rotationRisk ? "NORMAL" : "UNKNOWN"),
        severity: nba?.rotationRisk && nba.rotationRisk > 0.7 ? "HIGH" : "LOW",
        explanation: nba?.rotationRisk ? "Analysis of rotation compression and bench unit stability." : "Rotation data unavailable.",
        source: "WORLD_ENGINE",
      }
    ],
    generatedAt: new Date().toISOString(),
  };
}
