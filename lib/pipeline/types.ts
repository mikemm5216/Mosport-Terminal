export type DataProvider = "espn" | "sportradar";
export type LeagueCode = "MLB" | "NBA" | "EPL" | "UCL";
export type MatchStatus = "scheduled" | "live" | "closed" | "postponed" | "cancelled";
export type RawEventStatus = "raw" | "mapped" | "failed";
export type ProviderStatus = "healthy" | "degraded" | "down";
export type ConflictType = "team" | "time" | "score" | "status" | "schema";

export const PROVIDER_PRIORITY: DataProvider[] = ["espn", "sportradar"];

export const DEGRADED_THRESHOLD = 3;
export const DOWN_THRESHOLD = 10;

export type RawEventRecord = {
  id: string;
  provider: DataProvider;
  providerEventId: string;
  league: LeagueCode;
  payload: unknown;
  fetchedAt: string;
  status: RawEventStatus;
};

export type CanonicalMatch = {
  canonicalMatchId: string;
  league: LeagueCode;
  homeTeamCode: string;
  awayTeamCode: string;
  startsAt: string;
  status: MatchStatus;
  homeScore?: number;
  awayScore?: number;
  sourceProvider: DataProvider;
  sourceConfidence: number;
  rawRefs: string[];
};

export type ProviderHealth = {
  provider: DataProvider;
  league: LeagueCode;
  status: ProviderStatus;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  failureCount: number;
  latencyMs: number | null;
};

export type DataConflictLog = {
  league: LeagueCode;
  matchKey: string;
  primaryRawRef?: string;
  backupRawRef?: string;
  conflictType: ConflictType;
  resolution: string;
  createdAt: string;
};

export type ProviderResult = {
  events: NormalizedPipelineEvent[];
  error: boolean;
  stale: boolean;
  schemaInvalid: boolean;
  rawRefs: string[];
};

export type NormalizedPipelineEvent = {
  extId: string;
  league: LeagueCode;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  startsAt: Date;
  status: MatchStatus;
  homeScore?: number;
  awayScore?: number;
  provider: DataProvider;
  rawData: unknown;
};

export type PipelineResult = {
  processed: number;
  skipped: number;
  failed: number;
  fallbackUsed: boolean;
  provider: DataProvider;
};
