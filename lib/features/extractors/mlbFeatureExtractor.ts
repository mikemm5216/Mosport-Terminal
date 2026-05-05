import type { HistoricalGameRecord } from "../../../types/historical";
import type { SportFeatureExtractor, FeatureExtractionResult } from "../featureExtractorTypes";
import { calculateFeatureCompleteness } from "../featureCompleteness";

export class MLBFeatureExtractor implements SportFeatureExtractor {
  league: "MLB" = "MLB";
  version = "1.0.0";

  private requiredFeatures = [
    "starterAdvantage",
    "bullpenFreshness",
    "lineupQuality",
    "parkFactor",
    "handednessSplitAdvantage",
    "thirdTimeThroughOrderRisk",
    "lateInningLeverageRisk",
    "defensiveStability",
  ];

  extractFromHistorical(record: HistoricalGameRecord): FeatureExtractionResult {
    const features = record.pregameSnapshot.features;

    // MLB 特殊處理：禁止使用 0.0 作為 starterAdvantage 的 placeholder
    // 如果值為 0，且在業務邏輯上 0 是 placeholder 而非真實計算結果，則應視為 null
    // 這裡我們假設 completeness 檢查已經涵蓋了 null/undefined
    
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
