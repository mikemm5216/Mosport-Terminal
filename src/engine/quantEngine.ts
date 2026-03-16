import { prisma } from "../db/prisma";

export async function runQuantEngine() {
  console.log("[Quant Engine] Computing expected match outcomes...");
  const variance_baseline = 0.15;

  // Fetch upcoming scheduled matches
  const scheduledMatches = await prisma.match.findMany({
    where: { status: "scheduled" },
    include: {
      home_team: { include: { states: true } },
      away_team: { include: { states: true } }
    }
  });

  for (const match of scheduledMatches) {
    const homeState = match.home_team.states[0];
    const awayState = match.away_team.states[0];

    // Fallbacks if state is not available yet
    const hStrength = homeState?.team_strength || 50;
    const hMomentum = homeState?.momentum || 0.5;
    const aStrength = awayState?.team_strength || 50;
    const aMomentum = awayState?.momentum || 0.5;

    // Example model: expected_score = team_strength + momentum (simplified mapping into realistic scores later, using raw sum for now)
    const expected_home_score = hStrength + (hMomentum * 10);
    const expected_away_score = aStrength + (aMomentum * 10);

    await prisma.quantMetrics.upsert({
      where: { match_id: match.id },
      update: {
        expected_home_score,
        expected_away_score,
        variance: variance_baseline,
      },
      create: {
        match_id: match.id,
        expected_home_score,
        expected_away_score,
        variance: variance_baseline,
      }
    });
  }

  console.log("[Quant Engine] Completed.");
}
