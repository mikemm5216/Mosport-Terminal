import { ESPNProvider } from "./providers/espnProvider";
import { SportradarProvider } from "./providers/sportradarProvider";
import { saveRawEvents, mapToCanonical } from "./mapper/canonicalMapper";
import { updateProviderHealth } from "./health/providerHealth";
import { routeColdHot } from "./router/coldHotRouter";
import type {
  DataIngestionAgentInput,
  DataIngestionAgentReport,
  AgentProviderResult,
  DataProvider,
  AgentLeague,
} from "./types";

function shouldFallback(result: AgentProviderResult | null, error?: unknown): boolean {
  if (error) return true;
  if (!result) return true;
  if (!Array.isArray(result.rawEvents)) return true;
  if (result.rawEvents.length === 0) return true;
  return false;
}

function shouldRefreshProjection(league: AgentLeague): boolean {
  return league === "NBA" || league === "MLB";
}

function initReport(input: DataIngestionAgentInput): DataIngestionAgentReport {
  return {
    agent: "DataIngestionAgent",
    status: "failed",
    mode: input.mode,
    leagues: [...input.leagues],
    primaryProvider: "espn",
    fallbackProvider: "sportradar",
    fallbackUsed: false,
    fetchedCount: 0,
    mappedCount: 0,
    upsertedCount: 0,
    latestUpdatedAt: null,
    freshness: "offline",
    errors: [],
  };
}

export class DataIngestionAgent {
  private espn: DataProvider = new ESPNProvider();
  private sportradar: DataProvider = new SportradarProvider();

  async run(input: DataIngestionAgentInput): Promise<DataIngestionAgentReport> {
    const report = initReport(input);
    const date = input.date ?? new Date().toISOString().slice(0, 10);

    for (const league of input.leagues) {
      let primaryResult: AgentProviderResult | null = null;
      let primaryError: unknown;

      try {
        primaryResult = await this.espn.fetchSchedule({ league, date });
      } catch (err) {
        primaryError = err;
        report.errors.push({
          provider: "espn",
          league,
          message: err instanceof Error ? err.message : "ESPN fetch failed",
        });
      }

      let result = primaryResult;
      let fallbackUsed = false;

      if (shouldFallback(primaryResult, primaryError)) {
        await updateProviderHealth({ provider: "espn", league, status: "degraded" }).catch(() => {});

        try {
          const fallback = await this.sportradar.fetchSchedule({ league, date });
          if (!shouldFallback(fallback)) {
            result = fallback;
            fallbackUsed = true;
          } else {
            report.errors.push({
              provider: "sportradar",
              league,
              message: "Sportradar returned empty data",
            });
            await updateProviderHealth({ provider: "sportradar", league, status: "degraded" }).catch(() => {});
          }
        } catch (err) {
          report.errors.push({
            provider: "sportradar",
            league,
            message: err instanceof Error ? err.message : "Sportradar fetch failed",
          });
          await updateProviderHealth({ provider: "sportradar", league, status: "degraded" }).catch(() => {});
        }
      }

      if (!result || shouldFallback(result)) {
        report.errors.push({
          provider: "system",
          league,
          message: "All providers failed or returned empty data",
        });
        continue;
      }

      try {
        report.fetchedCount += result.rawEvents.length;

        const rawIdMap = await saveRawEvents(result);
        const canonical = await mapToCanonical(result, rawIdMap);
        report.mappedCount += canonical.length;

        const upserted = await routeColdHot({ mode: input.mode, matches: canonical });
        report.upsertedCount += upserted;

        // Trigger projection refresh for leagues currently supported by the ingestion agent.
        // NHL is not part of AgentLeague/provider coverage yet, so keep this guard aligned
        // with the typed ingestion surface to avoid impossible comparisons.
        if (upserted > 0 && shouldRefreshProjection(league)) {
          const { ProjectionAgent } = await import("../../services/projectionAgent");
          await ProjectionAgent.refreshSnapshot(league as any, "data_ingestion_agent_hot");
        }

        report.fallbackUsed = report.fallbackUsed || fallbackUsed;

        await updateProviderHealth({ provider: result.provider, league, status: "healthy" });
      } catch (err) {
        report.errors.push({
          provider: "system",
          league,
          message: err instanceof Error ? err.message : "Pipeline error",
        });
      }
    }

    report.status =
      report.upsertedCount > 0
        ? report.errors.length > 0
          ? "partial"
          : "ok"
        : "failed";

    report.latestUpdatedAt = new Date().toISOString();
    report.freshness =
      report.status === "ok" || report.status === "partial" ? "live" : "offline";

    return report;
  }
}
