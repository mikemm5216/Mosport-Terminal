import { db } from "../lib/db";

/**
 * Quant Engine (Pre-Match Analytics Only)
 * MUST NOT update probabilities for matches that are 'live' or 'finished'.
 */

export async function runQuantSimulations() {

  const upcomingMatches = await db.matches.findMany({
    where: { status: "scheduled" },
    include: {
      home_team: { include: { states: { orderBy: { updated_at: 'desc' }, take: 1 } } },
      away_team: { include: { states: { orderBy: { updated_at: 'desc' }, take: 1 } } }
    }
  });

  const results = [];

  for (const match of upcomingMatches) {
    const homeState = match.home_team.states[0] || { team_strength: 50, momentum: 0.5, fatigue: 0, home_advantage: 1.0, lineup_stability: 1.0 };
    const awayState = match.away_team.states[0] || { team_strength: 50, momentum: 0.5, fatigue: 0, home_advantage: 1.0, lineup_stability: 1.0 };

    const home_expected_score = (homeState.team_strength * 0.1) + (homeState.momentum * 5) - (homeState.fatigue * 2) + homeState.home_advantage;
    const away_expected_score = (awayState.team_strength * 0.1) + (awayState.momentum * 5) - (awayState.fatigue * 2);

    const total_expected = home_expected_score + away_expected_score;
    if (total_expected === 0) continue;

    const win_probability_home = home_expected_score / total_expected;
    const avg_stability = (homeState.lineup_stability + awayState.lineup_stability) / 2;
    const variance = Math.max(1.0 - avg_stability, 0.1); 

    results.push({
      match_id: match.match_id,
      status: match.status,
      home_expected_score,
      away_expected_score,
      win_probability_home,
      variance
    });
  }

  return results; 
}
