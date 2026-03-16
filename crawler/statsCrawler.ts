import { z } from "zod";
import { prisma } from "../db/prisma";

const StatsSchema = z.object({
  match_id: z.string(),
  home_score: z.number(),
  away_score: z.number(),
  home_turnovers: z.number().optional().default(0),
  away_turnovers: z.number().optional().default(0),
  raw_stats: z.record(z.any()).optional(),
});

export async function runStatsCrawler(mockData?: any[]) {
  console.log("[StatsCrawler] Fetching box score stats...");

  const data = mockData || [];

  for (const item of data) {
    const result = StatsSchema.safeParse(item);

    if (!result.success) {
      await prisma.deadLetterQueue.create({
        data: {
          source: "StatsCrawler",
          payload: item,
          error: result.error.message,
        },
      });
      continue;
    }

    const { match_id, home_score, away_score, home_turnovers, away_turnovers, raw_stats } = result.data;

    await prisma.matchStats.upsert({
      where: { match_id },
      update: {
        home_score,
        away_score,
        home_turnovers,
        away_turnovers,
        raw_stats: raw_stats ?? null,
      },
      create: {
        match_id,
        home_score,
        away_score,
        home_turnovers,
        away_turnovers,
        raw_stats: raw_stats ?? null,
      },
    });
  }

  console.log("[StatsCrawler] Completed.");
}
