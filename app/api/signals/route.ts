import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. FETCH ENRICHED ALPHA SIGNALS
    const signals = await (prisma as any).matchSignal.findMany({
      take: 40,
      include: {
        match: {
          include: {
            home_team: true,
            away_team: true,
            league: {
              select: {
                id: true,
                sport: true
              }
            }
          }
        }
      }
    });

    console.log(`[API] Found ${signals.length} signals.`);

    const data = signals.map((s: any) => {
      const match = s.match;
      if (!match) return null;

      return {
        match_id: s.matchId,
        signalId: s.id,
        league_id: match.league?.id || 'GLOBAL',
        date: match.date,
        sport: match.sport,

        // Alpha Metrics
        edge: s.edge,
        ev: s.ev,
        ra_ev: s.ra_ev,
        clv: s.clv,
        confidence: s.confidence,
        tags: s.tags || [],
        signalLabel: s.signalLabel,
        signalScore: s.signalScore,
        marketFairProbs: s.marketFairProbs,

        // Team Identity (Aligned with ESPNStyleScoreboard)
        homeTeamName: match.home_team?.full_name || match.homeTeamName || 'HOME',
        awayTeamName: match.away_team?.full_name || match.awayTeamName || 'AWAY',
        homeTeamId: match.homeTeamId || match.home_team?.team_id || 'HOM',
        awayTeamId: match.awayTeamId || match.away_team?.team_id || 'AWY',
        home_logo: match.home_team?.logo_url || null,
        away_logo: match.away_team?.logo_url || null
      };
    }).filter(Boolean);

    return NextResponse.json({ success: true, count: data.length, data });
  } catch (e: any) {
    console.error("Signal API failure:", e.message, e.stack);
    return NextResponse.json({ success: false, error: e.message || "Internal Server Error" }, { status: 500 });
  }
}
