import { getAllHealth } from "@/lib/pipeline/providerHealth";
import { PrismaClient } from "@prisma/client";
import type { AgentFreshness } from "@/lib/agents/data-ingestion/types";
import type { ProviderHealth, LeagueCode } from "@/lib/pipeline/types";
import type {
  DataFreshnessAgentDependencies,
  DataFreshnessAgentInput,
  DataFreshnessAgentLeague,
  DataFreshnessAgentReport,
  FreshnessIngestionSummary,
  FreshnessLeagueReport,
  FreshnessProviderSummary,
  FreshnessRecommendedAction,
} from "./types";

const DEFAULT_LEAGUES: DataFreshnessAgentLeague[] = ["MLB", "NBA", "EPL", "UCL"];

const HOT_INGEST_TARGET_MINUTES = 5;
const LIVE_MAX_MINUTES = 7;
const RECENT_MAX_MINUTES = 20;
const STALE_MAX_MINUTES = 60;
const PROVIDER_DEGRADED_FAILURES = 2;
const PROVIDER_DOWN_FAILURES = 5;
let readPrismaClient: PrismaClient | null | undefined;

const LEAGUE_SPORT_MAP: Record<DataFreshnessAgentLeague, string> = {
  MLB: "baseball",
  NBA: "basketball",
  EPL: "football",
  UCL: "football",
};

function minutesSince(timestamp: string | null, now: Date): number | null {
  if (!timestamp) return null;
  const ms = now.getTime() - new Date(timestamp).getTime();
  return Math.max(0, Math.floor(ms / 60000));
}

function computeFreshness(latestIngestionAt: string | null, now: Date): AgentFreshness {
  const ageMin = minutesSince(latestIngestionAt, now);
  if (ageMin === null) return "offline";
  if (ageMin <= LIVE_MAX_MINUTES) return "live";
  if (ageMin <= RECENT_MAX_MINUTES) return "recent";
  if (ageMin <= STALE_MAX_MINUTES) return "stale";
  return "offline";
}

function deriveProviderStatus(row: ProviderHealth, now: Date): FreshnessProviderSummary["status"] {
  const lastSuccessAgeMin = minutesSince(row.lastSuccessAt, now);

  if (row.failureCount >= PROVIDER_DOWN_FAILURES) return "down";
  if (lastSuccessAgeMin !== null && lastSuccessAgeMin > STALE_MAX_MINUTES) return "down";
  if (row.failureCount >= PROVIDER_DEGRADED_FAILURES) return "degraded";
  return "healthy";
}

function summarizeProviderStatus(
  providers: FreshnessProviderSummary[],
): "healthy" | "degraded" | "down" | "unknown" {
  if (providers.length === 0) return "unknown";
  if (providers.some((provider) => provider.status === "down")) return "down";
  if (providers.some((provider) => provider.status === "degraded")) return "degraded";
  if (providers.every((provider) => provider.status === "healthy")) return "healthy";
  return "unknown";
}

function getReadDatabaseUrl(): string | null {
  const readUrl = process.env.DATABASE_READ_URL?.trim();
  if (readUrl) return readUrl;

  const primaryUrl = process.env.DATABASE_URL?.trim();
  if (primaryUrl) return primaryUrl;

  return null;
}

function getReadPrisma(): PrismaClient | null {
  const dbUrl = getReadDatabaseUrl();
  if (!dbUrl) return null;

  if (readPrismaClient) return readPrismaClient;

  readPrismaClient = new PrismaClient({
    datasources: {
      db: {
        url: dbUrl,
      },
    },
  });

  return readPrismaClient;
}

function buildNoDataSourceReport(
  leagues: DataFreshnessAgentLeague[],
  now: Date,
): DataFreshnessAgentReport {
  const leagueReports: FreshnessLeagueReport[] = leagues.map((league) => ({
    league,
    freshness: "offline",
    shouldTriggerIngest: false,
    recommendedNextAction: "NO_DATA_SOURCE",
    latestIngestionAt: null,
    ingestionStates: [],
    providers: [],
    providerStatusSummary: "unknown",
    reasons: ["No DATABASE_READ_URL or DATABASE_URL configured."],
  }));

  return {
    agent: "DataFreshnessAgent",
    generatedAt: now.toISOString(),
    leagues,
    freshness: "offline",
    shouldTriggerIngest: false,
    recommendedNextAction: "NO_DATA_SOURCE",
    providerStatusSummary: "unknown",
    providers: [],
    leagueReports,
  };
}

function mapProviderHealth(row: ProviderHealth, now: Date): FreshnessProviderSummary {
  return {
    provider: row.provider,
    league: row.league,
    status: deriveProviderStatus(row, now),
    lastSuccessAt: row.lastSuccessAt,
    lastFailureAt: row.lastFailureAt,
    failureCount: row.failureCount,
    latencyMs: row.latencyMs,
  };
}

