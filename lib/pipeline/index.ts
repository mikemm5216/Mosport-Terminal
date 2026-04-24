import { prisma } from "@/lib/prisma";
import { resolveMatch } from "@/services/matchResolver";
import { ESPNAdapter } from "@/lib/ingest/adapters/espn";
import { SportradarAdapter } from "@/lib/ingest/adapters/sportradar";
import { routeCanonical } from "./router";
import { recordSuccess, recordFailure } from "./providerHealth";
import { resolveConflict } from "./conflictResolver";
import {
  CanonicalMatch,
  DataProvider,
  LeagueCode,
  MatchStatus,
  NormalizedPipelineEvent,
  PROVIDER_PRIORITY,
  PipelineResult,
  ProviderResult,
} from "./types";
import { IngestionJob } from "@/lib/ingest/types";
import { IngestionAdapter } from "@/lib/ingest/adapters/types";
import crypto from "crypto";

function adapterFor(provider: DataProvider): IngestionAdapter {
  if (provider === "espn") return new ESPNAdapter();
  return new SportradarAdapter();
}

function generateHash(payload: unknown): string {
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function toMatchStatus(raw?: string): MatchStatus {
  const map: Record<string, MatchStatus> = {
    scheduled: "scheduled",
    live: "live",
    in_play: "live",
    closed: "closed",
    finished: "closed",
    postponed: "postponed",
    cancelled: "cancelled",
  };
  return map[raw ?? ""] ?? "scheduled";
}

export function shouldFallback(result: ProviderResult): boolean {
  return (
    result.error ||
    result.events.length === 0 ||
    result.stale ||
    result.schemaInvalid
  );
}

async function fetchFromProvider(
  provider: DataProvider,
  job: IngestionJob,
): Promise<ProviderResult> {
  const adapter = adapterFor(provider);
  const league = job.league.toUpperCase() as LeagueCode;

  try {
    const t0 = Date.now();
    const { data, isLastPage } = await adapter.fetchPage(job);
    const latencyMs = Date.now() - t0;

    if (!Array.isArray(data) || data.length === 0) {
      await recordFailure(provider, league);
      return { events: [], error: false, stale: false, schemaInvalid: false, rawRefs: [] };
    }

    await recordSuccess(provider, league, latencyMs);

    const events: NormalizedPipelineEvent[] = data.map((item) => {
      const n = adapter.normalize(item, job);
      return {
        extId: n.extId,
        league,
        sport: n.sport,
        homeTeam: n.homeTeam,
        awayTeam: n.awayTeam,
        startsAt: n.startTime,
        status: toMatchStatus(n.status),
        homeScore: n.homeScore,
        awayScore: n.awayScore,
        provider,
        rawData: n.rawData,
      };
    });

    return { events, error: false, stale: false, schemaInvalid: false, rawRefs: [] };
  } catch {
    await recordFailure(provider, league);
    return { events: [], error: true, stale: false, schemaInvalid: false, rawRefs: [] };
  }
}

async function processEvent(
  event: NormalizedPipelineEvent,
): Promise<{ rawRef: string; canonical: CanonicalMatch } | null> {
  const hash = generateHash(event.rawData);
  const league = event.league;

  // Raw Layer: upsert with status tracking
  const raw = await prisma.rawEvent.upsert({
    where: { extId_provider: { extId: event.extId, provider: event.provider } },
    update: { payload: event.rawData as any, hash, fetchedAt: new Date(), status: "raw" },
    create: {
      extId: event.extId,
      provider: event.provider,
      sport: event.sport,
      league,
      payload: event.rawData as any,
      hash,
      processed: false,
      fetchedAt: new Date(),
      status: "raw",
    },
  });

  // Canonical Layer: resolve or create match
  const resolution = await resolveMatch({
    provider: event.provider,
    extId: event.extId,
    sport: event.sport,
    league,
    homeTeam: event.homeTeam,
    awayTeam: event.awayTeam,
    startTime: event.startsAt,
  });

  // Mark raw event as mapped
  await prisma.rawEvent.update({
    where: { id: raw.id },
    data: { processed: true, status: "mapped" },
  });

  const canonical: CanonicalMatch = {
    canonicalMatchId: resolution.matchId,
    league,
    homeTeamCode: event.homeTeam,
    awayTeamCode: event.awayTeam,
    startsAt: event.startsAt.toISOString(),
    status: event.status,
    homeScore: event.homeScore,
    awayScore: event.awayScore,
    sourceProvider: event.provider,
    sourceConfidence: resolution.score,
    rawRefs: [raw.id],
  };

  return { rawRef: raw.id, canonical };
}

export async function runDataLifecyclePipeline(
  job: IngestionJob,
): Promise<PipelineResult> {
  const league = job.league.toUpperCase() as LeagueCode;
  let primaryResult = await fetchFromProvider(PROVIDER_PRIORITY[0], { ...job, league });

  let fallbackUsed = false;
  let activeProvider: DataProvider = PROVIDER_PRIORITY[0];
  let activeResult = primaryResult;

  if (shouldFallback(primaryResult)) {
    const backupResult = await fetchFromProvider(PROVIDER_PRIORITY[1], { ...job, league });
    if (!shouldFallback(backupResult)) {
      fallbackUsed = true;
      activeProvider = PROVIDER_PRIORITY[1];
      activeResult = backupResult;
    }
  }

  const metrics = { processed: 0, skipped: 0, failed: 0 };
  const now = Date.now();
  const windowMs = 3 * 24 * 60 * 60 * 1000;

  // Filter to ±3 days window, cap at 50 items
  const items = activeResult.events
    .filter((e) => Math.abs(e.startsAt.getTime() - now) <= windowMs)
    .slice(0, 50);

  // When fallback was used and primary had partial data, attempt conflict resolution
  const primaryByExtId = new Map(
    primaryResult.events.map((e) => [e.extId, e]),
  );

  for (const event of items) {
    try {
      const result = await processEvent(event);
      if (!result) { metrics.skipped++; continue; }

      let canonical = result.canonical;

      // Conflict resolution: if primary also had this event, compare
      if (fallbackUsed) {
        const primaryEvent = primaryByExtId.get(event.extId);
        if (primaryEvent) {
          const primaryProcessed = await processEvent(primaryEvent);
          if (primaryProcessed) {
            canonical = await resolveConflict(primaryProcessed.canonical, canonical);
          }
        }
      }

      await routeCanonical(canonical, result.rawRef);
      metrics.processed++;
    } catch (err: any) {
      console.error(`Pipeline: failed processing event ${event.extId}:`, err);
      await prisma.rawEvent.updateMany({
        where: { extId: event.extId, provider: activeProvider },
        data: { status: "failed" },
      });
      metrics.failed++;
    }
  }

  return {
    ...metrics,
    fallbackUsed,
    provider: activeProvider,
  };
}
