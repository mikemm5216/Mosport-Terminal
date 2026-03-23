import { db } from "../lib/db";

/**
 * Event Engine
 * Responsible for applying real-world disruptions (events) to the target team's World State.
 */

export async function applyEventModifiers(team_id: string, events: any[]) {
  const teamState = await db.teamWorldState.findUnique({
    where: { team_id }
  });

  if (!teamState) return;

  let { team_strength, fatigue, lineup_stability } = teamState;

  for (const event of events) {
    const impact = event.impact_score;
    // Example logic based on spec
    switch (event.event_type) {
      case "injury":
        team_strength -= impact;
        lineup_stability -= impact;
        break;
      case "transfer":
        team_strength += impact; // Assuming positive impact means good transfer
        lineup_stability -= (Math.abs(impact) * 0.5); // New player means lower short-term stability
        break;
      case "suspension":
        team_strength -= impact;
        lineup_stability -= impact;
        break;
      case "travel": // Maps to event_payload if we expanded, but using general fatigue
      case "weather":
        fatigue += impact;
        break;
      case "coach_change":
        lineup_stability -= impact;
        break;
      default:
        // generic news impact
        momentum += impact; // just an example
        break;
    }
  }

  // Cap the values to reasonable boundaries (e.g. 0-100 for strength, 0-1 for stability)
  team_strength = Math.max(0, Math.min(100, team_strength));
  fatigue = Math.max(0, Math.min(1, fatigue));
  lineup_stability = Math.max(0, Math.min(1, lineup_stability));

  await db.teamWorldState.update({
    where: { team_id },
    data: { team_strength, fatigue, lineup_stability }
  });
}

export async function processUnprocessedEvents() {
  const events = await db.events.findMany({
    where: {
      // Assuming we'd mark them as processed or delete them. We'll simply process recent ones here for the skeleton
      created_at: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // last 24h
    }
  });

  const eventsByTeam = events.reduce((acc: any, ev) => {
    acc[ev.team_id] = acc[ev.team_id] || [];
    acc[ev.team_id].push(ev);
    return acc;
  }, {});

  for (const team_id of Object.keys(eventsByTeam)) {
    await applyEventModifiers(team_id, eventsByTeam[team_id]);
  }
}
