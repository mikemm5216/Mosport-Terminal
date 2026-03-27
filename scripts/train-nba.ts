import { prisma } from "../lib/prisma";
import fs from "fs";
import { trainPlatt, sigmoid, brierScore, logLoss } from "../lib/ml/calibration";

/**
 * NBA STABILITY TRAINING ENGINE V3.2
 * Cross-Season Validation: Train (2021-23), Test (2023-24)
 */

async function main() {
    console.log("[Train] --- NBA STABILITY HARDENING (V3.2) ---");

    // 1. Fetch Ordered Data with V3.2 Features
    const matches = await (prisma as any).match.findMany({
        where: { sport: "basketball", status: "finished", features: { some: { featureVersion: "NBA_V3.2" } } },
        include: { features: { where: { featureVersion: "NBA_V3.2" } } },
        orderBy: { date: "asc" }
    });

    if (matches.length < 2000) {
        console.warn(`[Train] Stability Mandate Warning: Found ${matches.length} matches. Targeting 3000+ for Phase 3.2.`);
    }

    // 2. Extract 8 Features
    const data = matches.map(m => {
        const f = m.features[0];
        return {
            date: m.date,
            x: [
                f.worldDiff || 0,      // OffRatingDiff
                f.homeWorld || 0,      // DefRatingDiff
                f.awayWorld || 0,      // TOVRateDiff
                f.physioDiff || 0,     // RoadTripDiff
                f.homePhysio || 0,     // TZShiftDiff
                f.awayPhysio || 0,     // is3in4Diff
                f.psychoDiff || 0,     // NetRatingStdDiff
                f.homePsycho || 0      // TSStdDiff
            ],
            y: m.matchResult === "HOME_WIN" ? 1 : 0
        };
    });

    const n = data.length;
    const numFeatures = 8;
    if (n === 0) {
        console.error("[Train] Error: No V3.2 features found.");
        return;
    }

    // 3. Normalization (Z-score)
    const means = new Array(numFeatures).fill(0);
    const stds = new Array(numFeatures).fill(0);
    data.forEach(d => d.x.forEach((v, i) => means[i] += v));
    means.forEach((_, i) => means[i] /= n);
    data.forEach(d => d.x.forEach((v, i) => stds[i] += Math.pow(v - means[i], 2)));
    stds.forEach((_, i) => stds[i] = Math.sqrt(stds[i] / n) || 1);

    const normData = data.map(d => ({
        date: d.date,
        x: d.x.map((v, i) => (v - means[i]) / stds[i]),
        y: d.y
    }));

    // 4. Cross-Season Split (Train < 2023-10-01, Test >= 2023-10-01)
    const splitDate = new Date("2023-10-01");
    const trainCalData = normData.filter(d => new Date(d.date) < splitDate);
    const testSet = normData.filter(d => new Date(d.date) >= splitDate);

    // Further split trainCal into 80/20 for Platt scaling
    const trainEnd = Math.floor(trainCalData.length * 0.8);
    const trainSet = trainCalData.slice(0, trainEnd);
    const calSet = trainCalData.slice(trainEnd);

    console.log(`[Train] Cross-Season Split: Train=${trainSet.length}, Cal=${calSet.length}, Test (2023-24)=${testSet.length}`);

    // 5. Logistic Regression (GD)
    let weights = new Array(numFeatures).fill(0);
    let bias = 0;
    const lr = 0.05, epochs = 3000;

    for (let e = 0; e < epochs; e++) {
        let dw = new Array(numFeatures).fill(0), db = 0;
        for (const d of trainSet) {
            const z = d.x.reduce((acc, v, i) => acc + v * weights[i], 0) + bias;
            const p = sigmoid(z);
            const err = p - d.y;
            for (let i = 0; i < numFeatures; i++) dw[i] += err * d.x[i];
            db += err;
        }
        for (let i = 0; i < numFeatures; i++) weights[i] -= lr * (dw[i] / trainSet.length);
        bias -= lr * (db / trainSet.length);
    }

    // 6. Platt Scaling
    const calProbs = calSet.map(d => sigmoid(d.x.reduce((acc, v, i) => acc + v * weights[i], 0) + bias));
    const { A, B } = trainPlatt(calProbs, calSet.map(d => d.y));

    // 7. Per-Season Reporting
    console.log("\n--- PER-SEASON STABILITY REPORT ---");
    const seasonSplits = {
        "2021-23 (Train)": trainCalData,
        "2023-24 (Test)": testSet
    };

    for (const [name, set] of Object.entries(seasonSplits)) {
        if (set.length === 0) continue;
        const probs = set.map(d => {
            const raw = sigmoid(d.x.reduce((acc, v, i) => acc + v * weights[i], 0) + bias);
            return 1 / (1 + Math.exp(A * raw + B));
        });
        const labels = set.map(d => d.y);
        console.log(`[${name}] LogLoss: ${logLoss(probs, labels).toFixed(4)}, Brier: ${brierScore(probs, labels).toFixed(4)}, Acc: ${(probs.filter((p, i) => (p >= 0.5) === (labels[i] === 1)).length / set.length * 100).toFixed(2)}%`);
    }

    // 8. Save Model
    const model = {
        version: "V3.2-STABILITY-HARDENED",
        features: ["OffRating", "DefRating", "TOVRate", "RoadTrip", "TZShift", "is3in4", "NetRatingStd", "TSStd"],
        weights, bias, calibration: { A, B }, normalization: { means, stds },
        trainedAt: new Date().toISOString(),
        samples: n
    };

    fs.writeFileSync("model_nba.json", JSON.stringify(model, null, 2));
    console.log("[Train] NBA STABILITY MODEL SAVED.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
