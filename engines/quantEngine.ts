import { db } from "../lib/db";

/**
 * Quant Engine
 * Generates match predictions combining World State and Event impacts.
 */

export async function runQuantSimulations() {
  console.log("[Quant Engine] Running simulations for scheduled matches...");

  const upcomingMatches = await db.matches.findMany({
    where: { status: "scheduled" },
    include: {
      home_team: { include: { states: true } },
      away_team: { include: { states: true } }
    }
  });

  const results = [];

  for (const match of upcomingMatches) {
    const homeState = match.home_team.states[0] || { team_strength: 50, momentum: 0.5, fatigue: 0, home_advantage: 1.0, lineup_stability: 1.0 };
    const awayState = match.away_team.states[0] || { team_strength: 50, momentum: 0.5, fatigue: 0, home_advantage: 1.0, lineup_stability: 1.0 };

    // Example Formula
    // home_score = home_strength + home_momentum - home_fatigue + home_advantage
    
    // Convert arbitrary strength to a generic score unit (placeholder logic)
    const home_expected_score = (homeState.team_strength * 0.1) + (homeState.momentum * 5) - (homeState.fatigue * 2) + homeState.home_advantage;
    const away_expected_score = (awayState.team_strength * 0.1) + (awayState.momentum * 5) - (awayState.fatigue * 2);

    const total_expected = home_expected_score + away_expected_score;
    // Prevent div by 0
    if (total_expected === 0) continue;

    const win_probability_home = home_expected_score / total_expected;
    
    // Variance is lower if lineup stability is high
    const avg_stability = (homeState.lineup_stability + awayState.lineup_stability) / 2;
    const variance = Math.max(1.0 - avg_stability, 0.1); 

    results.push({
      match_id: match.match_id,
      home_expected_score,
      away_expected_score,
      win_probability_home,
      variance
    });
  }

  return results; // Pass to alpha engine or save directly
}
