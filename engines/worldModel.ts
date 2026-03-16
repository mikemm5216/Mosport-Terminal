import { db } from "../lib/db";

/**
 * World Model Engine
 * Responsible for updating team state after every match.
 * Computes momentum and fatigue based on match history.
 */
export async function updateWorldModel() {
  console.log("[World Model] Updating dynamic competitive states for all teams...");

  const teams = await db.teams.findMany();

  for (const team of teams) {
    // 1. Fetch recent matches for momentum (last 10 matches)
    const recentMatches = await db.matches.findMany({
      where: {
        status: "finished",
        OR: [{ home_team_id: team.team_id }, { away_team_id: team.team_id }]
      },
      orderBy: { match_date: 'desc' },
      take: 10,
      include: { stats: true }
    });

    let wins = 0;
    for (const m of recentMatches) {
      if (!m.stats) continue;
      const isHome = m.home_team_id === team.team_id;
      const teamScore = isHome ? m.stats.home_score : m.stats.away_score;
      const oppScore = isHome ? m.stats.away_score : m.stats.home_score;
      if (teamScore > oppScore) wins++;
    }

    const momentum = recentMatches.length > 0 ? (wins / recentMatches.length) : 0.5;

    // 2. Fetch matches in last 7 days for fatigue
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const matchesLast7Days = await db.matches.count({
      where: {
        status: "finished",
        match_date: { gte: sevenDaysAgo },
        OR: [{ home_team_id: team.team_id }, { away_team_id: team.team_id }]
      }
    });

    const fatigue = Math.min(1.0, matchesLast7Days * 0.1); 

    // Update World State in db
    await db.teamWorldState.upsert({
      where: { team_id: team.team_id },
      update: { momentum, fatigue },
      create: {
        team_id: team.team_id,
        team_strength: 50.0, // Default baseline, updated by specific strength scripts
        momentum,
        fatigue,
        lineup_stability: 1.0,
        home_advantage: 1.0
      }
    });
  }
}
