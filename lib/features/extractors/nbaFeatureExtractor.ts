import type { HistoricalGameRecord } from "../../../types/historical";
import type { SportFeatureExtractor, FeatureExtractionResult } from "../featureExtractorTypes";
import { calculateFeatureCompleteness } from "../featureCompleteness";

export class NBAFeatureExtractor implements SportFeatureExtractor {
  league: "NBA" = "NBA";
  version = "1.0.0";

  private requiredFeatures = [
    "recentFormScore",
    "restDays",
    "injuryBurden",
    "pacePressure",
    "rotationRisk",
    "benchStability",
    "matchupMismatch",
    "starLoad",
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
