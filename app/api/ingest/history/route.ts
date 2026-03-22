import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.error("[HISTORY INGEST] Backfilling from existing Match table...");

    // Get all completed matches with scores
    const completedMatches = await prisma.matches.findMany({
      where: {
        OR: [
          { home_score: { not: null } },
          { away_score: { not: null } },
        ]
      },
      include: {
        home_team: true,
        away_team: true,
      },
      orderBy: { match_date: 'desc' }
    });

    // Load all teams from cold DB to map team_name -> team.id
    const teams = await prisma.team.findMany();
    const teamNameToId = new Map(teams.map(t => [t.team_name, t.id]));

    console.error(`[HISTORY INGEST] Found ${completedMatches.length} completed matches.`);

    // Clear existing MatchHistory to avoid duplicates on re-run
    await prisma.matchHistory.deleteMany({});

    let count = 0;
    const inserts: Parameters<typeof prisma.matchHistory.createMany>[0]['data'] = [];

    for (const m of completedMatches) {
      const homeScore = m.home_score ?? 0;
      const awayScore = m.away_score ?? 0;
      const homeTeamName = m.home_team?.team_name;
      const awayTeamName = m.away_team?.team_name;

      if (!homeTeamName || !awayTeamName) continue;

      const homeTeamId = teamNameToId.get(homeTeamName) || homeTeamName;
      const awayTeamId = teamNameToId.get(awayTeamName) || awayTeamName;

      let homeResult = 'D', awayResult = 'D';
      if (homeScore > awayScore) { homeResult = 'W'; awayResult = 'L'; }
      else if (homeScore < awayScore) { homeResult = 'L'; awayResult = 'W'; }

      inserts.push(
        {
          team_id: homeTeamId,
          opponent: awayTeamName,
          result: homeResult,
          score_for: homeScore,
          score_against: awayScore,
          date: m.match_date,
        },
        {
          team_id: awayTeamId,
          opponent: homeTeamName,
          result: awayResult,
          score_for: awayScore,
          score_against: homeScore,
          date: m.match_date,
        }
      );

      count += 2;
    }

    if (inserts.length > 0) {
      await prisma.matchHistory.createMany({ data: inserts });
    }

    console.error(`[HISTORY INGEST] Done. Inserted ${count} records.`);
    return NextResponse.json({ success: true, count, message: `Backfilled ${count} records from existing matches.` });

  } catch (error: any) {
    console.error("[HISTORY INGEST FATAL ERROR]", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
