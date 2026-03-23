import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { WorldEngine, TeamStats } from "@/lib/world-engine";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const matches = await prisma.matches.findMany({
      take: 50,
      orderBy: { match_date: 'desc' },
      include: {
        home_team: true,
        away_team: true,
        league: true,
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

    const teamMap = new Map(teamsDb.map(t => [t.team_name, t]));

    // Fetch match history for all teams
    const teamIds = teamsDb.map(t => t.id);
    const allHistory = await prisma.matchHistory.findMany({
      where: { team_id: { in: teamIds } },
      orderBy: { date: 'desc' }
    });

    // Build history map: team_id -> sorted objects
    const historyMap = new Map<string, typeof allHistory>();
    for (const h of allHistory) {
      const existing = historyMap.get(h.team_id) || [];
      existing.push(h);
      historyMap.set(h.team_id, existing);
    }

    const mappedMatches = matches.map(m => {
      const homeDbTeam = m.home_team ? teamMap.get(m.home_team.team_name) : null;
      const awayDbTeam = m.away_team ? teamMap.get(m.away_team.team_name) : null;

      const homeHistory = homeDbTeam ? (historyMap.get(homeDbTeam.id) || []) : [];
      const awayHistory = awayDbTeam ? (historyMap.get(awayDbTeam.id) || []) : [];

      // Construct TeamStats for World Engine
      const homeStats: TeamStats = {
        id: homeDbTeam?.id || 'home',
        name: m.home_team?.team_name || 'Home',
        shortName: homeDbTeam?.short_name || (m.home_team?.team_name?.substring(0,3).toUpperCase() ?? 'HOM'),
        momentum: WorldEngine.calcMomentum(homeHistory),
        strength: WorldEngine.calcStrength(homeHistory),
        fatigue: WorldEngine.calcFatigue(homeHistory),
        history: homeHistory,
      };

      const awayStats: TeamStats = {
        id: awayDbTeam?.id || 'away',
        name: m.away_team?.team_name || 'Away',
        shortName: awayDbTeam?.short_name || (m.away_team?.team_name?.substring(0,3).toUpperCase() ?? 'AWY'),
        momentum: WorldEngine.calcMomentum(awayHistory),
        strength: WorldEngine.calcStrength(awayHistory),
        fatigue: WorldEngine.calcFatigue(awayHistory),
        history: awayHistory,
      };

      // RUN THE OUTCOME-DRIVEN NARRATIVE ENGINE
      const simulation = WorldEngine.runMatchSimulation(homeStats, awayStats);

      return {
        ...m,
        home_team_name: m.home_team_name || m.home_team?.team_name || 'Home',
        away_team_name: m.away_team_name || m.away_team?.team_name || 'Away',
        home_logo: homeDbTeam?.logo_url || null,
        away_logo: awayDbTeam?.logo_url || null,
        home_short_name: homeStats.shortName,
        away_short_name: awayStats.shortName,
        // Narrative Props
        primaryTag: simulation.primaryTag,
        tagTarget: simulation.tagTarget,
        marketSentiment: simulation.marketSentiment,
        standardAnalysis: simulation.standardAnalysis,
        predictedWinner: simulation.predictedWinner,
        confidence: simulation.confidence,
        // Legacy streak fields
        home_streak: WorldEngine.getStreakCount(homeHistory).type + WorldEngine.getStreakCount(homeHistory).count,
        away_streak: WorldEngine.getStreakCount(awayHistory).type + WorldEngine.getStreakCount(awayHistory).count,
      };
    });

    return NextResponse.json({ success: true, count: mappedMatches.length, data: mappedMatches });
  } catch (error: any) {
    console.error("[SIGNALS API ERROR]", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
