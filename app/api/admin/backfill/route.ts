import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildFeatureVector } from "@/lib/feature";

export async function POST(req: Request) {
  try {
    // 1. çµ±è?è³‡æ?åº«å…§ Matches ç¸½æ•¸?‡å·²å®Œè³½?¸ï?ç¢ºè??¯å¦?‰è???    const total_matches_in_db = await prisma.matches.count();
    const completed_matches_in_db = await prisma.matches.count({
      where: { home_score: { not: null } }
    });

    // 2. ?´å?å¯¬é?æ¢ä»¶ï¼šåªè¦?`home_score` ?ç©ºä¸”æ?ç¶å? `T-10min` å¿«ç…§?³æ???    const matchesWithoutSnapshot = await prisma.matches.findMany({
      where: {
        home_score: { not: null },
        snapshots: {
          none: { snapshot_type: "T-10min" }
        }
      },
      include: { home_team: true },
      take: 100,
      orderBy: { match_date: 'asc' }
    });

    if (matchesWithoutSnapshot.length === 0) {
      return NextResponse.json({ 
        success: true, 
        generated_count: 0, 
        total_matches_in_db,
        completed_matches_in_db,
        message: "No matches need backfilling or database is empty." 
      });
    }

    let generated_count = 0;

    for (const match of matchesWithoutSnapshot) {
      // ?¨æ?æ¨¡æ“¬?ºæœ¬?‡ç‰¹å¾µï?ä½œç‚º?æ¸¬?æ??„æ•¸?šé???      const baseFakeFeatures = {
        elo_diff: Math.random() * 200 - 100, 
        goal_avg_diff: Math.random() * 2 - 1,
        form_strength_home: Math.random() * 100,
        form_strength_away: Math.random() * 100,
      };

      const current_venue = match.home_team?.home_city || "Unknown";

      // 2. ?¼å«?´å?å¥½ç? feature æ¨¡ç?ï¼Œç¢ºå¯¦è?ç®—å‡º?…å«?°ç??²å???6 ç¶­ç‰¹å¾?      const feature_vector = await buildFeatureVector(
        baseFakeFeatures,
        match.home_team_id,
        match.away_team_id,
        match.match_date,
        current_venue
      );

      // 3. æº–å??¨æ??²å?è³ ç??‡é?æ¸¬æ??‡ï??œå? 1.85 ~ 2.10
      const market_odds_home = 1.85 + Math.random() * (2.10 - 1.85);
      const predicted_prob_home = 0.4 + Math.random() * 0.2; // 0.4 ~ 0.6

      // 4. ?“å???JSON?‚é€™è£¡?¸æ??¤å¹³?ºç‰©ä»¶ï?ä½¿å? backtest ?¯ä»¥??key ?–ç”¨ odds
      const featureJsonObj = {
        elo_diff: feature_vector[0],
        goal_avg_diff: feature_vector[1],
        form_strength_home: feature_vector[2],
        form_strength_away: feature_vector[3],
        fatigue_home: feature_vector[4],
        fatigue_away: feature_vector[5],
        market_odds_home,
        predicted_prob_home
      };

      const snapshotTime = new Date(match.match_date.getTime() - 10 * 60 * 1000); // è³½å? 10 ?†é?

      // å¯«å…¥è³‡æ?åº?      await prisma.eventSnapshot.create({
        data: {
          match_id: match.match_id,
          snapshot_type: "T-10min",
          snapshot_time: snapshotTime,
          state_json: { _v: 1, note: "backfilled_historical" },
          feature_json: featureJsonObj,
        }
      });

      generated_count++;
    }

    // 5. ?å‚³?·è?çµæ??‡è??™åº«?€?‹è¿½è¹?    return NextResponse.json({ 
      success: true, 
      generated_count,
      total_matches_in_db,
      completed_matches_in_db
    });

  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      generated_count: 0,
      total_matches_in_db: 0,
      completed_matches_in_db: 0
    });
  }
}
