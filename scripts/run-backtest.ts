import { prisma } from "../lib/prisma";
import fs from "fs";
import { plattScale, brierScore, logLoss, bucketAnalysis, sigmoid as rawSigmoid } from "../lib/ml/calibration";

async function runBacktest(sport: string) {
    const isNBA = sport === "basketball";
    console.log(`\n[Backtest] --- ${sport.toUpperCase()} ${isNBA ? "(PROBABILITY ENGINE)" : "(STRICT BETTING)"} ---`);

    // 1. Load Model
    const modelFile = isNBA ? "model_nba.json" : "model_weights.json";
    if (!fs.existsSync(modelFile)) {
        console.warn(`[Backtest] No ${modelFile} found for ${sport}. Skipping.`);
        return;
    }
    const allModels = JSON.parse(fs.readFileSync(modelFile, "utf-8"));
    const model = allModels[isNBA ? "nba" : sport];

    if (!model) {
        console.warn(`[Backtest] No weights found for ${sport}. Skipping.`);
        return;
    }

    // 2. Fetch Data (Chronological)
    const matches = await (prisma as any).match.findMany({
        where: {
            sport,
            status: "finished",
            features: { some: {} }
        },
        include: {
            features: true,
            odds: { orderBy: { fetched_at: "desc" }, take: 1 }
        },
        orderBy: { date: "asc" }
    });

    if (matches.length < 20) {
        console.error(`[Backtest] Not enough data for ${sport}.`);
        return;
    }

    // TEST Set: Latest 15%
    const testStartIndex = Math.floor(matches.length * 0.85);
    const testMatches = matches.slice(testStartIndex);

    console.log(`[Backtest] Evaluating on ${testMatches.length} TEST matches...`);

    let totalBets = 0;
    let totalWins = 0;
    let totalProfit = 0;
    let totalSizedProfit = 0;
    let totalStake = 0;
    const testProbs: number[] = [];
    const testLabels: number[] = [];

    for (const m of testMatches) {
        const f = m.features[0];
        const { weights, bias, calibration, normalization } = model;

        // A. Prediction
        let calibrated_prob: number;
        if (isNBA) {
            // NBA specific pred with normalization
            const x = [f.worldDiff || 0, f.physioDiff || 0, f.psychoDiff || 0];
            const stats = normalization || weights.seasonNormalization || model.seasonNormalization;
            // Use the first season stats for synthetic demo or match actual season
            const seasonKey = Object.keys(stats)[0];
            const sStats = stats[seasonKey];
            const normX = x.map((val, i) => (val - (sStats.mean[i] || 0)) / (sStats.std[i] || 1));
            const z = normX.reduce((acc, val, i) => acc + val * (weights[i] || 0), 0) + (bias || 0);
            const raw_prob = rawSigmoid(z);
            calibrated_prob = plattScale(raw_prob, calibration.A, calibration.B);
        } else {
            // Standard football/baseball logic
            const z = weights[0] * (f.worldDiff || 0) + weights[1] * (f.physioDiff || 0) + weights[2] * (f.psychoDiff || 0) + bias;
            const raw_prob = rawSigmoid(z);
            calibrated_prob = plattScale(raw_prob, calibration.A, calibration.B);
        }

        testProbs.push(calibrated_prob);
        const isWin = m.matchResult === "HOME_WIN";
        testLabels.push(isWin ? 1 : 0);

        // B. Betting Simulation (SKIP FOR NBA)
        if (!isNBA) {
            const oddsData: any = m.odds[0]?.odds_json;
            const homeOdds = oddsData?.home || oddsData?.h || 0;
            if (homeOdds <= 1) continue;

            const EV = (calibrated_prob * homeOdds) - 1;
            if (calibrated_prob >= 0.55 && calibrated_prob <= 0.75 && EV > 0.03) {
                totalBets++;
                const size = Math.min(EV, 0.05);
                totalStake += size;
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
    }

    // 3. OUTPUT REPORT
    const ROI = totalBets > 0 ? (totalProfit / totalBets) : 0;
    const brier = brierScore(testProbs, testLabels);
    const loss = logLoss(testProbs, testLabels);
    const buckets = bucketAnalysis(testProbs, testLabels);

    const report: any = {
        sport,
        metrics: {
            totalMatches: testMatches.length,
            brierScore: brier.toFixed(4),
            logLoss: loss.toFixed(4),
            calibrationStatus: brier < 0.22 ? "✅ QUALITY" : "❌ CALIBRATION GAP"
        }
    };

    if (!isNBA) {
        report.metrics.winRate = totalBets > 0 ? ((totalWins / totalBets) * 100).toFixed(2) + "%" : "0%";
        report.metrics.ROI = (ROI * 100).toFixed(2) + "%";
    }

    report.calibration = buckets.filter(b => b.count > 0);

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
