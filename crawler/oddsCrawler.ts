import { z } from "zod";
import { prisma } from "@/lib/prisma";

const OddsSchema = z.object({
  match_id: z.string(),
  market_home_prob: z.number(),
  market_away_prob: z.number(),
  source: z.string(),
});

export async function runOddsCrawler(mockData?: any[]) {
  let data = mockData || [];

  if (data.length === 0) {
    const apiKey = process.env.ODDS_API_KEY;
    if (apiKey) {
      const targetUrl = `https://api.the-odds-api.com/v4/sports/upcoming/odds/?regions=us&markets=h2h&apiKey=${apiKey}`;
      try {
        const res = await fetch(targetUrl);
        if (res.ok) {
          const events = await res.json();
          data = events.map((e: any) => ({
            match_id: String(e.id),
            market_home_prob: e.bookmakers?.[0]?.markets?.[0]?.outcomes?.[0]?.price || 1.9,
            market_away_prob: e.bookmakers?.[0]?.markets?.[0]?.outcomes?.[1]?.price || 1.9,
            source: "TheOddsAPI"
          }));
        }
      } catch (e) {
        console.error("[OddsCrawler_Fetch_Error]", e);
      }
    }
  }

  let count = 0;
  for (const item of data) {
    const result = OddsSchema.safeParse(item);
    if (!result.success) {
      await prisma.deadLetterQueue.create({
        data: { source: "OddsCrawler", payload: item, error: result.error.message },
      });
      continue;
    }

    const { match_id, market_home_prob, market_away_prob, source } = result.data;
    await prisma.odds.create({
      data: { match_id, market_home_prob, market_away_prob, source },
    });
    count++;
  }

  return count;
}
