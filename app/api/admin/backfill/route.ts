import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildFeatureVector } from "@/lib/feature";

export async function POST(req: Request) {
  try {
    // 1. 統計資料庫內 Matches 總數與已完賽數，確認是否有資料
    const total_matches_in_db = await prisma.matches.count();
    const completed_matches_in_db = await prisma.matches.count({
      where: { home_score: { not: null } }
    });

    // 2. 暴力寬鬆條件：只要 `home_score` 非空且沒綁定 `T-10min` 快照即撈出
    const matchesWithoutSnapshot = await prisma.matches.findMany({
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
      // 隨機模擬基本假特徵，作為回測初期的數據養分
      const baseFakeFeatures = {
        elo_diff: Math.random() * 200 - 100, 
        goal_avg_diff: Math.random() * 2 - 1,
        form_strength_home: Math.random() * 100,
        form_strength_away: Math.random() * 100,
      };

      const current_venue = match.home_team?.home_city || "Unknown";

      // 2. 呼叫整合好的 feature 模組，確實計算出包含地理疲勞的 6 維特徵
      const feature_vector = await buildFeatureVector(
        baseFakeFeatures,
        match.home_team_id,
        match.away_team_id,
        match.match_date,
        current_venue
      );

      // 3. 準備隨機防呆賠率與預測機率，兜底 1.85 ~ 2.10
      const market_odds_home = 1.85 + Math.random() * (2.10 - 1.85);
      const predicted_prob_home = 0.4 + Math.random() * 0.2; // 0.4 ~ 0.6

      // 4. 打包成 JSON。這裡選擇攤平為物件，使得 backtest 可以靠 key 取用 odds
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

      const snapshotTime = new Date(match.match_date.getTime() - 10 * 60 * 1000); // 賽前 10 分鐘

      // 寫入資料庫
      await prisma.eventSnapshot.create({
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

    // 5. 回傳執行結果與資料庫狀態追蹤
    return NextResponse.json({ 
      success: true, 
      generated_count,
      total_matches_in_db,
      completed_matches_in_db
    });

  } catch (error: any) {
    console.error("[BACKFILL ERROR]", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
