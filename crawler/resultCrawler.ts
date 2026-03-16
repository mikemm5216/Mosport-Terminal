import { db } from "../lib/db";
import { z } from "zod";
import { sendToDeadLetterQueue } from "../lib/validator";

const ResultSchema = z.object({
  match_id: z.string(),
  home_score: z.number().int().min(0),
  away_score: z.number().int().min(0),
  raw_stats: z.record(z.any())
});

// Tier 1 - Result Crawler
export async function runResultCrawler() {
  console.log("[Result Crawler] Fetching Tier 1 Match Results & Box Scores...");

  const mockApiData = [
    { match_id: "idx1", home_score: 102, away_score: 98, raw_stats: { rebounds: 40, assists: 20 } }
  ];

  for (const item of mockApiData) {
    try {
      const valid = ResultSchema.parse(item);
      
      await db.matchStats.upsert({
        where: { match_id: valid.match_id },
        update: { home_score: valid.home_score, away_score: valid.away_score, raw_stats: valid.raw_stats },
        create: { ...valid }
      });

      // Update match status
      await db.matches.update({
        where: { match_id: valid.match_id },
        data: { status: "finished" }
      });

    } catch(e: any) {
      await sendToDeadLetterQueue("resultCrawler", item, e);
    }
  }
}
