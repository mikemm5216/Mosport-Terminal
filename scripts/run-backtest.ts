import { prisma } from "../lib/prisma";
import fs from "fs";

// --- PHASE 1: LOAD MODEL ---
let model: any = { weights: [0.5, -0.3, 0.2], bias: 0 };
if (fs.existsSync("model_weights.json")) {
    model = JSON.parse(fs.readFileSync("model_weights.json", "utf-8"));
    console.log("[Backtest] Loaded model weights from model_weights.json");
} else {
    console.warn("[Backtest] model_weights.json not found. Using baseline weights.");
}

function sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
}

function predictHomeWinProbability(features: any) {
    const { xgdDiff, fatigueDiff, motivationDiff } = features;
    const { weights, bias } = model;

    const score =
        (weights[0] * (xgdDiff || 0)) +
        (weights[1] * (fatigueDiff || 0)) +
        (weights[2] * (motivationDiff || 0)) +
        bias;

    let prob = sigmoid(score);

    // Simple Calibration / Clipping (Keep in realistic bounds if extreme)
    // Goal: 0.4 - 0.7 typical range (as requested)
    // We don't want to over-squash, but avoid extreme 0/1
    return Math.max(0.1, Math.min(0.9, prob));
}

// --- MAIN EXECUTION ---
async function runBacktest() {
    console.log("[Backtest] Starting simulation on TEST set...");

    // 1. DATASET PREPARATION
    const matches = await prisma.matches.findMany({
        where: {
            status: "finished",
            features: { some: { featureVersion: "v1.0", teamType: "diff" } },
            odds: { some: {} }
        },
        include: {
            features: { where: { featureVersion: "v1.0", teamType: "diff" } },
            odds: { orderBy: { fetched_at: "desc" }, take: 1 }
        },
        orderBy: { match_date: "asc" }
    });

    if (matches.length < 10) {
        console.log("[Backtest] Not enough data for backtest. Please seed more matches.");
        return;
    }

    // 2. Chronological Split - Take the last 30% as TEST set
    const testStartIndex = Math.floor(matches.length * 0.7);
    const testMatches = matches.slice(testStartIndex);

    console.log(`[Backtest] Splitting: Total ${matches.length}, Test Set Size ${testMatches.length}`);

    let totalBets = 0;
    let totalWins = 0;
    let totalProfit = 0;
    let sumEdge = 0;
    let maxEdge = 0;
    const bets = [];

    for (const m of testMatches) {
        const features = (m as any).features[0];
        const closingOdds: any = m.odds[0]?.odds_json;
        const homeOdds = closingOdds?.home || closingOdds?.h || 0;

        if (homeOdds <= 0) continue;

        // 3. EDGE CALCULATION
        const model_prob = predictHomeWinProbability(features);
        const market_prob = 1 / homeOdds;
        const edge = model_prob - market_prob;

        // 4. REFINED BETTING STRATEGY (edge > 0.05 AND edge < 0.25)
        if (edge > 0.05 && edge < 0.25) {
            totalBets++;
            sumEdge += edge;
            if (edge > maxEdge) maxEdge = edge;

            const homeWins = (m.home_score || 0) > (m.away_score || 0);
            let profit = -1;

            if (homeWins) {
                totalWins++;
                profit = homeOdds - 1;
            }

            totalProfit += profit;

            bets.push({
                matchId: m.match_id,
                model_prob,
                market_prob,
                edge,
                odds: homeOdds,
                result: homeWins ? "WIN" : "LOSS",
                profit
            });
        }
    }

    // 5. METRICS
    const winRate = totalBets > 0 ? totalWins / totalBets : 0;
    const ROI = totalBets > 0 ? totalProfit / totalBets : 0;
    const avgEdge = totalBets > 0 ? sumEdge / totalBets : 0;

    // 6. OUTPUT REPORT
    const report = {
        trainSize: testStartIndex,
        testSize: testMatches.length,
        totalBets,
        winRate: (winRate * 100).toFixed(2) + "%",
        totalProfit: totalProfit.toFixed(2),
        ROI: (ROI * 100).toFixed(2) + "%",
        avgEdge: avgEdge.toFixed(4),
        maxEdge: maxEdge.toFixed(4),
        sampleBets: bets.slice(0, 5)
    };

    console.log(`[Backtest] Analysis complete.`);
    console.log(`[Backtest] TEST ROI: ${(ROI * 100).toFixed(2)}%`);

    console.log("\n--- JSON REPORT ---");
    console.log(JSON.stringify(report, null, 2));
}

runBacktest()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
