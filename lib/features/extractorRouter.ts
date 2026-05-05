import type { HistoricalGameRecord } from "../../types/historical";
import type { FeatureExtractionResult, SportFeatureExtractor } from "./featureExtractorTypes";
import { NBAFeatureExtractor } from "./extractors/nbaFeatureExtractor";
import { MLBFeatureExtractor } from "./extractors/mlbFeatureExtractor";
import { NHLFeatureExtractor } from "./extractors/nhlFeatureExtractor";
import { NFLFeatureExtractor } from "./extractors/nflFeatureExtractor";
import { EPLFeatureExtractor } from "./extractors/eplFeatureExtractor";

const extractors: Record<string, SportFeatureExtractor> = {
  NBA: new NBAFeatureExtractor(),
  MLB: new MLBFeatureExtractor(),
  NHL: new NHLFeatureExtractor(),
  NFL: new NFLFeatureExtractor(),
  EPL: new EPLFeatureExtractor(),
};

export function extractFeatures(record: HistoricalGameRecord): FeatureExtractionResult {
  const extractor = extractors[record.league];
  if (!extractor) {
    throw new Error(`No feature extractor found for league: ${record.league}`);
  }

  return extractor.extractFromHistorical(record);
}
