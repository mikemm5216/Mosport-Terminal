import { z } from "zod";
import { prisma } from "../db/prisma";

const MatchSchema = z.object({
  id: z.string(),
  league_id: z.string(),
  home_team_id: z.string(),
  away_team_id: z.string(),
  match_date: z.string().datetime(),
  status: z.enum(["scheduled", "live", "finished"]),
});

export async function runMatchCrawler(mockData?: any[]) {
  console.log("[MatchCrawler] Fetching match schedules...");

  // In real life, fetch from external API. Using mockData for simulation.
  const data = mockData || [];

  for (const item of data) {
    const result = MatchSchema.safeParse(item);

    if (!result.success) {
      await prisma.deadLetterQueue.create({
        data: {
          source: "MatchCrawler",
          payload: item,
          error: result.error.message,
        },
      });
      continue;
    }

    const { id, league_id, home_team_id, away_team_id, match_date, status } = result.data;

    // We assume the teams and league exist or we create placeholders (simplified)
    await prisma.match.upsert({
      where: { id },
      update: { status, match_date: new Date(match_date) },
      create: {
        id,
        league_id,
        home_team_id,
        away_team_id,
        match_date: new Date(match_date),
        status,
      },
    });
  }

  console.log("[MatchCrawler] Completed.");
}
