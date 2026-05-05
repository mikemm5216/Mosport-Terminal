import type { HistoricalGameRecord } from "../../../types/historical";
import type { NBAPregameFeatures } from "../../../types/features";
import type { FeatureExtractionResult, SportFeatureExtractor } from "../featureExtractorTypes";
import { calculateFeatureCompleteness } from "../featureCompleteness";

const REQUIRED = [
  "pacePressure",
  "rotationRisk",
  "foulTroubleRisk",
  "matchupMismatch",
  "benchStability",
  "starLoad",
  "recentFormScore",
  "restDays",
];

function flatten(record: HistoricalGameRecord, nba: NBAPregameFeatures): Record<string, unknown> {
  return {
    ...nba,
    recentFormScore: record.pregameSnapshot.features.teamContext?.home?.recentFormScore,
    restDays: record.pregameSnapshot.features.teamContext?.home?.restDays,
  };
}

export const nbaFeatureExtractor: SportFeatureExtractor = {
  league: "NBA",
  version: "15.0.0",
  extractFromHistorical(record: HistoricalGameRecord): FeatureExtractionResult {
    const base = record.pregameSnapshot.features;
    const nba = base.nba || ({ featureStatus: "MISSING", missingEvidence: [], sourceFieldsUsed: [] } as NBAPregameFeatures);
    const completeness = calculateFeatureCompleteness(REQUIRED, flatten(record, nba));
    const missingEvidence = [...new Set([...(nba.missingEvidence || []), ...completeness.missing])];
    const sourceFieldsUsed = [...new Set([...(nba.sourceFieldsUsed || []), "pregameSnapshot.features.nba", "teamContext.home"])] ;

    const featureSet = {
      ...base,
      matchId: record.matchId,
      league: record.league,
      sport: record.sport,
      homeTeamId: record.homeTeamId,
      awayTeamId: record.awayTeamId,
      homeTeamName: record.homeTeamName || base.homeTeamName,
      awayTeamName: record.awayTeamName || base.awayTeamName,
      nba: { ...nba, featureStatus: completeness.status, missingEvidence, sourceFieldsUsed },
      dataQuality: { ...base.dataQuality, completenessScore: completeness.completenessScore, missing: missingEvidence, provider: record.pregameSnapshot.provider },
    };

    return { matchId: record.matchId, league: "NBA", featureSet, featureStatus: completeness.status, missingEvidence, sourceFieldsUsed, extractorVersion: this.version, completenessScore: completeness.completenessScore };
  },
};
