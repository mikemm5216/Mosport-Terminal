import { prisma } from "../lib/prisma";
import fs from "fs";
import { plattScale, brierScore, logLoss, bucketAnalysis, sigmoid as rawSigmoid } from "../lib/ml/calibration";

async function runBacktest(sport: string) {
    const isNBA = sport === "basketball";
    console.log(`\n[Backtest] --- ${sport.toUpperCase()} ${isNBA ? "(V3.3 SCIENTIFIC)" : "(STRICT BETTING)"} ---`);

    // 1. Load Model
    const modelFile = isNBA ? "model_nba.json" : "model_weights.json";
    if (!fs.existsSync(modelFile)) {
        console.warn(`[Backtest] No ${modelFile} found for ${sport}. Skipping.`);
        return;
    }
    const model = JSON.parse(fs.readFileSync(modelFile, "utf-8"));

    // 2. Fetch Data (Chronological)
    const matches = await (prisma as any).match.findMany({
        where: {
            sport,
            status: "finished",
            features: { some: { featureVersion: isNBA ? "NBA_V3.3" : "V2.1" } }
        },
        include: {
            features: { where: { featureVersion: isNBA ? "NBA_V3.3" : "V2.1" } },
            odds: { orderBy: { fetched_at: "desc" }, take: 1 }
        },
        orderBy: { date: "asc" }
    });

    if (matches.length < 20) {
        console.error(`[Backtest] Not enough data for ${sport} (Found ${matches.length}).`);
        return;
    }

    // TEST Set: Latest 15%
    const n = matches.length;
    const testStartIndex = Math.floor(n * 0.85);
    const testMatches = matches.slice(testStartIndex);

    console.log(`[Backtest] Evaluating on ${testMatches.length} TEST matches (from ${n} total)...`);

    const testProbs: number[] = [];
    const testLabels: number[] = [];

    for (const m of testMatches) {
        const f = m.features[0];

        let prob: number;
        if (isNBA && model.version === "V3.3-SCIENTIFIC") {
            const { weights, bias, calibration, normalization } = model;
            const x = [
                f.worldDiff || 0,
                f.homeWorld || 0,
                f.awayWorld || 0,
                f.physioDiff || 0,
                f.homePhysio || 0,
                f.awayPhysio || 0,
                f.psychoDiff || 0
            ];

            // Normalization
            const normX = x.map((v, i) => (v - normalization.means[i]) / (normalization.stds[i] || 1));
            const z = normX.reduce((acc, v, i) => acc + v * weights[i], 0) + bias;
            const raw = rawSigmoid(z);
            prob = plattScale(raw, calibration.A, calibration.B);
        } else {
            // Fallback for non-NBA (football/baseball)
            const mData = model[sport] || model;
            const { weights, bias, calibration } = mData;
            const world = f.worldDiff || 0;
            const physio = f.physioDiff || 0;
            const psycho = f.psychoDiff || 0;
            const z = weights[0] * world + weights[1] * physio + weights[2] * psycho + bias;
            const raw = rawSigmoid(z);
            prob = plattScale(raw, calibration.A, calibration.B);
        }

        testProbs.push(prob);
        testLabels.push(m.matchResult === "HOME_WIN" ? 1 : 0);
    }

    // 3. OUTPUT REPORT
    const brier = brierScore(testProbs, testLabels);
    const loss = logLoss(testProbs, testLabels);
    const buckets = bucketAnalysis(testProbs, testLabels);

    let correct = 0;
    for (let i = 0; i < testProbs.length; i++) {
        if ((testProbs[i] >= 0.5 && testLabels[i] === 1) || (testProbs[i] < 0.5 && testLabels[i] === 0)) correct++;
    }
    const accuracy = (correct / testProbs.length) * 100;

    const report: any = {
        sport,
        version: isNBA ? "V3.3-SCIENTIFIC" : "V2.1",
        metrics: {
            totalSamples: n,
            testSet: testMatches.length,
            accuracy: accuracy.toFixed(2) + "%",
            brierScore: brier.toFixed(4),
            logLoss: loss.toFixed(4)
        },
        calibration: buckets.filter(b => b.count > 0)
    };

    console.log("\n--- SCIENTIFIC REPORT ---");
    console.log(JSON.stringify(report, null, 2));
}

async function main() {
    const sports = ["football", "basketball", "baseball"];
    for (const s of sports) {
        await runBacktest(s);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
