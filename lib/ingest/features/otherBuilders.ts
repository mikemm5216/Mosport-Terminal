import { NormalizedProviderGame } from "../../types/provider";
import { NHLFeatures, NFLFeatures, EPLFeatures } from "../../../types/features";

export function buildNHLFeatures(game: NormalizedProviderGame): NHLFeatures {
  return {
    goalieAdvantage: null,
    specialTeamsMismatch: null,
    physicalityIndex: null,
    shotQualityEdge: null,
    puckPossessionTrend: null,
    fatigueFactor: null,
  };
}

export function buildNFLFeatures(game: NormalizedProviderGame): NFLFeatures {
  return {
    qbStability: null,
    offensiveLineGrade: null,
    passRushAdvantage: null,
    redZoneEfficiency: null,
    gameScriptBias: null,
    weatherImpact: null,
  };
}

export function buildEPLFeatures(game: NormalizedProviderGame): EPLFeatures {
  return {
    fixtureCongestion: null,
    midfieldControl: null,
    setPieceDominance: null,
    pressResistance: null,
    expectedGoalsTrend: null,
    defensiveHighLineRisk: null,
  };
}
