import { z } from "zod";
import { prisma } from "@/lib/prisma";

const MatchSchema = z.object({
  id: z.string(),
  league_id: z.string(),
  home_team_id: z.string(),
  away_team_id: z.string(),
  match_date: z.string().datetime(),
  status: z.enum(["scheduled", "live", "finished"]),
});

export async function runMatchCrawler(mockData?: any[]) {
  let data = mockData || [];

  if (data.length === 0) {
    // Production Fetch Logic from TheSportsDB
    const dateStr = new Date().toISOString().split("T")[0];
    const targetUrl = `https://www.thesportsdb.com/api/v1/json/3/eventsday.php?d=${dateStr}`;
    try {
      const res = await fetch(targetUrl);
      if (res.ok) {
        const json = await res.json();
        const events = json.events || [];
        data = events.map((e: any) => ({
          id: String(e.idEvent),
          league_id: (e.strLeague || "MLB").includes("MLB") ? "MLB" : "NBA", 
          home_team_id: String(e.idHomeTeam || e.strHomeTeam).replace(/\s/g, "_"),
          away_team_id: String(e.idAwayTeam || e.strAwayTeam).replace(/\s/g, "_"),
          match_date: `${e.dateEvent}T${e.strTime || "00:00:00"}Z`,
          status: e.intHomeScore !== null ? "finished" : "scheduled"
        }));
      }
    } catch (e) {
      console.error("[MatchCrawler_Fetch_Error]", e);
    }
  }

  let count = 0;
  for (const item of data) {
    const result = MatchSchema.safeParse(item);
    if (!result.success) {
      await prisma.deadLetterQueue.create({
        data: { source: "MatchCrawler", payload: item, error: result.error.message },
      });
      continue;
    }

    const { id, league_id, home_team_id, away_team_id, match_date, status } = result.data;

    await prisma.matches.upsert({
      where: { match_id: id },
      update: { status, match_date: new Date(match_date) },
      create: {
        match_id: id,
        home_team_id,
        away_team_id,
        match_date: new Date(match_date),
        status: status as any,
        league_id: league_id === "MLB" ? "MLB" : "NBA"
      },
    });
    count++;
  }

  return count;
}
