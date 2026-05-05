import type { HistoricalGameRecord } from "../../../types/historical";
import type { SportFeatureExtractor, FeatureExtractionResult } from "../featureExtractorTypes";
import { calculateFeatureCompleteness } from "../featureCompleteness";

export class NHLFeatureExtractor implements SportFeatureExtractor {
  league: "NHL" = "NHL";
  version = "1.0.0";

  private requiredFeatures = [
    "goalieAdvantage",
    "backToBackFatigue",
    "specialTeamsEdge",
    "shotQualityEdge",
    "defensivePairingStability",
    "recentFormScore",
    "restDays",
  ];

  extractFromHistorical(record: HistoricalGameRecord): FeatureExtractionResult {
    const features = record.pregameSnapshot.features;
    const completeness = calculateFeatureCompleteness(this.requiredFeatures, features as any);

    return {
      matchId: record.matchId,
      league: this.league,
      featureSet: features,
      featureStatus: completeness.status,
      missingEvidence: completeness.missing,
      sourceFieldsUsed: completeness.present,
      extractorVersion: this.version,
    };
  }
}
