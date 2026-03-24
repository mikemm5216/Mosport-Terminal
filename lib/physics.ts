import { VENUE_COORDS } from './venues';
import { prisma } from './prisma';

export const PhysicsEngine = {
  haversineDistance: (venueA: string, venueB: string): number => {
    const coordsA = VENUE_COORDS[venueA];
    const coordsB = VENUE_COORDS[venueB];
    if (!coordsA || !coordsB) return 0;
    const R = 6371; // Earth radius in km
    const dLat = (coordsB.lat - coordsA.lat) * Math.PI / 180;
    const dLng = (coordsB.lng - coordsA.lng) * Math.PI / 180;
    const a =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(coordsA.lat * Math.PI / 180) * Math.cos(coordsB.lat * Math.PI / 180) *
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  },

  getFatigueScore: (daysRest: number, travelKm: number): number => {
    const effectiveRest = Math.max(0, daysRest);
    return Math.min(1.0, (1 / (effectiveRest + 0.5)) * Math.log10(travelKm + 10) / 2);
  },

  /**
   * Bio-Battery 2.0
   * Penalty per game in last 7 days: -15
   * Penalty per consecutive away game: -5
   * Additional penalty if more than 3 consecutive away games: -10
   * Recovery if more than 48 hours since last match: +10
   */
  calculateBioBattery: (params: {
    matches_last_7d: number;
    consecutive_away: number;
    hours_since_last_match: number;
  }): number => {
    const { matches_last_7d, consecutive_away, hours_since_last_match } = params;

    let battery = 100;

    // Game density penalty
    battery -= matches_last_7d * 15;

    // Road trip stress penalty
    battery -= consecutive_away * 5;
    if (consecutive_away > 3) battery -= 10;

    // Rest recovery
    if (hours_since_last_match > 48) battery += 10;

    return Math.max(0, Math.min(100, battery));
  },

  /**
   * Fetches data from DB and calculates Bio-Battery metrics
   */
  getBioBattery: async (
    team_id: string,
    current_match_date: Date,
    current_venue: string,
    home_city: string
  ): Promise<{ bio_battery: number; game_density: number; road_trip_stress: boolean }> => {
    try {
      const sevenDaysAgo = new Date(current_match_date.getTime() - 7 * 24 * 60 * 60 * 1000);

      const recentMatches = await prisma.matches.findMany({
        where: {
          OR: [{ home_team_id: team_id }, { away_team_id: team_id }],
          match_date: { gte: sevenDaysAgo, lt: current_match_date },
        },
        orderBy: { match_date: 'desc' },
        take: 10,
      });

      const game_density = recentMatches.length;

      // Calculate consecutive away games
      let consecutive_away = 0;
      for (const m of recentMatches) {
        if (m.away_team_id === team_id) consecutive_away++;
        else break;
      }
      const road_trip_stress = consecutive_away >= 3;

      // Hours since last match
      const prevMatch = recentMatches[0] ?? null;
      const hours_since_last_match = prevMatch
        ? (current_match_date.getTime() - prevMatch.match_date.getTime()) / (1000 * 60 * 60)
        : 999;

      const bio_battery = PhysicsEngine.calculateBioBattery({
        matches_last_7d: game_density,
        consecutive_away,
        hours_since_last_match,
      });

      return { bio_battery, game_density, road_trip_stress };
    } catch (err) {
      // Fail-safe default
      return { bio_battery: 75, game_density: 0, road_trip_stress: false };
    }
  }
};
