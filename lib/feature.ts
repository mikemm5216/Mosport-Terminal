import prisma from "@/lib/prisma";
import { PhysicsEngine } from "@/lib/physics";

export const FEATURE_ORDER = [
  "elo_diff",
  "goal_avg_diff",
  "form_strength_home",
  "form_strength_away",
  "fatigue_home",
  "fatigue_away",
];

async function getFatigueForTeam(team_id: string, current_match_date: Date, current_venue: string): Promise<number> {
  try {
    const prevMatch = await prisma.matches.findFirst({
      where: {
        OR: [{ home_team_id: team_id }, { away_team_id: team_id }],
        match_date: { lt: current_match_date },
        status: "finished"
      },
      orderBy: { match_date: 'desc' },
      include: { home_team: true }
    });

    if (!prevMatch) return 0.1; // 賽季第一場無前測資料兜底

    const prevVenue = prevMatch.home_team?.home_city || "Unknown";
    const daysRest = (current_match_date.getTime() - prevMatch.match_date.getTime()) / (1000 * 60 * 60 * 24);
    const travelKm = PhysicsEngine.haversineDistance(prevVenue, current_venue);

    return PhysicsEngine.getFatigueScore(daysRest, travelKm);
  } catch (err) {
    console.error("[FATIGUE ERROR]", err);
    return 0.1;
  }
}

export async function buildFeatureVector(
  baseFeatures: Record<string, any> | number[],
  home_team_id: string,
  away_team_id: string,
  current_match_date: Date,
  current_venue: string
): Promise<number[]> {
  const fatigue_home = await getFatigueForTeam(home_team_id, current_match_date, current_venue);
  const fatigue_away = await getFatigueForTeam(away_team_id, current_match_date, current_venue);

  let elo = 0.0, goal = 0.0, formH = 0.0, formA = 0.0;

  if (Array.isArray(baseFeatures)) {
    elo = typeof baseFeatures[0] === 'number' ? baseFeatures[0] : 0.0;
    goal = typeof baseFeatures[1] === 'number' ? baseFeatures[1] : 0.0;
    formH = typeof baseFeatures[2] === 'number' ? baseFeatures[2] : 0.0;
    formA = typeof baseFeatures[3] === 'number' ? baseFeatures[3] : 0.0;
  } else if (baseFeatures && typeof baseFeatures === 'object') {
    elo = typeof baseFeatures.elo_diff === 'number' ? baseFeatures.elo_diff : 0.0;
    goal = typeof baseFeatures.goal_avg_diff === 'number' ? baseFeatures.goal_avg_diff : 0.0;
    formH = typeof baseFeatures.form_strength_home === 'number' ? baseFeatures.form_strength_home : 0.0;
    formA = typeof baseFeatures.form_strength_away === 'number' ? baseFeatures.form_strength_away : 0.0;
  }

  const v = [elo, goal, formH, formA, fatigue_home, fatigue_away];
  
  // 極度重要防呆：確保最終送出給推論引擎長度固定，不能有 NaN 等特例。
  return v.map(n => (!n || isNaN(n)) ? 0.0 : n);
}
