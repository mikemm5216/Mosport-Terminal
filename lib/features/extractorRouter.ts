import type { HistoricalGameRecord, SupportedHistoricalLeague } from "../../types/historical";
import type { FeatureExtractionResult, SportFeatureExtractor } from "./featureExtractorTypes";
import { nbaFeatureExtractor } from "./extractors/nbaFeatureExtractor";
import { mlbFeatureExtractor } from "./extractors/mlbFeatureExtractor";
import { nhlFeatureExtractor } from "./extractors/nhlFeatureExtractor";
import { nflFeatureExtractor } from "./extractors/nflFeatureExtractor";
import { eplFeatureExtractor } from "./extractors/eplFeatureExtractor";

const EXTRACTORS: Record<SupportedHistoricalLeague, SportFeatureExtractor> = {
  NBA: nbaFeatureExtractor,
  MLB: mlbFeatureExtractor,
  NHL: nhlFeatureExtractor,
  NFL: nflFeatureExtractor,
  EPL: eplFeatureExtractor,
};

export function getSportFeatureExtractor(league: string): SportFeatureExtractor {
  const key = league.toUpperCase() as SupportedHistoricalLeague;
  const extractor = EXTRACTORS[key];
  if (!extractor) throw new Error(`Unsupported historical feature extractor league: ${league}`);
  return extractor;
}

export function extractHistoricalFeatures(record: HistoricalGameRecord): FeatureExtractionResult {
  return getSportFeatureExtractor(record.league).extractFromHistorical(record);
}
