import { z } from "zod";
import { prisma } from "../db/prisma";

const OddsSchema = z.object({
  match_id: z.string(),
  market_home_prob: z.number(),
  market_away_prob: z.number(),
  source: z.literal("Global Market Average"),
});

export async function runOddsCrawler(mockData?: any[]) {

  const data = mockData || [];

  for (const item of data) {
    const result = OddsSchema.safeParse(item);

    if (!result.success) {
      await prisma.deadLetterQueue.create({
        data: {
          source: "OddsCrawler",
          payload: item,
          error: result.error.message,
        },
      });
      continue;
    }

    const { match_id, market_home_prob, market_away_prob, source } = result.data;

    // Assuming we insert a new odds record or update the latest one.
    // Schema allows multiple odds, so we can just create a new record.
    await prisma.odds.create({
      data: {
        match_id,
        market_home_prob,
        market_away_prob,
        source,
      },
    });
  }

}
