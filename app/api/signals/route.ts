import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. FETCH ENRICHED ALPHA SIGNALS
    const signals = await prisma.matchSignal.findMany({
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
        league_name: match.league?.id || 'PRO',
        league_id: match.league?.id || 'GLOBAL',
        match_date: match.date,
        sport: match.sport,

        // Alpha Metrics
        edge: s.edge,
        ev: s.ev,
        ra_ev: s.ra_ev,
        clv: s.clv,
        confidence: s.confidence,
        tags: s.tags || [],
        signal: s.signalLabel,
        marketFairProbs: s.marketFairProbs,

        // Team Identity
        home_team_name: match.home_team?.full_name || 'HOME',
        away_team_name: match.away_team?.full_name || 'AWAY',
        home_short_name: match.home_team?.short_name || 'HOM',
        away_short_name: match.away_team?.short_name || 'AWY',
        home_logo: match.home_team?.logo_url || null,
        away_logo: match.away_team?.logo_url || null,

        home_team_id: match.homeTeamId,
        away_team_id: match.awayTeamId
      };
    }).filter(Boolean);

    return NextResponse.json({ success: true, count: data.length, data });
  } catch (e: any) {
    console.error("V11.5 Signal API failure:", e.message, e.stack);
    return NextResponse.json({ success: false, error: e.message || "Internal Server Error" }, { status: 500 });
  }
}
