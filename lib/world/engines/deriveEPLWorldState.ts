import { PregameFeatureSet } from "../../../types/features";
import { WorldEngineState } from "../../../types/world";
import { buildInsufficientDataWorldState } from "../../engine/engineStatus";

export function deriveEPLWorldState(features: PregameFeatureSet): WorldEngineState {
  const missing: string[] = [];
  const { epl, teamContext } = features;

  if (!epl) missing.push("MISSING_FIXTURE_CONTEXT");
  if (teamContext.home.recentFormScore === undefined) missing.push("MISSING_RECENT_FORM");
  
  if (missing.length > 0) {
    return buildInsufficientDataWorldState(features, missing as any);
  }

  const isPartial = !epl?.pressResistance || !epl?.midfieldControl;

  return {
    matchId: features.matchId,
    league: "EPL",
    sport: "SOCCER",
    engineStatus: isPartial ? "PARTIAL" : "READY",
    evidenceStatus: isPartial ? "PARTIAL" : "VALIDATED",
    missingEvidence: isPartial ? ["MISSING_ADVANCED_METRICS"] : [],
homeTeam: { id: features.homeTeamId, name: features.homeTeamName },
awayTeam: { id: features.awayTeamId, name: features.awayTeamName },
    pressure: epl?.pressResistance ?? null,
    fatigue: epl?.fixtureCongestion ?? null,
    volatility: epl?.defensiveLineRisk ?? null,
    momentum: teamContext.home.recentFormScore ?? null,
    mismatch: epl?.strikerForm ?? null,
    sportSpecific: {
      midfieldControl: epl?.midfieldControl ?? null,
      setPieceRisk: epl?.setPieceRisk ?? null,
    },
    coachEvidence: [
      {
        label: "Fixture Congestion",
        valueLabel: epl?.fixtureCongestion && epl.fixtureCongestion > 0.7 ? "CRITICAL" : (epl?.fixtureCongestion ? "MANAGEABLE" : "UNKNOWN"),
        severity: "MEDIUM",
        explanation: epl?.fixtureCongestion ? "Evaluating fatigue levels from recent fixture density." : "Fixture data unavailable.",
        source: "WORLD_ENGINE",
      }
    ],
    generatedAt: new Date().toISOString(),
  };
}

