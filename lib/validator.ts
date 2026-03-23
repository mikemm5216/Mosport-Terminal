import { z } from 'zod';
import { db } from './db';

// Unified standard for validation
// If validation fails, schema validation throws, caught and routed to dead-letter queue.

export const ScheduleSchema = z.object({
  league_id: z.string(),
  home_team_id: z.string(),
  away_team_id: z.string(),
  match_date: z.string().datetime(),
  status: z.enum(["scheduled", "live", "finished"]),
});

export const ContextEventSchema = z.object({
  team_id: z.string(),
  match_id: z.string().optional(),
  event_type: z.enum(["injury", "transfer", "suspension", "weather", "coach_change", "news"]),
  impact_score: z.number().min(-100).max(100)
});

export const PositionNormalizer = (sport: "Basketball" | "Baseball" | "Football", rawPosition: string) => {
  const rs = rawPosition.toLowerCase();
  
  if (sport === "Basketball") {
    if (rs.includes("guard")) return "guard";
    if (rs.includes("forward")) return "forward";
    if (rs.includes("center")) return "center";
    return "guard"; // fallback
  }

  if (sport === "Baseball") {
    if (rs.includes("pitcher")) return "pitcher";
    if (rs.includes("two-way")) return "two-way";
    return "batter";
  }

  if (sport === "Football") {
    if (rs.includes("goal")) return "goalkeeper";
    if (rs.includes("mid")) return "midfielder";
    if (rs.includes("def")) return "defender";
    return "forward";
  }

  return rawPosition;
};

export async function sendToDeadLetterQueue(source: string, payload: any, error: any) {
  try {
    await db.deadLetterQueue.create({
      data: {
        source,
        payload: payload ? payload : {},
        error: error.message || String(error)
      }
    });
  } catch(e) {
    // DLQ Silent Fail
  }
}
