import { VENUE_COORDS } from './venues';
import { prisma } from './prisma';

export const PhysicsEngine = {
  haversineDistance: (venueA: string, venueB: string): number => {
    const coordsA = VENUE_COORDS[venueA];
    const coordsB = VENUE_COORDS[venueB];
    if (!coordsA || !coordsB) return 0;
    const R = 6371;
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
   * Bio-Battery 算法：計算球隊的動態生理電量 (0-100，100 = 滿電)
   * 扣分項目：
   *   - 基礎旅途疲勞 (Haversine + 休息天數)
   *   - Game Density：過去 7 天每多一場扣 15%
   *   - Road Trip Stress：連續 3+ 場客場再扣 10%
   */
  getBioBattery: async (
    team_id: string,
    current_match_date: Date,
    current_venue: string,
    home_city: string // 該隊主場城市，用來判斷客場
  ): Promise<{ bio_battery: number; game_density: number; road_trip_stress: boolean }> => {
    try {
      const sevenDaysAgo = new Date(current_match_date.getTime() - 7 * 24 * 60 * 60 * 1000);

      // 撈過去 7 天該隊所有比賽（含主客）
      const recentMatches = await prisma.matches.findMany({
        where: {
          OR: [{ home_team_id: team_id }, { away_team_id: team_id }],
          match_date: { gte: sevenDaysAgo, lt: current_match_date },
        },
        orderBy: { match_date: 'desc' },
        include: { home_team: true },
        take: 10,
      });

      const game_density = recentMatches.length;

      // Road Trip Stress：連續 3+ 場客場
      let consecutive_away = 0;
      for (const m of recentMatches) {
        const is_away = m.away_team_id === team_id;
        if (is_away) consecutive_away++;
        else break;
      }
      const road_trip_stress = consecutive_away >= 3;

      // 基礎旅途疲勞 (0~1)
      const prevMatch = recentMatches[0] ?? null;
      let base_fatigue = 0;
      if (prevMatch) {
        const prevVenue = prevMatch.home_team?.home_city || "Unknown";
        const daysRest = (current_match_date.getTime() - prevMatch.match_date.getTime()) / (1000 * 60 * 60 * 24);
        const travelKm = PhysicsEngine.haversineDistance(prevVenue, current_venue);
        base_fatigue = PhysicsEngine.getFatigueScore(daysRest, travelKm);
      }

      // Bio-Battery 計算：從 100% 開始扣分
      let battery = 100;
      battery -= base_fatigue * 100;                         // 基礎疲勞轉換為扣分
      battery -= game_density * 15;                          // 賽程密度：每場扣 15%
      if (road_trip_stress) battery -= 10;                   // Road Trip 額外扣 10%

      const bio_battery = Math.max(0, Math.min(100, battery));

      return { bio_battery, game_density, road_trip_stress };
    } catch (err) {
      console.error("[BIO-BATTERY ERROR]", err);
      return { bio_battery: 75, game_density: 0, road_trip_stress: false }; // 安全兜底
    }
  }
};
