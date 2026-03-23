import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { WorldEngine, TeamStats } from "@/lib/world-engine";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    interface TeamFromDb {
      team_id: string;
      full_name: string;
      short_name: string;
      logo_url: string | null;
      league_type: string;
    }

    const matches = await prisma.matches.findMany({
      take: 50,
      orderBy: { match_date: 'desc' },
      include: {
        home_team: true,
        away_team: true,
      }
    });

    if (matches.length === 0) {
      return NextResponse.json({ 
        success: true, 
        count: 0, 
        matches: [], 
        signals: [], 
        data: [] 
      });
    }

    // Extract all team IDs
    const teamIds = new Set<string>();
    matches.forEach(m => {
      if (m.home_team_id) teamIds.add(m.home_team_id);
      if (m.away_team_id) teamIds.add(m.away_team_id);
    });

    // Fetch team metadata for mapping
    const teamsDb = await prisma.teams.findMany({
      where: { team_id: { in: Array.from(teamIds) } }
    });
    const teamMap = new Map<string, any>(teamsDb.map(t => [t.team_id, t]));

    // Fetch previous matches (History) using the matches table
    const historicalMatches = await prisma.matches.findMany({
      where: {
        status: 'COMPLETED',
        OR: [
          { home_team_id: { in: Array.from(teamIds) } },
          { away_team_id: { in: Array.from(teamIds) } }
        ]
      },
      orderBy: { match_date: 'desc' },
      take: 100
    });

    // Helper: Map result for a team from a match
    const getResultForTeam = (m: any, teamId: string) => {
      if (m.home_score === null || m.away_score === null) return 'D';
      const isHome = m.home_team_id === teamId;
      if (m.home_score === m.away_score) return 'D';
      return (isHome ? m.home_score > m.away_score : m.away_score > m.home_score) ? 'W' : 'L';
    };

    const historyMap = new Map<string, { result: string; date: Date }[]>();
    for (const tid of teamIds) {
      const history = historicalMatches
        .filter(m => m.home_team_id === tid || m.away_team_id === tid)
        .map(m => ({
          result: getResultForTeam(m, tid),
          date: m.match_date
        }));
      historyMap.set(tid, history);
    }

    const mappedMatches = matches.map(m => {
      const homeDbTeam = m.home_team_id ? teamMap.get(m.home_team_id) : null;
      const awayDbTeam = m.away_team_id ? teamMap.get(m.away_team_id) : null;

      const homeHistory = m.home_team_id ? (historyMap.get(m.home_team_id) || []) : [];
      const awayHistory = m.away_team_id ? (historyMap.get(m.away_team_id) || []) : [];

      // Construct TeamStats for World Engine
      const homeStats: TeamStats = {
        id: homeDbTeam?.team_id || 'home',
        name: m.home_team?.full_name || 'Home',
        shortName: homeDbTeam?.short_name || (m.home_team?.full_name || 'HOM').substring(0,3).toUpperCase(),
        momentum: WorldEngine.calcMomentum(homeHistory),
        strength: WorldEngine.calcStrength(homeHistory),
        fatigue: WorldEngine.calcFatigue(homeHistory),
        history: homeHistory,
      };

      const awayStats: TeamStats = {
        id: awayDbTeam?.team_id || 'away',
        name: m.away_team?.full_name || 'Away',
        shortName: awayDbTeam?.short_name || (m.away_team?.full_name || 'AWY').substring(0,3).toUpperCase(),
        momentum: WorldEngine.calcMomentum(awayHistory),
        strength: WorldEngine.calcStrength(awayHistory),
        fatigue: WorldEngine.calcFatigue(awayHistory),
        history: awayHistory,
      };

      // RUN THE OUTCOME-DRIVEN NARRATIVE ENGINE
      const simulation = WorldEngine.runMatchSimulation(homeStats, awayStats);

      return {
        ...m,
        home_team_name: m.home_team?.full_name || 'Home',
        away_team_name: m.away_team?.full_name || 'Away',
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

    return NextResponse.json({ 
      success: true, 
      count: mappedMatches.length, 
      matches: mappedMatches,
      signals: mappedMatches, // For legacy/dashboard/warroom support
      data: mappedMatches     // For home page support
    });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      matches: [],
      signals: [],
      data: []
    });
  }
}
