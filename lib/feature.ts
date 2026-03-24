import { prisma } from "@/lib/prisma";
import { PhysicsEngine } from "@/lib/physics";

export const FEATURE_ORDER = [
  "elo_diff",
  "goal_avg_diff",
  "form_strength_home",
  "form_strength_away",
  "bio_battery_home",
  "bio_battery_away",
];

export async function buildFeatureVector(
  baseFeatures: Record<string, any> | number[],
  home_team_id: string,
  away_team_id: string,
  current_match_date: Date,
  current_venue: string
): Promise<number[]> {
  const homeTeam = await prisma.teams.findUnique({ where: { team_id: home_team_id } }).catch(() => null);
  const awayTeam = await prisma.teams.findUnique({ where: { team_id: away_team_id } }).catch(() => null);

  const homeCity = homeTeam?.home_city || "Unknown";
  const awayCity = awayTeam?.home_city || "Unknown";

  const [homeBio, awayBio] = await Promise.all([
    PhysicsEngine.getBioBattery(home_team_id, current_match_date, current_venue, homeCity),
    PhysicsEngine.getBioBattery(away_team_id, current_match_date, current_venue, awayCity),
  ]);

  let elo = 0.0, goal = 0.0, formH = 0.0, formA = 0.0;

  if (Array.isArray(baseFeatures)) {
    elo   = typeof baseFeatures[0] === 'number' ? baseFeatures[0] : 0.0;
    goal  = typeof baseFeatures[1] === 'number' ? baseFeatures[1] : 0.0;
    formH = typeof baseFeatures[2] === 'number' ? baseFeatures[2] : 0.0;
    formA = typeof baseFeatures[3] === 'number' ? baseFeatures[3] : 0.0;
  } else if (baseFeatures && typeof baseFeatures === 'object') {
    elo   = typeof baseFeatures.elo_diff            === 'number' ? baseFeatures.elo_diff            : 0.0;
    goal  = typeof baseFeatures.goal_avg_diff       === 'number' ? baseFeatures.goal_avg_diff       : 0.0;
    formH = typeof baseFeatures.form_strength_home  === 'number' ? baseFeatures.form_strength_home  : 0.0;
    formA = typeof baseFeatures.form_strength_away  === 'number' ? baseFeatures.form_strength_away  : 0.0;
  }

  const v = [elo, goal, formH, formA, homeBio.bio_battery, awayBio.bio_battery];

  return v.map(n => (typeof n === 'number' && !isNaN(n)) ? n : 0.0);
}
