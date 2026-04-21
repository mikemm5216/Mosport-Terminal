import { prisma } from "../lib/prisma";
import fs from "fs";
import { trainPlatt, plattScale, sigmoid as rawSigmoid } from "../lib/ml/calibration";

async function trainSport(sportToTrain: string) {
    console.log(`\n[Train] --- ${sportToTrain.toUpperCase()} ---`);

    // 1. Fetch all finished matches with Spartan v2.0 features (Chronological)
    const allMatches = await (prisma as any).match.findMany({
        where: {
            sport: sportToTrain,
            status: "finished",
            features: { some: { featureVersion: "v2.0" } }
        },
        include: {
            features: { where: { featureVersion: "v2.0" } }
        },
        orderBy: { date: "asc" }
    });

    // Option A: Exclude Football Draws
    const filteredMatches = sportToTrain === "football"
        ? allMatches.filter((m: any) => m.matchResult !== "DRAW")
        : allMatches;

    if (filteredMatches.length < 40) {
        console.warn(`[Train] Skipping ${sportToTrain}: Not enough clean data (${filteredMatches.length} matches).`);
        return null;
    }

    console.log(`[Train] Found ${filteredMatches.length} matches.`);

    // 2. 70/15/15 Chronological Split
    const trainEnd = Math.floor(filteredMatches.length * 0.7);
    const calEnd = Math.floor(filteredMatches.length * 0.85);

    const trainSet = filteredMatches.slice(0, trainEnd);
    const calSet = filteredMatches.slice(trainEnd, calEnd);
    const testSet = filteredMatches.slice(calEnd);

    console.log(`[Train] Split: ${trainSet.length} train, ${calSet.length} cal, ${testSet.length} test.`);

    // 3. Train Spartan Weights (Logistic Regression)
    let weights = [0, 0, 0];
    let bias = 0;
    const lr = 0.01;
    const epochs = 1000;

    for (let i = 0; i < epochs; i++) {
        let dw = [0, 0, 0];
        let db = 0;
        for (const m of trainSet) {
            const f = m.features[0];
            const x = [f.worldDiff || 0, f.physioDiff || 0, f.psychoDiff || 0];
            const y = m.matchResult === "HOME_WIN" ? 1 : 0;
            const z = weights[0] * x[0] + weights[1] * x[1] + weights[2] * x[2] + bias;
            const pred = rawSigmoid(z);
            const error = pred - y;
            dw[0] += error * x[0]; dw[1] += error * x[1]; dw[2] += error * x[2];
            db += error;
        }
        weights[0] -= (lr * dw[0]) / trainSet.length;
        weights[1] -= (lr * dw[1]) / trainSet.length;
        weights[2] -= (lr * dw[2]) / trainSet.length;
        bias -= (lr * db) / trainSet.length;
    }

    // 4. Train Calibration (Platt Scaling)
    const calProbs: number[] = [];
    const calLabels: number[] = [];
    for (const m of calSet) {
        const f = m.features[0];
        const x = [f.worldDiff || 0, f.physioDiff || 0, f.psychoDiff || 0];
        const z = weights[0] * x[0] + weights[1] * x[1] + weights[2] * x[2] + bias;
        calProbs.push(rawSigmoid(z));
        calLabels.push(m.matchResult === "HOME_WIN" ? 1 : 0);
    }

    const { A, B } = trainPlatt(calProbs, calLabels);

    return {
        weights,
        bias,
        calibration: { A, B },
        metrics: {
            trainSize: trainSet.length,
            calSize: calSet.length,
            testSize: testSet.length
        },
        trainedAt: new Date().toISOString()
    };
}

async function main() {
    const sports = ["football", "basketball", "baseball"];
    const allModels: any = {};

    for (const s of sports) {
        const model = await trainSport(s);
        if (model) allModels[s] = model;
    }

    fs.writeFileSync("model_weights.json", JSON.stringify(allModels, null, 2));
    console.log("\n[Train] All Spartan Models saved to model_weights.json");
}

main()
    .catch(console.error)
    .finally(() => (prisma as any).$disconnect());
