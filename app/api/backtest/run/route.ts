import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { QuantEngine } from "@/lib/quant";

const PREDICT_API = process.env.PREDICT_API_URL || "http://localhost:8000/predict";

export async function GET() {
  try {
    const experiences = await prisma.experience.findMany({
      where: {
        snapshot_type: "T-10min"
      },
      orderBy: {
        created_at: "asc"
      },
      take: 500
    });

    let bankroll = 1000;
    let peak = bankroll;
    let maxDrawdown = 0;

    let wins = 0;
    let bets = 0;

    for (const exp of experiences) {
      const features = exp.feature_vector;

      let prob = 0;

      try {
        const res = await fetch(PREDICT_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model_id: "latest", // 自動尋找最新版模型
            feature_vector: features,
            model_type: "T-10min"
          })
        });

        const data = await res.json();
        prob = data.probability;
      } catch (err) {
        console.error("Backtest predict fetch error:", err);
        continue;
      }

      // 如果接收到 XGBoost 的 Error fail-safe (-1.0)，則放棄下注
      if (prob <= 0) continue;

      const odds = 2.0; // 本次回測暫且模擬固定市場為 2.0 賠率，後續可替換歷史 Odds

      const implied = QuantEngine.getImpliedProbability(odds);
      const edge = QuantEngine.getEdge(prob, implied);

      if (edge <= 0.02) continue; // 策略條件：只打高邊緣 (Edge > 2%) 的場次

      const kelly = QuantEngine.getKellySuggest(prob, odds);
      const betSize = bankroll * kelly;

      if (betSize <= 0) continue;

      bets++;

      // label: 1 = home win (由於前述的預設 label_type)
      const isWin = exp.label === 1;

      if (isWin) {
        bankroll += betSize * (odds - 1); // 淨利 = 下注額 * (賠率 - 1)
        wins++;
      } else {
        bankroll -= betSize; // 輸掉本金
      }

      // 結算 Max Drawdown 計算
      if (bankroll > peak) peak = bankroll;
      const dd = (peak - bankroll) / peak;
      if (dd > maxDrawdown) maxDrawdown = dd;
    }

    const roi = (bankroll - 1000) / 1000;
    const winRate = bets > 0 ? wins / bets : 0;

    return NextResponse.json({
      success: true,
      result: {
        initial_bankroll: 1000,
        final_bankroll: bankroll,
        roi,
        win_rate: winRate,
        bets,
        max_drawdown: maxDrawdown
      }
    });

  } catch (error) {
    console.error("Backtest Engine Error:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