function decideLeagueAction(params: {
  freshness: AgentFreshness;
  providerStatusSummary: "healthy" | "degraded" | "down" | "unknown";
  ingestionStates: FreshnessIngestionSummary[];
}): {
  shouldTriggerIngest: boolean;
  recommendedNextAction: FreshnessRecommendedAction;
  reasons: string[];
} {
  const reasons: string[] = [];
  const hasIngestionState = params.ingestionStates.length > 0;

  if (!hasIngestionState) {
    reasons.push("No ingestion state found for league.");
    return {
      shouldTriggerIngest: false,
      recommendedNextAction: "seed_ingestion_state",
      reasons,
    };
  }

  if (params.providerStatusSummary === "down") {
    reasons.push("At least one provider is down.");
    return {
      shouldTriggerIngest: false,
      recommendedNextAction: "investigate_provider_health",
      reasons,
    };
  }

  if (params.freshness === "offline") {
    reasons.push("Data freshness is offline.");
    return {
      shouldTriggerIngest: true,
      recommendedNextAction: "trigger_hot_ingest",
      reasons,
    };
  }

  if (params.freshness === "stale") {
    reasons.push("Data freshness is stale.");
    return {
      shouldTriggerIngest: true,
      recommendedNextAction: "trigger_hot_ingest",
      reasons,
    };
  }

  if (params.providerStatusSummary === "degraded") {
    reasons.push("Provider health is degraded.");
    return {
      shouldTriggerIngest: false,
      recommendedNextAction: "investigate_provider_health",
      reasons,
    };
  }

  if (params.freshness === "recent") {
    reasons.push(`Data is within the ${RECENT_MAX_MINUTES}-minute recent window.`);
    return {
      shouldTriggerIngest: false,
      recommendedNextAction: "monitor",
      reasons,
    };
  }

  reasons.push("Data is live and providers are healthy.");
  return {
    shouldTriggerIngest: false,
    recommendedNextAction: "none",
    reasons,
  };
}

function isSuccessfulIngestionStatus(status: string): boolean {
  return ["success", "ok", "completed"].includes(status.toLowerCase());
}

function collapseFreshness(freshnessValues: AgentFreshness[]): AgentFreshness {
  if (freshnessValues.includes("offline")) return "offline";
  if (freshnessValues.includes("stale")) return "stale";
  if (freshnessValues.includes("recent")) return "recent";
  return "live";
}

function collapseRecommendedAction(actions: FreshnessRecommendedAction[]): FreshnessRecommendedAction {
  if (actions.includes("seed_ingestion_state")) return "seed_ingestion_state";
  if (actions.includes("investigate_provider_health")) return "investigate_provider_health";
  if (actions.includes("trigger_hot_ingest")) return "trigger_hot_ingest";
  if (actions.includes("monitor")) return "monitor";
  return "none";
}

export class DataFreshnessAgent {
  constructor(private readonly deps: DataFreshnessAgentDependencies = {}) {}

  async run(input: DataFreshnessAgentInput = {}): Promise<DataFreshnessAgentReport> {
    const now = input.now ?? new Date();
    const leagues = input.leagues?.length ? input.leagues : DEFAULT_LEAGUES;
    const prisma = getReadPrisma();

    if (!this.deps.getIngestionStates && !prisma) {
      return buildNoDataSourceReport(leagues, now);
    }

    const [providerHealthRows, ingestionRows] = await Promise.all([
      this.deps.getProviderHealth?.() ?? getAllHealth().catch(() => []),
      this.deps.getIngestionStates?.() ?? prisma!.ingestionState.findMany({
        where: {
          OR: leagues.flatMap((league) => [
            { league },
            { sport: LEAGUE_SPORT_MAP[league] },
          ]),
        },
        orderBy: { lastRunAt: "desc" },
      }).then((rows) =>
        rows.map<FreshnessIngestionSummary>((row) => ({
          provider: row.provider,
          sport: row.sport,
          league: row.league,
          status: row.status,
          currentPage: row.currentPage,
          retryCount: row.retryCount,
          lastRunAt: row.lastRunAt?.toISOString() ?? null,
        })),
      ).catch(() => []),
    ]);

    const leagueReports: FreshnessLeagueReport[] = leagues.map((league) => {
      const providers = providerHealthRows
        .filter((row) => row.league === league)
        .map((row) => mapProviderHealth(row, now));

      const ingestionStates = ingestionRows.filter(
        (row) => row.league === league || row.sport === LEAGUE_SPORT_MAP[league],
      );

      const latestIngestionAt = ingestionStates
        .filter((state) => isSuccessfulIngestionStatus(state.status))
        .map((state) => state.lastRunAt)
        .filter((value): value is string => Boolean(value))
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null;

      const freshness = computeFreshness(latestIngestionAt, now);
      const providerStatusSummary = summarizeProviderStatus(providers);
      const decision = decideLeagueAction({
        freshness,
        providerStatusSummary,
        ingestionStates,
      });

      if (decision.shouldTriggerIngest) {
        decision.reasons.push(`Hot ingestion target cadence is ${HOT_INGEST_TARGET_MINUTES} minutes.`);
      }

      return {
        league,
        freshness,
        shouldTriggerIngest: decision.shouldTriggerIngest,
        recommendedNextAction: decision.recommendedNextAction,
        latestIngestionAt,
        ingestionStates,
        providers,
        providerStatusSummary,
        reasons: decision.reasons,
      };
    });

    return {
      agent: "DataFreshnessAgent",
      generatedAt: now.toISOString(),
      leagues,
      freshness: collapseFreshness(leagueReports.map((report) => report.freshness)),
      shouldTriggerIngest: leagueReports.some((report) => report.shouldTriggerIngest),
      recommendedNextAction: collapseRecommendedAction(
        leagueReports.map((report) => report.recommendedNextAction),
      ),
      providerStatusSummary: summarizeProviderStatus(
        leagueReports.flatMap((report) => report.providers),
      ),
      providers: leagueReports.flatMap((report) => report.providers),
      leagueReports,
    };
  }
}
