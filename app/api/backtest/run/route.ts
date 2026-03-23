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

    // 1. ?��?近�?完賽紀?��?對�?快照 (?�含 home_team 資�?以�?得場�?
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

    // ?�� ?��?資�??�風?�追�?    let bankroll = 10000;
    let peak = bankroll;
    let maxDrawdown = 0;
    let totalBets = 0;
    let wins = 0;
    const equityCurve: number[] = [bankroll];
    const returns: number[] = [];

    // Bio-Battery 三�?層�?�????edge/route.ts ?�步�?    const BIO_LOW_EDGE    = 12;
    const BIO_MEDIUM_EDGE = 18;
    const BIO_HIGH_EDGE   = 25;

    let bioLowCount = 0, bioMediumCount = 0, bioHighCount = 0;

    for (const match of pastMatches) {
      const snapshot = match.snapshots[0];
      if (!snapshot) continue;

      try {
        if (!snapshot.feature_json) {
          continue;
        }

        // STEP 1: 使用?�實賠�? (�?Snapshot ?��?)
        const odds = (snapshot.feature_json as Record<string, any>)?.market_odds_home;
        if (!odds || typeof odds !== "number" || odds <= 1) {
          continue;
        }

        // STEP 2: ?�入?�家?�水 (Realistic Edge)
        // 模擬 5% ?��?家�??��?讓模?�更??��??"?��?
        const rawImplied = 1 / odds;
        const impliedProb = rawImplied * 1.05; 

        // ?��?統�?使用 buildFeatureVector ?�建 6 位特徵�??��??�疲??        const current_venue = match.home_team?.home_city || "Unknown";
        const feature_vector = await buildFeatureVector(
          snapshot.feature_json as Record<string, any> | number[],
          match.home_team_id,
          match.away_team_id,
          match.match_date,
          current_venue
        );

        let modelProb = (snapshot.feature_json as Record<string, any>)?.predicted_prob_home || 0.5;
        
        // 餵給?��? API ?��??�實?��? (?�環境�??��???
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
          }
        }
        
        if (!modelProb || modelProb <= 0 || modelProb > 1) {
          continue;
        }

        const edge = modelProb - impliedProb;

        // STEP 3: ?�格 Edge ?�濾??(?��??�值以?��??��?)
        if (edge <= 0.03) continue;

        // STEP 4: ?�利準�? (Kelly Criterion) 計�??�注??        const kelly = QuantEngine.getKellySuggest(modelProb, odds);
        const betSize = bankroll * kelly;

        if (betSize <= 0) continue;

        // Bio-Battery 三�?層統�?        const fJson = snapshot.feature_json as Record<string, any>;
        const bbHome = typeof fJson?.bio_battery_home === 'number' ? fJson.bio_battery_home : null;
        const bbAway = typeof fJson?.bio_battery_away === 'number' ? fJson.bio_battery_away : null;
        if (bbHome !== null && bbAway !== null) {
          const gap = Math.abs(bbHome - bbAway);
          if (gap >= BIO_HIGH_EDGE)        bioHighCount++;
          else if (gap >= BIO_MEDIUM_EDGE) bioMediumCount++;
          else if (gap >= BIO_LOW_EDGE)    bioLowCount++;
        }
        // ?�斷?��? (?�示�?Home Win ?�輯)
        const isWin = match.home_score! > match.away_score!;
        totalBets++;

        // STEP 4 & 5: ?�新 Bankroll ??Equity Curve
        if (isWin) {
          wins++;
          bankroll += betSize * (odds - 1);
        } else {
          bankroll -= betSize;
        }
        equityCurve.push(bankroll);

        // STEP 6: ?�大�???(Max Drawdown) 計�?
        if (bankroll > peak) peak = bankroll;
        const currentDrawdown = (peak - bankroll) / peak;
        if (currentDrawdown > maxDrawdown) maxDrawdown = currentDrawdown;

        // 紀?�收?��??�於 Sharpe Ratio
        returns.push((equityCurve[equityCurve.length - 1] - equityCurve[equityCurve.length - 2]) / equityCurve[equityCurve.length - 2]);
      } catch (err) {
        continue;
      }
    }

    // STEP 7: Sharpe Ratio 計�? (?��??��??��?)
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
      bio_battery_stats: {
        low_edge_count:    bioLowCount,
        medium_edge_count: bioMediumCount,
        high_edge_count:   bioHighCount,
      },
      equity_curve: equityCurve.slice(-50)
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false
    });
  }
}
