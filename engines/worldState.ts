import { prisma } from "../db/prisma";

export async function runWorldState() {
  console.log("[WorldState Engine] Computing team states...");
  
  // Logic: Compute team state using last 10 matches.
  // Variables: team_strength, momentum, fatigue.
  // Store results in team_state table.

  const teams = await prisma.team.findMany();

  for (const team of teams) {
    // 1. Fetch last 10 matches for the team
    const recentMatches = await prisma.match.findMany({
      where: {
        status: "finished",
        OR: [{ home_team_id: team.id }, { away_team_id: team.id }],
      },
      orderBy: { match_date: "desc" },
      take: 10,
      include: { stats: true },
    });

    let wins = 0;
    let totalScore = 0;

    for (const m of recentMatches) {
      if (!m.stats) continue;
      const isHome = m.home_team_id === team.id;
      const teamScore = isHome ? m.stats.home_score : m.stats.away_score;
      const oppScore = isHome ? m.stats.away_score : m.stats.home_score;
      
      totalScore += teamScore;
      if (teamScore > oppScore) wins++;
    }

    // Simplified calculation for demonstration
    const team_strength = recentMatches.length > 0 ? totalScore / recentMatches.length : 50;
    const momentum = recentMatches.length > 0 ? wins / recentMatches.length : 0.5;
    
    // Calculate fatigue based on recent match frequency (simplified)
    const now = new Date();
    const lastMatchDate = recentMatches[0]?.match_date || now;
    const daysSinceLastMatch = (now.getTime() - new Date(lastMatchDate).getTime()) / (1000 * 3600 * 24);
    const fatigue = Math.max(0, 10 - daysSinceLastMatch) / 10; // 0 to 1 scale

    // Upsert the team state
    await prisma.teamState.upsert({
      where: {
        // We need a unique constraint or just find first. Adding team_id unique manually or handling it.
        // Wait, schema has id as pk, no unique on team_id. We should probably just use findFirst and update, or upsert if team_id was unique.
        // Actually, schema doesn't have @unique on team_id in TeamState. Let's fix this in the upsert by doing soft-upsert.
        id: (await prisma.teamState.findFirst({ where: { team_id: team.id } }))?.id || "new",
      },
      update: {
        team_strength,
        momentum,
        fatigue,
      },
      create: {
        team_id: team.id,
        team_strength,
        momentum,
        fatigue,
      },
    });
  }

  console.log("[WorldState Engine] Completed.");
}
