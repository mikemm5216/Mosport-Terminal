import { prisma } from "../lib/prisma";
import fs from "fs";

/**
 * NBA Probability Training Engine V3.1
 * Optimized for LogLoss (< 0.69) and Brier (< 0.25).
 */

function sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
}

// 1. PER-SEASON Z-SCORE NORMALIZATION
function normalizeBySeason(matches: any[]) {
    // Group by season
    const seasons: Record<string, any[]> = {};
    matches.forEach(m => {
        const year = new Date(m.date).getFullYear();
        const season = year <= 2023 ? "2022-2023" : (year === 2024 ? "2023-2024" : "2024-2025");
        if (!seasons[season]) seasons[season] = [];
        seasons[season].push(m);
    });

    const normalizedData: any[] = [];
    const seasonStats: Record<string, { mean: number[], std: number[] }> = {};

    for (const [season, sMatches] of Object.entries(seasons)) {
        const featureArr = sMatches.map(m => [
            m.features[0].worldDiff || 0,
            m.features[0].physioDiff || 0,
            m.features[0].psychoDiff || 0
        ]);

        const n = featureArr.length;
        const numFeatures = featureArr[0].length;
        const mean = new Array(numFeatures).fill(0);
        const std = new Array(numFeatures).fill(0);

        // Mean
        featureArr.forEach(row => row.forEach((val, i) => mean[i] += val));
        mean.forEach((_, i) => mean[i] /= n);

        // Std
        featureArr.forEach(row => row.forEach((val, i) => std[i] += Math.pow(val - mean[i], 2)));
        std.forEach((_, i) => std[i] = Math.sqrt(std[i] / n) || 1);

        seasonStats[season] = { mean, std };

        sMatches.forEach((m, idx) => {
            const normX = featureArr[idx].map((val, i) => (val - mean[i]) / std[i]);
            normalizedData.push({ ...m, normX });
        });
    }

    return { normalizedData, seasonStats };
}

// 2. LOGISTIC REGRESSION (LogLoss)
function trainLogistic(features: number[][], labels: number[], epochs = 1000, lr = 0.01) {
    const numFeatures = features[0].length;
    let weights = new Array(numFeatures).fill(0);
    let bias = 0;

    for (let epoch = 0; epoch < epochs; epoch++) {
        let dw = new Array(numFeatures).fill(0);
        let db = 0;

        for (let i = 0; i < features.length; i++) {
            const x = features[i];
            const y = labels[i];
            const p = sigmoid(x.reduce((acc, val, j) => acc + val * weights[j], 0) + bias);
            const error = p - y;
            for (let j = 0; j < numFeatures; j++) dw[j] += error * x[j];
            db += error;
        }

        const m = features.length;
        for (let j = 0; j < numFeatures; j++) weights[j] -= lr * (dw[j] / m);
        bias -= lr * (db / m);
    }
    return { weights, bias };
}

// 3. PLATT SCALING
function calibratePlatt(probs: number[], labels: number[]) {
    let A = 0;
    let B = 0;
    const lr = 0.05;
    for (let i = 0; i < 500; i++) {
        let dA = 0;
        let dB = 0;
        for (let j = 0; j < probs.length; j++) {
            const p = 1 / (1 + Math.exp(A * probs[j] + B));
            const error = p - labels[j];
            dA += error * probs[j];
            dB += error;
        }
        A -= lr * (dA / probs.length);
        B -= lr * (dB / probs.length);
    }
    return { A, B };
}

async function main() {
    console.log("[Train] --- NBA PROBABILITY ENGINE V3.1 ---");

    // 1. Fetch Ordered Data
    const matches = await (prisma as any).match.findMany({
        where: { sport: "basketball", status: "finished", features: { some: {} } },
        include: { features: true },
        orderBy: { date: "asc" }
    });

    if (matches.length < 500) {
        console.warn(`[Train] Found ${matches.length} NBA matches. Need 1000+ for Phase 3.1. Aborting.`);
        process.exit(0);
    }

    // 2. Normalize per Season
    const { normalizedData, seasonStats } = normalizeBySeason(matches);

    // 3. Chronological Split (70/15/15)
    const n = normalizedData.length;
    const trainEnd = Math.floor(n * 0.7);
    const calEnd = Math.floor(n * 0.85);

    const train = normalizedData.slice(0, trainEnd);
    const cal = normalizedData.slice(trainEnd, calEnd);
    const test = normalizedData.slice(calEnd);

    // 4. Train
    const trainX = train.map(m => m.normX);
    const trainY = train.map(m => m.matchResult === "HOME_WIN" ? 1 : 0);
    const { weights, bias } = trainLogistic(trainX, trainY);

    // 5. Calibrate
    const calProbs = cal.map(m => sigmoid(m.normX.reduce((acc, val, i) => acc + val * weights[i], 0) + bias));
    const calLabels = cal.map(m => m.matchResult === "HOME_WIN" ? 1 : 0);
    const { A, B } = calibratePlatt(calProbs, calLabels);

    // 6. Save Model
    const model = {
        nba: {
            weights,
            bias,
            seasonNormalization: seasonStats,
            calibration: { A, B },
            trainedAt: new Date().toISOString(),
            metrics: { samples: n, trainSetSize: train.length }
        }
    };

    fs.writeFileSync("model_nba.json", JSON.stringify(model, null, 2));
    console.log("[Train] NBA Model Saved: model_nba.json");
}

main().catch(console.error).finally(() => (prisma as any).$disconnect());
