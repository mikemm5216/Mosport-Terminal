import { runDataLifecyclePipeline } from "@/lib/pipeline";
import { prisma } from "@/lib/prisma";
import type { SportType } from "@/lib/ingest/types";

const COLD_LEAGUES: { sport: SportType; league: string }[] = [
  { sport: "baseball",   league: "MLB" },
  { sport: "basketball", league: "NBA" },
  { sport: "football",   league: "EPL" },
];

export async function ingestColdData() {
  const results = {
    syncTeams: 0,
    syncSchedules: 0,
    finalizedMatches: 0,
    fallbackUsed: false,
    errors: [] as string[],
  };

  for (const { sport, league } of COLD_LEAGUES) {
    // Pages: 1=today, 2=tomorrow, 3=yesterday
    for (let page = 1; page <= 3; page++) {
      try {
        const result = await runDataLifecyclePipeline({ sport, league, currentPage: page });
        results.syncSchedules += result.processed;
        if (result.fallbackUsed) results.fallbackUsed = true;
      } catch (err: any) {
        results.errors.push(`${league} p${page}: ${err.message}`);
      }
    }
  }

  // Count finalized matches (closed status updated this run)
  results.finalizedMatches = await prisma.match.count({
    where: {
      status: "finished",
      sourceUpdatedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
  });

  return results;
}
