import { prisma } from "../lib/prisma";
import fs from "fs";
import { trainPlatt, sigmoid } from "../lib/ml/calibration";

/**
 * NBA SCIENTIFIC TRAINING ENGINE V3.3 (FINAL HARDENING)
 * NO Heuristics. NO Libraries. PURE Math.
 */

async function main() {
    console.log("[Train] --- NBA FINAL HARDENING (SCIENTIFIC MODE) ---");

    // 1. Fetch Ordered Data with Hardened Features
    const matches = await (prisma as any).match.findMany({
        where: { sport: "basketball", status: "finished", features: { some: { featureVersion: "NBA_V3.3" } } },
        include: { features: { where: { featureVersion: "NBA_V3.3" } } },
        orderBy: { date: "asc" }
    });

    if (matches.length < 1000) {
        console.warn(`[Train] Scientific Mandate Error: Found ${matches.length} matches. Need 1000+ for V3.3.`);
        return;
    }

    // 2. Extract 5 Features: [NetRatingDiff, TSDiff, PaceDiff, RestDiff, B2BDiff]
    const data = matches.map(m => {
        const f = m.features[0];
        return {
            x: [
                f.worldDiff || 0,
                f.homeWorld || 0, // TSDiff
                f.awayWorld || 0, // PaceDiff
                f.physioDiff || 0, // RestDiff
                f.homePhysio || 0  // B2BDiff
            ],
            y: m.matchResult === "HOME_WIN" ? 1 : 0
        };
    });

    const n = data.length;
    const numFeatures = 5;

    // 3. Z-Score Normalization
    const means = new Array(numFeatures).fill(0);
    const stds = new Array(numFeatures).fill(0);
    data.forEach(d => d.x.forEach((v, i) => means[i] += v));
    means.forEach((_, i) => means[i] /= n);
    data.forEach(d => d.x.forEach((v, i) => stds[i] += Math.pow(v - means[i], 2)));
    stds.forEach((_, i) => stds[i] = Math.sqrt(stds[i] / n) || 1);

    const normData = data.map(d => ({
        x: d.x.map((v, i) => (v - means[i]) / stds[i]),
        y: d.y
    }));

    // 4. Chronological Split (70/15/15)
    const trainEnd = Math.floor(n * 0.7);
    const calEnd = Math.floor(n * 0.85);

    const trainSet = normData.slice(0, trainEnd);
    const calSet = normData.slice(trainEnd, calEnd);
    const testSet = normData.slice(calEnd);

    console.log(`[Train] Split: Train=${trainEnd}, Cal=${calEnd - trainEnd}, Test=${n - calEnd}`);

    // 5. Logistic Regression (Gradient Descent)
    let weights = new Array(numFeatures).fill(0);
    let bias = 0;
    const lr = 0.05;
    const epochs = 2500;

    for (let e = 0; e < epochs; e++) {
        let dw = new Array(numFeatures).fill(0);
        let db = 0;
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

    // 6. Platt Scaling (on Calibration Set)
    const calProbs = calSet.map(d => sigmoid(d.x.reduce((acc, v, i) => acc + v * weights[i], 0) + bias));
    const { A, B } = trainPlatt(calProbs, calSet.map(d => d.y));

    // 7. Success Criteria Verification (on Calibration/Test set check)
    // We'll save the model and let the backtest do the final truth reporting.
    const model = {
        version: "V3.3-SCIENTIFIC-HARDENED",
        weights,
        bias,
        calibration: { A, B },
        normalization: { means, stds },
        trainedAt: new Date().toISOString(),
        samples: n
    };

    fs.writeFileSync("model_nba.json", JSON.stringify(model, null, 2));
    console.log("[Train] NBA SCIENTIFIC MODEL SAVED: model_nba.json");
}

main().catch(console.error).finally(() => prisma.$disconnect());
