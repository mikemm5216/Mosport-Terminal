import { PregameFeatureSet } from "../../types/features";
import { WorldEngineState } from "../../types/world";
import { EngineStatus, MissingEvidenceReason } from "../../types/engine";

export function buildInsufficientDataWorldState(
  features: PregameFeatureSet,
  reasons: MissingEvidenceReason[]
): WorldEngineState {
  return {
    matchId: features.matchId,
    league: features.league,
    sport: features.sport,
    engineStatus: "INSUFFICIENT_DATA",
    evidenceStatus: "MISSING",
    missingEvidence: reasons,
    homeTeam: { id: features.homeTeamId, name: features.homeTeamName },
    awayTeam: { id: features.awayTeamId, name: features.awayTeamName },
    pressure: null,
    fatigue: null,
    volatility: null,
    momentum: null,
    mismatch: null,
    sportSpecific: {},
    coachEvidence: [],
    noLeanReason: "Insufficient data to provide a reliable coaching read.",
    generatedAt: new Date().toISOString(),
  };
}

export function getEngineStatus(features: PregameFeatureSet): EngineStatus {
  if (features.dataQuality.completenessScore >= 0.8) return "READY";
  if (features.dataQuality.completenessScore >= 0.4) return "PARTIAL";
  return "INSUFFICIENT_DATA";
}
