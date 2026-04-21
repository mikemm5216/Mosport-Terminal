import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSimilarity } from "@/lib/fuzzy";

const OddsSchema = z.object({
  external_id: z.string(),
  home_team_name: z.string(),
  away_team_name: z.string(),
  commence_time: z.string(),
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
            external_id: String(e.id),
            home_team_name: e.home_team,
            away_team_name: e.away_team,
            commence_time: e.commence_time,
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

    const { external_id, home_team_name, away_team_name, commence_time, market_home_prob, market_away_prob, source } = result.data;
    
    // 1. Check existing mapping
    let mapping = await prisma.externalMatchMap.findUnique({
      where: { external_id }
    });

    let internal_id: string | null = mapping?.internal_id || null;

    // 2. Fuzzy Match if no mapping exists
    if (!internal_id) {
      const oddDate = new Date(commence_time);
      const startTimeRange = new Date(oddDate.getTime() - 15 * 60 * 1000);
      const endTimeRange = new Date(oddDate.getTime() + 15 * 60 * 1000);

      const candidates = await prisma.matches.findMany({
        where: {
          match_date: {
            gte: startTimeRange,
            lte: endTimeRange,
          }
        },
        include: {
          home_team: true,
          away_team: true
        }
      });

      for (const match of candidates) {
        const homeSim = getSimilarity(home_team_name, match.home_team.full_name);
        const awaySim = getSimilarity(away_team_name, match.away_team.full_name);

        if (homeSim > 0.8 && awaySim > 0.8) {
          internal_id = match.match_id;
          // Persistence: save the mapping immediately
          await prisma.externalMatchMap.create({
            data: {
              external_id,
              internal_id: match.match_id,
              provider: source,
              match_date: match.match_date,
              home_team: home_team_name,
              away_team: away_team_name
            }
          });
          break;
        }
      }
    }

    // 3. Create Odds record if matched
    if (internal_id) {
      await prisma.odds.create({
        data: {
          match_id: internal_id,
          market_home_prob,
          market_away_prob,
          source,
        },
      });
      count++;
    }
  }

  return count;
}
