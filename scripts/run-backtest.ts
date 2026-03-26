import { prisma } from "../lib/prisma";
import fs from "fs";
import { plattScale, brierScore, logLoss, bucketAnalysis, sigmoid as rawSigmoid } from "../lib/ml/calibration";

async function runBacktest(sport: string) {
    console.log(`\n[Backtest] --- ${sport.toUpperCase()} (STRICT) ---`);

    // 1. Load Model
    if (!fs.existsSync("model_weights.json")) {
        console.error("[Backtest] No model_weights.json found. Run train-weights.ts first.");
        return;
    }
    const allModels = JSON.parse(fs.readFileSync("model_weights.json", "utf-8"));
    const model = allModels[sport];

    if (!model) {
        console.warn(`[Backtest] No weights found for ${sport}. Skipping.`);
        return;
    }

    // 2. Fetch Data (Chronological)
    const matches = await (prisma as any).match.findMany({
        where: {
            sport,
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

    // Exclude Draws for consistency with model training (Option A)
    const filteredMatches = sport === "football"
        ? matches.filter((m: any) => m.matchResult !== "DRAW")
        : matches;

    if (filteredMatches.length < 40) {
        console.error(`[Backtest] Not enough data for ${sport}.`);
        return;
    }

    // TEST Set: Latest 15% (must be consistent with training split)
    const testStartIndex = Math.floor(filteredMatches.length * 0.85);
    const testMatches = filteredMatches.slice(testStartIndex);

    console.log(`[Backtest] Evaluating on ${testMatches.length} TEST matches...`);

    let totalBets = 0;
    let totalWins = 0;
    let totalProfit = 0;
    let totalSizedProfit = 0;
    let totalStake = 0;
    const testProbs: number[] = [];
    const testLabels: number[] = [];
    const evs: number[] = [];

    for (const m of testMatches) {
        const f = m.features[0];
        const oddsData: any = m.odds[0]?.odds_json;
        const homeOdds = oddsData?.home || oddsData?.h || 0;
        const awayOdds = oddsData?.away || oddsData?.a || 1000;

        if (homeOdds <= 1) continue;

        // A. Remove Margin (Vigorish)
        const impHome = 1 / homeOdds;
        const impAway = 1 / awayOdds;
        const fair_prob = impHome / (impHome + impAway);

        // B. Model Probability (Calibrated)
        const { weights, bias, calibration } = model;
        const z = weights[0] * (f.worldDiff || 0) + weights[1] * (f.physioDiff || 0) + weights[2] * (f.psychoDiff || 0) + bias;
        const raw_prob = rawSigmoid(z);
        const calibrated_prob = plattScale(raw_prob, calibration.A, calibration.B);

        testProbs.push(calibrated_prob);
        testLabels.push(m.matchResult === "HOME_WIN" ? 1 : 0);

        // C. EV CALCULATION
        const EV = (calibrated_prob * homeOdds) - 1;

        // D. BETTING FILTERS
        // 0.55 <= prob <= 0.75 AND EV > 0.03
        if (calibrated_prob >= 0.55 && calibrated_prob <= 0.75 && EV > 0.03) {
            totalBets++;
            evs.push(EV);

            // Positioning (Basic EV sizing with 5% cap)
            const size = Math.min(EV, 0.05);
            totalStake += size;

            const isWin = m.matchResult === "HOME_WIN";
            if (isWin) {
                totalWins++;
                totalProfit += (homeOdds - 1);
                totalSizedProfit += size * (homeOdds - 1);
            } else {
                totalProfit -= 1;
                totalSizedProfit -= size;
            }
        }
    }

    // 5. OUTPUT REPORT
    const ROI = totalBets > 0 ? (totalProfit / totalBets) : 0;
    const sizedROI = totalStake > 0 ? (totalSizedProfit / totalStake) : 0;
    const brier = brierScore(testProbs, testLabels);
    const loss = logLoss(testProbs, testLabels);
    const buckets = bucketAnalysis(testProbs, testLabels);

    const report = {
        sport,
        metrics: {
            totalMatches: testMatches.length,
            totalBets,
            winRate: totalBets > 0 ? ((totalWins / totalBets) * 100).toFixed(2) + "%" : "0%",
            ROI: (ROI * 100).toFixed(2) + "%",
            sizedROI: (sizedROI * 100).toFixed(2) + "%",
            brierScore: brier.toFixed(4),
            logLoss: loss.toFixed(4)
        },
        calibration: buckets.filter(b => b.count > 0)
    };

    console.log("\n--- JSON REPORT ---");
    console.log(JSON.stringify(report, null, 2));
}

async function main() {
    const sports = ["football", "basketball", "baseball"];
    for (const s of sports) {
        await runBacktest(s);
    }
}

main()
    .catch(console.error)
    .finally(() => (prisma as any).$disconnect());
