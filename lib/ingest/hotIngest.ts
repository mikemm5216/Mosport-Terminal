import { runDataLifecyclePipeline } from "@/lib/pipeline";
import { prisma } from "@/lib/prisma";
import type { SportType } from "@/lib/ingest/types";

const MIN_INTERVAL_MS = 2 * 60 * 1000;

const HOT_LEAGUES: { sport: SportType; league: string }[] = [
  { sport: "baseball",   league: "MLB" },
  { sport: "basketball", league: "NBA" },
  { sport: "football",   league: "EPL" },
];

export async function ingestHotData() {
  const lastUpdate = await prisma.ingestionState.findFirst({
    where: { sport: "HOT_INGEST", league: "ALL" },
  });

  if (lastUpdate && Date.now() - new Date(lastUpdate.lastRunAt).getTime() < MIN_INTERVAL_MS) {
    return { status: "ok", skipped: true, reason: "freshness_guard", lastRun: lastUpdate.lastRunAt };
  }

  let totalProcessed = 0;
  let fallbackUsed = false;
  const errors: string[] = [];

  for (const { sport, league } of HOT_LEAGUES) {
    try {
      const result = await runDataLifecyclePipeline({ sport, league, currentPage: 1 });
      totalProcessed += result.processed;
      if (result.fallbackUsed) fallbackUsed = true;
    } catch (err: any) {
      errors.push(`${league}: ${err.message}`);
    }
  }

  await prisma.ingestionState.upsert({
    where: { provider_sport_league: { provider: "HOT", sport: "HOT_INGEST", league: "ALL" } },
    update: { lastRunAt: new Date(), status: errors.length ? "failed" : "success" },
    create: { provider: "HOT", sport: "HOT_INGEST", league: "ALL", lastRunAt: new Date(), status: "success" },
  });

  return {
    status: errors.length === HOT_LEAGUES.length ? "error" : "ok",
    skipped: false,
    fallbackUsed,
    updatedCount: totalProcessed,
    errors,
    lastUpdatedAt: new Date().toISOString(),
  };
}
