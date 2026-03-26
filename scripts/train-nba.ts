import { prisma } from "../lib/prisma";
import fs from "fs";
import { trainPlatt, sigmoid } from "../lib/ml/calibration";

/**
 * NBA Probability Training Engine V3.3 (Scientific Mode)
 */

async function getMatchesWithFeatures() {
    return (prisma as any).match.findMany({
        where: { sport: "basketball", status: "finished", features: { some: { featureVersion: "NBA_V3.3" } } },
        include: { features: { where: { featureVersion: "NBA_V3.3" } } },
        orderBy: { date: "asc" }
    });
}

function trainLogistic(features: number[][], labels: number[], epochs = 2000, lr = 0.05) {
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

async function main() {
    console.log("[Train] --- NBA SCIENTIFIC TRAINING V3.3 ---");

    const rawMatches = await getMatchesWithFeatures();
    if (rawMatches.length < 200) {
        console.warn(`[Train] Found only ${rawMatches.length} matches. Need more for scientific validation.`);
        // Note: Seeding might still be running.
        return;
    }

    // 1. Prepare X and Y
    // X = [netRatingDiff, tsDiff, paceDiff, restDaysDiff, isB2BDiff, rotationLoadDiff, starterConsistency]
    const data = rawMatches.map(m => {
        const f = m.features[0];
        return {
            x: [
                f.worldDiff || 0,   // netRatingDiff
                f.homeWorld || 0,   // tsDiff (re-purposed slot)
                f.awayWorld || 0,   // paceDiff (re-purposed slot)
                f.physioDiff || 0,  // restDaysDiff
                f.homePhysio || 0,  // isB2BDiff (re-purposed slot)
                f.awayPhysio || 0,  // rotationLoadDiff (re-purposed slot)
                f.psychoDiff || 0   // starterConsistency
            ],
            y: m.matchResult === "HOME_WIN" ? 1 : 0
        };
    });

    // 2. Normalization (Z-Score)
    const n = data.length;
    const numFeatures = 7;
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

    // 3. Chronological Split (70/15/15)
    const trainEnd = Math.floor(n * 0.7);
    const calEnd = Math.floor(n * 0.85);

    const trainSet = normData.slice(0, trainEnd);
    const calSet = normData.slice(trainEnd, calEnd);
    const testSet = normData.slice(calEnd);

    console.log(`[Train] Split: Train=${trainSet.length}, Cal=${calSet.length}, Test=${testSet.length}`);

    // 4. Training
    const { weights, bias } = trainLogistic(trainSet.map(d => d.x), trainSet.map(d => d.y));
    console.log("[Train] Model Weights (raw):", weights.map(w => w.toFixed(4)));

    // 5. Calibration (Platt)
    const calProbs = calSet.map(d => sigmoid(d.x.reduce((acc, v, i) => acc + v * weights[i], 0) + bias));
    const { A, B } = trainPlatt(calProbs, calSet.map(d => d.y));
    console.log(`[Train] Platt Params: A=${A.toFixed(4)}, B=${B.toFixed(4)}`);

    // 6. Weight Compression (V3.3 Aggregate)
    const worldWeights = [weights[0], weights[1], weights[2]];
    const physioWeights = [weights[3], weights[4], weights[5]];
    const psychoWeights = [weights[6]];

    // 7. Save Model
    const model = {
        version: "V3.3-SCIENTIFIC",
        weights,
        bias,
        calibration: { A, B },
        normalization: { means, stds },
        compression: {
            world: worldWeights,
            physio: physioWeights,
            psycho: psychoWeights
        },
        trainedAt: new Date().toISOString(),
        samples: n
    };

    fs.writeFileSync("model_nba.json", JSON.stringify(model, null, 2));
    console.log("[Train] NBA Model Saved: model_nba.json");
}

main().catch(console.error).finally(() => prisma.$disconnect());
