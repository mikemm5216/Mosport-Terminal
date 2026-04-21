import { db } from "../lib/db";
import { ScheduleSchema, sendToDeadLetterQueue } from "../lib/validator";

// Tier 1 - Schedule Crawler (Mock logic for representation)
export async function runScheduleCrawler() {
  
  // MOCK API FETCH
  const rawData = [
    {
      league_id: "idx1",
      home_team_id: "team_a",
      away_team_id: "team_b",
      match_date: new Date(Date.now() + 86400000).toISOString(),
      status: "scheduled"
    }
  ];

  for (const item of rawData) {
    try {
      // 1. Zod Validation (Anti-Corruption Layer)
      const valid = ScheduleSchema.parse(item);
      
      // 2. Upsert to Reality DB
      await db.matches.create({ // Ensure ids exist in real code, mock uses specific hardcodes
        data: {
          league_id: valid.league_id,
          home_team_id: valid.home_team_id,
          away_team_id: valid.away_team_id,
          match_date: valid.match_date,
          status: valid.status
        }
      });
      
    } catch (e: any) {
      await sendToDeadLetterQueue("scheduleCrawler", item, e);
    }
  }
}
