import { db } from "../lib/db";
import { ContextEventSchema, sendToDeadLetterQueue } from "../lib/validator";

// Tier 3 - Context Crawler
export async function runContextCrawler() {
  console.log("[Context Crawler] Scraping Tier 3 News and Event Data...");

  // Mock NLP extraction from news
  const mockNewsData = [
    { team_id: "team_a", event_type: "injury", impact_score: 15.5 }, // e.g. Star player injury
    { team_id: "team_b", event_type: "coach_change", impact_score: 20.0 }
  ];

  for (const event of mockNewsData) {
    try {
      const valid = ContextEventSchema.parse(event);
      
      await db.events.create({
        data: valid
      });
      // Will be processed by Event Engine in the pipeline
      
    } catch(e: any) {
      await sendToDeadLetterQueue("contextCrawler", event, e);
    }
  }
}
