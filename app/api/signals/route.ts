import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. FETCH ENRICHED V11.5+ SIGNALS
    const signals = await prisma.matchSignal.findMany({
      where: { is_active: true },
      take: 40,
      include: {
        match: {
          include: {
            home_team: true,
            away_team: true,
            league: true
          }
        }
      }
    });

    if (signals.length > 0) {
      const data = signals.map((s: any) => ({
        match_id: s.matchId,
        league_name: s.match.league?.name || 'PRO',
        league_id: s.match.league?.id || 'GLOBAL',
        match_date: s.match.date,
        sport: s.match.sport,

        // V11.5+ Metrics
        edge: s.edge,
        ev: s.ev,
        ra_ev: s.ra_ev,
        clv: s.clv,
        confidence: s.confidence,
        tags: s.tags || [],
        signal: s.signalLabel,

        // Team Identity (Localized V16.2)
        home_team_name: s.match.home_team.full_name,
        away_team_name: s.match.away_team.full_name,
        home_short_name: s.match.home_team.short_name,
        away_short_name: s.match.away_team.short_name,
        home_logo: s.match.home_team.logo_url || null,
        away_logo: s.match.away_team.logo_url || null,
        home_logo_url: s.match.home_team.logo_url || null,
        away_logo_url: s.match.away_team.logo_url || null,

        home_team_id: s.match.homeTeamId,
        away_team_id: s.match.awayTeamId
      }));

      return NextResponse.json({ success: true, count: data.length, data });
    }
  } catch (e) {
    console.error("V15.5 Signal API failure:", e);
  }

  // 2. V15.5 MOCK FALLBACK (Localized V16.2)
  const mockData = [
    {
      match_id: "EPL-CRY-WHU-001",
      league_name: "EPL",
      league_id: "EPL",
      match_date: "2026-03-24T10:18:00Z",
      sport: "football",
      edge: 0.12,
      ra_ev: 0.15,
      clv: 0.08,
      confidence: 0.82,
      tags: ["UPSET ALERT", "SHARP_MONEY"],
      signal: "STRONG",
      home_team_name: "Crystal Palace",
      away_team_name: "West Ham United",
      home_short_name: "CRY",
      away_short_name: "WHU",
      home_logo: null,
      away_logo: null,
      home_logo_url: null,
      away_logo_url: null
    },
    {
      match_id: "NBA-LAL-GSW-001",
      league_name: "NBA",
      league_id: "NBA",
      match_date: "2026-03-24T22:30:00Z",
      sport: "basketball",
      edge: 0.18,
      ra_ev: 0.22,
      clv: 0.12,
      confidence: 0.94,
      tags: ["SYSTEM LOCK", "ELITE_VALUE"],
      signal: "ELITE",
      home_team_name: "LA Lakers",
      away_team_name: "GS Warriors",
      home_short_name: "LAL",
      away_short_name: "GSW",
      home_logo: null,
      away_logo: null,
      home_logo_url: null,
      away_logo_url: null
    }
  ];

  return NextResponse.json({
    success: true,
    count: mockData.length,
    data: mockData
  });
}
