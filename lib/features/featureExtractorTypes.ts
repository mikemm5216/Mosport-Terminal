import type { HistoricalGameRecord } from "../../types/historical";
import type { PregameFeatureSet } from "../../types/features";

export type FeatureExtractionMode =
  | "HISTORICAL_BACKTEST"
  | "PREGAME_LIVE_PROVIDER";

export type FeatureExtractionResult = {
  matchId: string;
  league: string;
  featureSet: PregameFeatureSet;
  featureStatus: "READY" | "PARTIAL" | "MISSING";
  missingEvidence: string[];
  sourceFieldsUsed: string[];
  extractorVersion: string;
};

export interface SportFeatureExtractor {
  league: "NBA" | "MLB" | "NHL" | "NFL" | "EPL";
  version: string;
  extractFromHistorical(record: HistoricalGameRecord): FeatureExtractionResult;
}
