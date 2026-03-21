import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { QuantEngine } from "@/lib/quant";
import { buildFeatureVector } from "@/lib/feature";

const INFERENCE_URL = process.env.INFERENCE_URL;

async function fetchWithTimeout(url: string, options: any, timeout: number) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const limit = body.limit || 500;

    // 1. 撈取近期完賽紀錄與對應快照 (包含 home_team 資訊以取得場館)
    const pastMatches = await prisma.matches.findMany({
      where: {
        home_score: { not: null },
        away_score: { not: null },
      },
      include: {
        home_team: true,
        snapshots: {
          where: { snapshot_type: "T-10min" },
          take: 1,
        },
      },
      orderBy: { match_date: 'desc' },
      take: limit,
    });

    // 💰 初始資金與風險追蹤
    let bankroll = 10000;
    let peak = bankroll;
    let maxDrawdown = 0;
    let totalBets = 0;
    let wins = 0;
    const equityCurve: number[] = [bankroll];
    const returns: number[] = [];

    for (const match of pastMatches) {
      const snapshot = match.snapshots[0];
      if (!snapshot) continue;

      try {
        if (!snapshot.feature_json) {
          console.log("[SKIP] missing feature_json:", snapshot.match_id);
          continue;
        }

        // STEP 1: 使用真實賠率 (從 Snapshot 提取)
        const odds = (snapshot.feature_json as Record<string, any>)?.market_odds_home;
        if (!odds || typeof odds !== "number" || odds <= 1) {
          console.log("[SKIP] invalid odds:", snapshot.match_id);
          continue;
        }

        // STEP 2: 加入莊家抽水 (Realistic Edge)
        // 模擬 5% 的莊家邊際，讓模型更難找到 "價值"
        const rawImplied = 1 / odds;
        const impliedProb = rawImplied * 1.05; 

        // 全域統一使用 buildFeatureVector 重建 6 位特徵包含最新疲勞
        const current_venue = match.home_team?.home_city || "Unknown";
        const feature_vector = await buildFeatureVector(
          snapshot.feature_json as Record<string, any> | number[],
          match.home_team_id,
          match.away_team_id,
          match.match_date,
          current_venue
        );

        let modelProb = (snapshot.feature_json as Record<string, any>)?.predicted_prob_home || 0.5;
        
        // 餵給推論 API 取得真實推論 (若環境變數存在)
        if (INFERENCE_URL) {
          try {
            const res = await fetchWithTimeout(`${INFERENCE_URL}/predict`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                model_id: "latest",
                model_type: "T-10min",
                feature_vector
              })
            }, 3000);
            
            if (res.ok) {
              const data = await res.json();
              if (data && typeof data.probability === "number" && data.probability !== -1) {
                modelProb = data.probability;
              }
            }
          } catch(e) {
            console.error(`[BACKTEST FETCH ERROR] match=${match.match_id}`, e);
          }
        }
        
        if (!modelProb || modelProb <= 0 || modelProb > 1) {
          console.log("[SKIP] invalid prob:", snapshot.match_id, modelProb);
          continue;
        }

        const edge = modelProb - impliedProb;

        // STEP 3: 嚴格 Edge 過濾器 (提高閾值以降低雜訊)
        if (edge <= 0.03) continue;

        // STEP 4: 凱利準則 (Kelly Criterion) 計算投注量
        const kelly = QuantEngine.getKellySuggest(modelProb, odds);
        const betSize = bankroll * kelly;

        if (betSize <= 0) continue;

        // 判斷勝負 (僅示範 Home Win 邏輯)
        const isWin = match.home_score! > match.away_score!;
        totalBets++;

        // STEP 4 & 5: 更新 Bankroll 與 Equity Curve
        if (isWin) {
          wins++;
          bankroll += betSize * (odds - 1);
        } else {
          bankroll -= betSize;
        }
        equityCurve.push(bankroll);

        // STEP 6: 最大回撤 (Max Drawdown) 計算
        if (bankroll > peak) peak = bankroll;
        const currentDrawdown = (peak - bankroll) / peak;
        if (currentDrawdown > maxDrawdown) maxDrawdown = currentDrawdown;

        // 紀錄收益率用於 Sharpe Ratio
        returns.push((equityCurve[equityCurve.length - 1] - equityCurve[equityCurve.length - 2]) / equityCurve[equityCurve.length - 2]);
      } catch (err) {
        console.error("[ERROR MATCH]", snapshot.match_id, err);
        continue;
      }
    }

    // STEP 7: Sharpe Ratio 計算 (量化核心指標)
    // Formula: S = (Avg Return) / (Std Dev of Return)
    const avgReturn = returns.reduce((a, b) => a + b, 0) / (returns.length || 1);
    const stdReturn = Math.sqrt(
      returns.reduce((a, b) => a + Math.pow(b - avgReturn, 2), 0) / (returns.length || 1)
    );
    const sharpe = stdReturn === 0 ? 0 : avgReturn / stdReturn;

    return NextResponse.json({
      success: true,
      metrics: {
        total_bets: totalBets,
        win_rate: totalBets > 0 ? wins / totalBets : 0,
        roi: (bankroll - 10000) / 10000,
        final_bankroll: bankroll,
        max_drawdown: maxDrawdown,
        sharpe_ratio: sharpe,
      },
      // 僅回傳最後 50 點以優化前端渲染效能
      equity_curve: equityCurve.slice(-50)
    });

  } catch (error: any) {
    console.error("BACKTEST FATAL:", error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
