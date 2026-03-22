import { NextResponse } from "next/server";
import { WorldEngine, TeamStats } from "@/lib/world-engine";

export const dynamic = 'force-dynamic';

export async function GET() {
  const teamA: TeamStats = {
    id: "team_a",
    name: "Lakers",
    shortName: "LAL",
    momentum: 1.0,
    strength: 0.8,
    fatigue: 0.9,
    history: [
      { result: 'W', date: new Date() },
      { result: 'W', date: new Date() },
      { result: 'W', date: new Date() },
      { result: 'W', date: new Date() },
      { result: 'W', date: new Date() },
    ]
  };

  const teamB: TeamStats = {
    id: "team_b",
    name: "Magic",
    shortName: "ORL",
    momentum: 0.2,
    strength: 0.4,
    fatigue: 0.1,
    history: [
      { result: 'L', date: new Date() },
      { result: 'L', date: new Date() },
      { result: 'L', date: new Date() },
      { result: 'L', date: new Date() },
    ]
  };

  // TEST 1: Force Favorite (Team A / Away)
  const test1 = WorldEngine.runMatchSimulation(teamB, teamA, 'away');

  // TEST 2: Force Upset (Team B / Home)
  const test2 = WorldEngine.runMatchSimulation(teamB, teamA, 'home');

  return NextResponse.json({
    scenario: "LAL (1.0 Mom, 0.9 Fat) vs ORL (0.2 Mom, 0.1 Fat)",
    test1: {
      prediction: "AWAY (Lakers)",
      tag: test1.primaryTag,
      narrative: test1.narrative
    },
    test2: {
      prediction: "HOME (Magic)",
      tag: test2.primaryTag,
      narrative: test2.narrative
    }
  });
}
