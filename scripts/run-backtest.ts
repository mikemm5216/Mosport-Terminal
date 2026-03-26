import { prisma } from "../lib/prisma";
import fs from "fs";

// --- PHASE 1: LOAD MODEL ---
let model: any = { sport: "football", weights: [0.5, 0.2, 0.2], bias: 0 };
if (fs.existsSync("model_weights.json")) {
    model = JSON.parse(fs.readFileSync("model_weights.json", "utf-8"));
    console.log(`[Backtest] Loaded Spartan ${model.sport} weights.`);
} else {
    console.warn("[Backtest] No weights found. Using baseline.");
}

function sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
}

function predictHomeWinProbability(features: any) {
    const { worldDiff, physioDiff, psychoDiff } = features;
    const { weights, bias } = model;

    const score =
        (weights[0] * (worldDiff || 0)) +
        (weights[1] * (physioDiff || 0)) +
        (weights[2] * (psychoDiff || 0)) +
        bias;

    let prob = sigmoid(score);

    // STEP 5: PROBABILITY CALIBRATION (MANDATORY)
    return Math.max(0.05, Math.min(0.95, prob));
}

async function runBacktest() {
    console.log("[Backtest] Starting Strict Spartan Evaluation...");

    // 1. DATASET PREPARATION
    const matches = await (prisma as any).match.findMany({
        where: {
            sport: model.sport,
            status: "finished",
            features: { some: { featureVersion: "v2.0" } },
            odds: { some: {} }
        },
        include: {
            features: { where: { featureVersion: "v2.0" } },
            odds: { orderBy: { fetched_at: "desc" }, take: 1 }
        },
        orderBy: { date: "asc" }
    });

    if (matches.length < 20) {
        console.error("[Backtest] Not enough data. Seed historical matches first.");
        return;
    }

    // 2. Chronological Split (30% TEST Set Only)
    const testStartIndex = Math.floor(matches.length * 0.7);
    const testMatches = matches.slice(testStartIndex);

    console.log(`[Backtest] Total: ${matches.length}, Evaluation (TEST): ${testMatches.length}`);

    let totalBets = 0;
    let totalWins = 0;
    let totalProfit = 0;
    let sumEdge = 0;
    let maxEdge = 0;
    const bets = [];

    for (const m of testMatches) {
        const features = (m as any).features[0];
        const oddsData: any = m.odds[0]?.odds_json;
        const homeOdds = oddsData?.home || oddsData?.h || 0;

        if (homeOdds <= 0) continue;

        // 3. EDGE CALCULATION
        const model_prob = predictHomeWinProbability(features);
        const market_prob = 1 / homeOdds;
        const edge = model_prob - market_prob;

        // 4. STEP 6: BACKTEST (STRICT MODE)
        // Only bet when: edge > 0.05 AND edge < 0.25
        if (edge > 0.05 && edge < 0.25) {
            totalBets++;
            sumEdge += edge;
            if (edge > maxEdge) maxEdge = edge;

            // STEP 6: Profit Logic (Spartan Settlement: Draw = Loss)
            let profit = -1;
            const homeWins = m.matchResult === "HOME_WIN";

            if (homeWins) {
                totalWins++;
                profit = homeOdds - 1;
            }

            totalProfit += profit;

            bets.push({
                matchId: m.id,
                teams: `${m.homeTeamName} vs ${m.awayTeamName}`,
                model_prob: model_prob.toFixed(4),
                market_prob: market_prob.toFixed(4),
                edge: edge.toFixed(4),
                odds: homeOdds.toFixed(2),
                result: m.matchResult,
                profit: profit.toFixed(2)
            });
        }
    }

    // 5. STEP 7: OUTPUT METRICS
    const winRate = totalBets > 0 ? totalWins / totalBets : 0;
    const ROI = totalBets > 0 ? totalProfit / totalBets : 0;
    const avgEdge = totalBets > 0 ? sumEdge / totalBets : 0;

    const report = {
        sport: model.sport,
        totalMatches: testMatches.length,
        totalBets,
        winRate: (winRate * 100).toFixed(2) + "%",
        totalProfit: totalProfit.toFixed(2),
        ROI: (ROI * 100).toFixed(2) + "%",
        avgEdge: avgEdge.toFixed(4),
        maxEdge: maxEdge.toFixed(4),
        sampleBets: bets.slice(0, 5)
    };

    // 6. STEP 8: VALIDATION RULES
    console.log("\n--- SPARTAN VALIDATION ---");
    if (totalBets < 30) console.warn("[VALIDATION] REJECT: Sample size too small (< 30 bets).");
    if (avgEdge > 0.3) console.error("[VALIDATION] REJECT: Average edge unrealistic (> 0.3). Model likely broken.");
    if (ROI > 0.5) console.warn("[VALIDATION] CAUTION: ROI extremely high. Small sample noise?");

    console.log(`[Backtest] Strict ROI: ${(ROI * 100).toFixed(2)}%`);
    console.log("\n--- JSON REPORT ---");
    console.log(JSON.stringify(report, null, 2));
}

runBacktest()
    .catch(console.error)
    .finally(() => (prisma as any).$disconnect());
