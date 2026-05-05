import type { HistoricalGameRecord, SupportedHistoricalLeague } from "../../types/historical";
import type { PregameFeatureSet, FeatureStatus } from "../../types/features";

export type FeatureExtractionMode = "HISTORICAL_BACKTEST" | "PREGAME_LIVE_PROVIDER";

export type FeatureExtractionResult = {
  matchId: string;
  league: SupportedHistoricalLeague;
  featureSet: PregameFeatureSet;
  featureStatus: FeatureStatus;
  missingEvidence: string[];
  sourceFieldsUsed: string[];
  extractorVersion: string;
  completenessScore: number;
};

export interface SportFeatureExtractor {
  league: SupportedHistoricalLeague;
  version: string;
  extractFromHistorical(record: HistoricalGameRecord): FeatureExtractionResult;
}
