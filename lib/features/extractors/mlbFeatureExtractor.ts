import type { HistoricalGameRecord } from "../../../types/historical";
import type { MLBPregameFeatures } from "../../../types/features";
import type { FeatureExtractionResult, SportFeatureExtractor } from "../featureExtractorTypes";
import { calculateFeatureCompleteness } from "../featureCompleteness";

const REQUIRED = [
  "starterAdvantage",
  "bullpenFreshness",
  "lineupQuality",
  "parkFactor",
  "handednessSplitAdvantage",
  "thirdTimeThroughOrderRisk",
  "lateInningLeverageRisk",
  "defensiveStability",
];

export const mlbFeatureExtractor: SportFeatureExtractor = {
  league: "MLB",
  version: "15.0.0",
  extractFromHistorical(record: HistoricalGameRecord): FeatureExtractionResult {
    const base = record.pregameSnapshot.features;
    const mlb = base.mlb || ({ featureStatus: "MISSING", missingEvidence: [], sourceFieldsUsed: [] } as MLBPregameFeatures);
    const completeness = calculateFeatureCompleteness(REQUIRED, mlb);
    const missingEvidence = [...new Set([...(mlb.missingEvidence || []), ...completeness.missing])];
    const sourceFieldsUsed = [...new Set([...(mlb.sourceFieldsUsed || []), "pregameSnapshot.features.mlb"])] ;

    const featureSet = {
      ...base,
      matchId: record.matchId,
      league: record.league,
      sport: record.sport,
      homeTeamId: record.homeTeamId,
      awayTeamId: record.awayTeamId,
      homeTeamName: record.homeTeamName || base.homeTeamName,
      awayTeamName: record.awayTeamName || base.awayTeamName,
      mlb: {
        ...mlb,
        featureStatus: completeness.status,
        missingEvidence,
        sourceFieldsUsed,
      },
      dataQuality: {
        ...base.dataQuality,
        completenessScore: completeness.completenessScore,
        missing: missingEvidence,
        provider: record.pregameSnapshot.provider,
      },
    };

    return {
      matchId: record.matchId,
      league: "MLB",
      featureSet,
      featureStatus: completeness.status,
      missingEvidence,
      sourceFieldsUsed,
      extractorVersion: this.version,
      completenessScore: completeness.completenessScore,
    };
  },
};
