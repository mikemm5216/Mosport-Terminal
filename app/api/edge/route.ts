import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { QuantEngine } from "@/lib/quant";

const FEATURE_ORDER = [
  "elo_diff",
  "goal_avg_diff",
  "form_strength_home",
  "form_strength_away"
];

const PREDICT_API = process.env.PREDICT_API_URL || "http://localhost:8000/predict";

export async function GET() {
  try {
    const now = new Date();
    const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const matches = await prisma.matches.findMany({
      where: {
        match_date: {
          gt: now,
          lt: next24h
        }
      },
      include: {
        home_team: true, // 額外關聯出隊伍資料，以免 match_name 字串模板出錯
        away_team: true,
      },
      take: 50,
      orderBy: {
        match_date: "asc"
      }
    });

    const signals = [];

    for (const match of matches) {
      const snapshot = await prisma.eventSnapshot.findUnique({
        where: {
          match_id_snapshot_type: {
            match_id: match.match_id,
            snapshot_type: "T-10min"
          }
        }
      });

      if (!snapshot) continue;

      const featureJson = snapshot.feature_json as Record<string, any>;
      const featureVector = FEATURE_ORDER.map(f => featureJson?.[f] ?? 0);

      let probability = 0;

      try {
        const res = await fetch(PREDICT_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model_id: "latest",
            feature_vector: featureVector,
            model_type: "T-10min"
          })
        });

        const data = await res.json();
        probability = data.probability;
      } catch (err) {
        console.error("Inference fetch error:", err);
        continue;
      }
      
      // 如果拿到 fail-safe -1，跳過不處理
      if (probability <= 0) continue;

      const odds = 2.0; // TODO: 未來接市場即時賠率

      const implied = QuantEngine.getImpliedProbability(odds);
      const edge = QuantEngine.getEdge(probability, implied);
      const kelly = QuantEngine.getKellySuggest(probability, odds);

      // 解出關聯字串，防呆
      const homeName = match.home_team?.team_name || match.home_team_id;
      const awayName = match.away_team?.team_name || match.away_team_id;

      signals.push({
        match_id: match.match_id,
        match_name: `${homeName} vs ${awayName}`,
        probability,
        odds,
        implied,
        edge,
        kelly
      });
    }

    // 依據數學優勢排序 (取 Edge 最高的前 20 筆)
    signals.sort((a, b) => b.edge - a.edge);

    return NextResponse.json({
      success: true,
      data: signals.slice(0, 20)
    });

  } catch (error) {
    console.error("Edge API Error:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
