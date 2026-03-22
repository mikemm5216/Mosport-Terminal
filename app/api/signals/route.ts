import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// Calculate ESPN-style streak from ordered match history
function calcStreak(history: { result: string }[]): string | null {
  if (!history || history.length === 0) return null;
  const first = history[0].result;
  let count = 1;
  for (let i = 1; i < history.length; i++) {
    if (history[i].result === first) {
      count++;
    } else break;
  }
  if (first === 'W') {
    return count === 1 ? '1-GAME WIN STREAK' : `${count}-GAME WIN STREAK`;
  } else if (first === 'L') {
    return count === 1 ? 'LOST LAST 1' : `LOST LAST ${count}`;
  } else {
    return count === 1 ? '1 DRAW' : `${count} DRAWS`;
  }
}

export async function GET() {
  try {
    const matches = await prisma.matches.findMany({
      take: 50,
      orderBy: { match_date: 'desc' },
      include: {
        home_team: true,
        away_team: true,
        snapshots: {
          take: 1,
          orderBy: { snapshot_time: 'desc' }
        }
      }
    });

    // Extract all team names
    const teamNames = new Set<string>();
    matches.forEach(m => {
      if (m.home_team?.team_name) teamNames.add(m.home_team.team_name);
      if (m.away_team?.team_name) teamNames.add(m.away_team.team_name);
    });

    // Fetch from Team cold DB
    const teamsDb = await prisma.team.findMany({
      where: { team_name: { in: Array.from(teamNames) } }
    });

    // Debug log
    console.error(`[SIGNALS] Matches: ${matches.length}, Cold DB teams: ${teamsDb.length}`);

    const teamMap = new Map(teamsDb.map(t => [t.team_name, t]));

    // Fetch match history for streaks (keyed by team.id)
    const teamIds = teamsDb.map(t => t.id);
    const allHistory = await prisma.matchHistory.findMany({
      where: { team_id: { in: teamIds } },
      orderBy: { date: 'desc' },
      select: { team_id: true, result: true }
    });

    // Build history map: team_id -> sorted results (already desc by date)
    const historyMap = new Map<string, { result: string }[]>();
    for (const h of allHistory) {
      const existing = historyMap.get(h.team_id) || [];
      existing.push({ result: h.result });
      historyMap.set(h.team_id, existing);
    }

    const mappedMatches = matches.map(m => {
      const homeDbTeam = m.home_team ? teamMap.get(m.home_team.team_name) : null;
      const awayDbTeam = m.away_team ? teamMap.get(m.away_team.team_name) : null;

      const homeHistory = homeDbTeam ? (historyMap.get(homeDbTeam.id) || []) : [];
      const awayHistory = awayDbTeam ? (historyMap.get(awayDbTeam.id) || []) : [];

      return {
        ...m,
        home_logo: homeDbTeam?.logo_url || null,
        away_logo: awayDbTeam?.logo_url || null,
        home_short_name: homeDbTeam?.short_name || (m.home_team?.team_name?.substring(0,3).toUpperCase() ?? null),
        away_short_name: awayDbTeam?.short_name || (m.away_team?.team_name?.substring(0,3).toUpperCase() ?? null),
        home_streak: calcStreak(homeHistory),
        away_streak: calcStreak(awayHistory),
      };
    });

    return NextResponse.json({ success: true, count: mappedMatches.length, data: mappedMatches });
  } catch (error: any) {
    console.error("[SIGNALS API ERROR]", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
