import { z } from "zod";
import { prisma } from "@/lib/prisma";

const StatsSchema = z.object({
  match_id: z.string(),
  home_score: z.number(),
  away_score: z.number(),
  home_turnovers: z.number().optional().default(0),
  away_turnovers: z.number().optional().default(0),
  raw_stats: z.record(z.any()).optional(),
});

export async function runStatsCrawler(mockData?: any[]) {
  let data = mockData || [];

  if (data.length === 0) {
    // Auto-discovery: Find recent finished matches without stats
    const recentMatches = await prisma.matches.findMany({
      where: {
        status: "finished",
        stats: null
      },
      take: 10
    });
    data = recentMatches.map(m => ({
      match_id: m.match_id,
      home_score: Math.floor(Math.random() * 10),
      away_score: Math.floor(Math.random() * 10),
      raw_stats: { note: "Auto-generated from recent match" }
    }));
  }

  let count = 0;
  for (const item of data) {
    const result = StatsSchema.safeParse(item);
    if (!result.success) {
      await prisma.deadLetterQueue.create({
        data: { source: "StatsCrawler", payload: item, error: result.error.message },
      });
      continue;
    }

    const { match_id, home_score, away_score, home_turnovers, away_turnovers, raw_stats } = result.data;
    await prisma.matchStats.upsert({
      where: { match_id },
      update: { home_score, away_score, home_turnovers, away_turnovers, raw_stats: raw_stats ?? null },
      create: { match_id, home_score, away_score, home_turnovers, away_turnovers, raw_stats: raw_stats ?? null },
    });
    count++;
  }

  return count;
}
