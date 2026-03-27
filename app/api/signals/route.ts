import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { WorldEngine, TeamStats } from "@/lib/world-engine";

export const dynamic = 'force-dynamic';

export async function GET() {
  // EMERGENCY HARDCODED MOCK (V11.5 PROD SAMPLE)
  const mockResult = [
    {
      match_id: "LIV-001",
      home_team_name: "Liverpool",
      away_team_name: "Opponent",
      home_short_name: "LIV",
      away_short_name: "OPP",
      match_date: new Date(),
      edge: 0.0925,
      ev: 0.1520,
      confidence: 0.7890,
      tags: ["THE_GOLDEN_ALPHA", "SHARP_SIGNAL"],
      signal: "ELITE"
    },
    {
      match_id: "TRP-002",
      home_team_name: "Trap Team",
      away_team_name: "Bait Team",
      home_short_name: "TRP",
      away_short_name: "BAT",
      match_date: new Date(),
      edge: 0.0,
      ev: 0.5300,
      confidence: 0.0,
      tags: ["STATISTICAL_TRAP"],
      signal: "NONE"
    },
    {
      match_id: "STL-003",
      home_team_name: "Stale Home",
      away_team_name: "Stale Away",
      home_short_name: "SHL",
      away_short_name: "SAL",
      match_date: new Date(),
      edge: 0.0090,
      ev: 0.0800,
      confidence: 0.0810,
      tags: ["STATISTICAL_TRAP", "STALE_ODDS"],
      signal: "NONE"
    }
  ];

  return NextResponse.json({
    success: true,
    count: 3,
    matches: mockResult,
    signals: mockResult,
    data: mockResult
  });
}
