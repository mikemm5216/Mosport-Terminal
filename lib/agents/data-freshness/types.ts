import type { AgentFreshness } from "@/lib/agents/data-ingestion/types";
import type { ProviderStatus, DataProvider, LeagueCode, ProviderHealth } from "@/lib/pipeline/types";

export type DataFreshnessAgentLeague = LeagueCode;

export type FreshnessRecommendedAction =
  | "none"
  | "monitor"
  | "trigger_hot_ingest"
  | "investigate_provider_health"
  | "seed_ingestion_state"
  | "NO_DATA_SOURCE";

export type FreshnessProviderSummary = {
  provider: DataProvider;
  league: DataFreshnessAgentLeague;
  status: ProviderStatus | "unknown";
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  failureCount: number;
  latencyMs: number | null;
};

export type FreshnessIngestionSummary = {
  provider: string;
  sport: string;
  league: string;
  status: string;
  currentPage: number;
  retryCount: number;
  lastRunAt: string | null;
};

export type FreshnessLeagueReport = {
  league: DataFreshnessAgentLeague;
  freshness: AgentFreshness;
  shouldTriggerIngest: boolean;
  recommendedNextAction: FreshnessRecommendedAction;
  latestIngestionAt: string | null;
  ingestionStates: FreshnessIngestionSummary[];
  providers: FreshnessProviderSummary[];
  providerStatusSummary: "healthy" | "degraded" | "down" | "unknown";
  reasons: string[];
};

export type DataFreshnessAgentInput = {
  leagues?: DataFreshnessAgentLeague[];
  now?: Date;
};

export type DataFreshnessAgentDependencies = {
  getProviderHealth?: () => Promise<ProviderHealth[]>;
  getIngestionStates?: () => Promise<FreshnessIngestionSummary[]>;
};

export type DataFreshnessAgentReport = {
  agent: "DataFreshnessAgent";
  generatedAt: string;
  leagues: DataFreshnessAgentLeague[];
  freshness: AgentFreshness;
  shouldTriggerIngest: boolean;
  recommendedNextAction: FreshnessRecommendedAction;
  providerStatusSummary: "healthy" | "degraded" | "down" | "unknown";
  providers: FreshnessProviderSummary[];
  leagueReports: FreshnessLeagueReport[];
};
