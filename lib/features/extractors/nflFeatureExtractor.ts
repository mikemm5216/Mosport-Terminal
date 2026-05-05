import type { HistoricalGameRecord } from "../../../types/historical";
import type { NFLPregameFeatures } from "../../../types/features";
import type { FeatureExtractionResult, SportFeatureExtractor } from "../featureExtractorTypes";
import { calculateFeatureCompleteness } from "../featureCompleteness";

const REQUIRED = ["qbStability", "passRushMismatch", "offensiveLineHealth", "redZoneEdge", "gameScriptPressure", "turnoverVolatility", "injuryBurden"];

function flatten(record: HistoricalGameRecord, nfl: NFLPregameFeatures): Record<string, unknown> {
  return {
    ...nfl,
    injuryBurden: record.pregameSnapshot.features.teamContext?.home?.injuryBurden,
  };
}

export const nflFeatureExtractor: SportFeatureExtractor = {
  league: "NFL",
  version: "15.0.0",
  extractFromHistorical(record: HistoricalGameRecord): FeatureExtractionResult {
    const base = record.pregameSnapshot.features;
    const nfl = base.nfl || ({ featureStatus: "MISSING", missingEvidence: [], sourceFieldsUsed: [] } as NFLPregameFeatures);
    const completeness = calculateFeatureCompleteness(REQUIRED, flatten(record, nfl), { ready: 5 / 7, partial: 0.4 });
    const missingEvidence = [...new Set([...(nfl.missingEvidence || []), ...completeness.missing])];
    const sourceFieldsUsed = [...new Set([...(nfl.sourceFieldsUsed || []), "pregameSnapshot.features.nfl", "teamContext.home"])] ;
    const featureSet = {
      ...base,
      matchId: record.matchId,
      league: record.league,
      sport: record.sport,
      homeTeamId: record.homeTeamId,
      awayTeamId: record.awayTeamId,
      homeTeamName: record.homeTeamName || base.homeTeamName,
      awayTeamName: record.awayTeamName || base.awayTeamName,
      nfl: { ...nfl, featureStatus: completeness.status, missingEvidence, sourceFieldsUsed },
      dataQuality: { ...base.dataQuality, completenessScore: completeness.completenessScore, missing: missingEvidence, provider: record.pregameSnapshot.provider },
    };
    return { matchId: record.matchId, league: "NFL", featureSet, featureStatus: completeness.status, missingEvidence, sourceFieldsUsed, extractorVersion: this.version, completenessScore: completeness.completenessScore };
  },
};
