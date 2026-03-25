import { prisma } from "../lib/prisma";

// --- PHASE 2: MODEL ---
function sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
}

function predictHomeWinProbability(features: any) {
    const { xgdDiff, fatigueDiff, motivationDiff } = features;

    // Baseline weights
    const w1 = 0.5;   // world
    const w2 = -0.3;  // fatigue
    const w3 = 0.2;   // psychological

    const score =
        (w1 * (xgdDiff || 0)) +
        (w2 * (fatigueDiff || 0)) +
        (w3 * (motivationDiff || 0));

    return sigmoid(score);
}

// --- MAIN EXECUTION ---
async function runBacktest() {
    console.log("[Backtest] Starting simulation...");

    // PHASE 1: DATASET PREPARATION
    const matches = await prisma.matches.findMany({
        where: {
            status: "finished",
            home_score: { not: null },
            away_score: { not: null },
            features: { some: { teamType: "diff" } },
            odds: { some: {} }
        },
        include: {
            features: {
                where: { teamType: "diff" },
                orderBy: { featureVersion: "desc" },
                take: 1
            },
            odds: {
                orderBy: { fetched_at: "desc" },
                take: 1
            }
        }
    });

    if (matches.length === 0) {
        console.log("[Backtest] No matches found matching criteria.");
        return;
    }

    let totalBets = 0;
    let totalWins = 0;
    let totalProfit = 0;
    let sumEdge = 0;
    const bets = [];

    for (const m of matches) {
        const features = m.features[0];
        const closingOdds: any = m.odds[0]?.odds_json;

        // Assumes home_odds is in the odds_json (e.g., from theoddsapi adapter)
        // We'll look for standard keys like 'home', 'h', or the specific team's odds
        const homeOdds = closingOdds?.home || closingOdds?.h || 0;

        if (homeOdds <= 0) continue;

        // PHASE 3: EDGE CALCULATION
        const model_prob = predictHomeWinProbability(features);
        const market_prob = 1 / homeOdds;
        const edge = model_prob - market_prob;

        // PHASE 4: BETTING STRATEGY
        if (edge > 0.05) {
            totalBets++;
            sumEdge += edge;

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

    // PHASE 6: METRICS
    const winRate = totalBets > 0 ? totalWins / totalBets : 0;
    const ROI = totalBets > 0 ? totalProfit / totalBets : 0;
    const avgEdge = totalBets > 0 ? sumEdge / totalBets : 0;

    // PHASE 7: OUTPUT REPORT
    const report = {
        totalMatches: matches.length,
        totalBets,
        winRate: (winRate * 100).toFixed(2) + "%",
        totalProfit: totalProfit.toFixed(2),
        ROI: (ROI * 100).toFixed(2) + "%",
        avgEdge: avgEdge.toFixed(4),
        sampleBets: bets.slice(0, 5)
    };

    // PHASE 8: LOGGING
    console.log(`[Backtest] Matches analyzed: ${matches.length}`);
    console.log(`[Backtest] Bets placed: ${totalBets}`);
    console.log(`[Backtest] ROI: ${(ROI * 100).toFixed(2)}%`);
    console.log(`[Backtest] Avg Edge: ${avgEdge.toFixed(4)}`);

    console.log("\n--- JSON REPORT ---");
    console.log(JSON.stringify(report, null, 2));
}

runBacktest()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
