import { prisma } from "@/lib/prisma";

export async function runWorldState() {
  const teams = await prisma.teams.findMany();

  for (const team of teams) {
    const recentMatches = await prisma.matches.findMany({
      where: {
        status: "COMPLETED",
        OR: [{ home_team_id: team.team_id }, { away_team_id: team.team_id }],
      },
      orderBy: { match_date: "desc" },
      take: 10,
      include: { stats: true },
    });

    let wins = 0;
    let totalScore = 0;

    for (const m of recentMatches) {
      if (!m.stats) continue;
      const isHome = m.home_team_id === team.team_id;
      const teamScore = isHome ? m.stats.home_score : m.stats.away_score;
      const oppScore = isHome ? m.stats.away_score : m.stats.home_score;
      
      totalScore += teamScore;
      if (teamScore > oppScore) wins++;
    }

    const team_strength = recentMatches.length > 0 ? totalScore / recentMatches.length : 50;
    const momentum = recentMatches.length > 0 ? wins / recentMatches.length : 0.5;
    
    const now = new Date();
    const lastMatchDate = recentMatches[0]?.match_date || now;
    const daysSinceLastMatch = (now.getTime() - new Date(lastMatchDate).getTime()) / (1000 * 3600 * 24);
    const fatigue = Math.max(0, 10 - daysSinceLastMatch) / 10;

    // Store in EventSnapshot as TEAM_STATE
    await prisma.eventSnapshot.create({
      data: {
        match_id: team.team_id, // Using team_id as match_id for team-level snapshots
        snapshot_type: "TEAM_STATE",
        state_json: {
          team_strength,
          momentum,
          fatigue,
          computed_at: now.toISOString()
        } as any
      }
    });
  }
}
