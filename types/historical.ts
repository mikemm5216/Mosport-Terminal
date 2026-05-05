import type { PregameFeatureSet } from "./features";

export type SupportedHistoricalLeague = "NBA" | "MLB" | "NHL" | "NFL" | "EPL";

export type HistoricalGameRecord = {
  matchId: string;
  league: SupportedHistoricalLeague;
  sport: string;
  season?: string;
  startTime: string;

  homeTeamId: string;
  awayTeamId: string;
  homeTeamName?: string;
  awayTeamName?: string;

  pregameSnapshot: {
    provider: string;
    collectedAt: string;
    features: PregameFeatureSet;
  };

  finalResult: {
    homeScore: number;
    awayScore: number;
    winnerTeamId: string;
    completedAt?: string;
  };

  metadata?: {
    sourceFile?: string;
    sourceRow?: number;
    providerRefs?: string[];
    notes?: string[];
  };
};

export type HistoricalCorpusValidationError = {
  matchId?: string;
  row?: number;
  reason: string;
};

export type HistoricalCorpusValidationResult = {
  ok: boolean;
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  byLeague: Record<string, number>;
  errors: HistoricalCorpusValidationError[];
};
