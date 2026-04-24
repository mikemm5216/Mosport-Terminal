export type AgentLeague = "MLB" | "NBA" | "EPL";
export type AgentProvider = "espn" | "sportradar";
export type AgentMatchStatus = "scheduled" | "live" | "closed" | "postponed" | "cancelled";
export type AgentFreshness = "live" | "recent" | "stale" | "offline";

export type DataIngestionAgentInput = {
  leagues: AgentLeague[];
  mode: "hot" | "cold";
  date?: string;
  force?: boolean;
};

export type DataIngestionAgentReport = {
  agent: "DataIngestionAgent";
  status: "ok" | "partial" | "failed";
  mode: "hot" | "cold";
  leagues: string[];
  primaryProvider: "espn";
  fallbackProvider: "sportradar";
  fallbackUsed: boolean;
  fetchedCount: number;
  mappedCount: number;
  upsertedCount: number;
  latestUpdatedAt: string | null;
  freshness: AgentFreshness;
  errors: AgentErrorEntry[];
};

export type AgentErrorEntry = {
  provider: AgentProvider | "system";
  league?: string;
  message: string;
};

export type AgentProviderResult = {
  provider: AgentProvider;
  league: AgentLeague;
  rawEvents: unknown[];
  fetchedAt: string;
};

export interface DataProvider {
  name: AgentProvider;
  fetchSchedule(input: { league: AgentLeague; date: string }): Promise<AgentProviderResult>;
}

export type AgentCanonicalMatch = {
  provider: AgentProvider;
  providerEventId: string;
  canonicalMatchId: string;
  league: AgentLeague;
  homeTeamCode: string;
  awayTeamCode: string;
  startsAt: string;
  status: AgentMatchStatus;
  homeScore?: number;
  awayScore?: number;
  rawRefId?: string;
  sourceConfidence: number;
};
