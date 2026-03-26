import { prisma } from "../lib/prisma";
import fs from "fs";

async function train(sportToTrain: string) {
    console.log(`[Train] Starting Spartan Training for: ${sportToTrain}...`);

    // 1. Fetch all finished matches with Spartan v2.0 features
    // We only take matches where result is NOT Draw for "Option A" simplification
    const matches = await (prisma as any).match.findMany({
        where: {
            sport: sportToTrain,
            status: "finished",
            matchResult: { in: ["HOME_WIN", "AWAY_WIN"] }, // Option A: Exclude Draws for training
            features: { some: { featureVersion: "v2.0" } }
        },
        include: {
            features: { where: { featureVersion: "v2.0" } }
        },
        orderBy: { date: "asc" }
    });

    if (matches.length < 20) {
        console.error("[Train] Not enough clean data. Please run seeding first.");
        return;
    }

    console.log(`[Train] Found ${matches.length} training matches.`);

    // 2. Prepare Dataset
    const dataset = matches.map((m: any) => {
        const f = m.features[0];
        return {
            x: [f.worldDiff || 0, f.physioDiff || 0, f.psychoDiff || 0],
            y: m.matchResult === "HOME_WIN" ? 1 : 0,
            date: m.date
        };
    });

    // 70/30 Chronological Split
    const trainSize = Math.floor(dataset.length * 0.7);
    const trainData = dataset.slice(0, trainSize);
    const testData = dataset.slice(trainSize);

    console.log(`[Train] Split (Time-based): ${trainData.length} train, ${testData.length} test.`);

    // 3. Logistic Regression (Gradient Descent)
    let weights = [0, 0, 0];
    let bias = 0;
    const learningRate = 0.01;
    const epochs = 1000;

    const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

    console.log("[Train] Starting Gradient Descent (Spartan Build)...");

    for (let i = 0; i < epochs; i++) {
        let dw = [0, 0, 0];
        let db = 0;
        let totalLoss = 0;

        for (const { x, y } of trainData) {
            const z = weights[0] * x[0] + weights[1] * x[1] + weights[2] * x[2] + bias;
            const pred = sigmoid(z);
            const error = pred - y;

            dw[0] += error * x[0];
            dw[1] += error * x[1];
            dw[2] += error * x[2];
            db += error;

            totalLoss += - (y * Math.log(pred + 1e-15) + (1 - y) * Math.log(1 - pred + 1e-15));
        }

        weights[0] -= (learningRate * dw[0]) / trainData.length;
        weights[1] -= (learningRate * dw[1]) / trainData.length;
        weights[2] -= (learningRate * dw[2]) / trainData.length;
        bias -= (learningRate * db) / trainData.length;

        if (i % 200 === 0) {
            console.log(`[Train] Epoch ${i}: Loss = ${(totalLoss / trainData.length).toFixed(4)}`);
        }
    }

    // 4. Save Weights
    const model = {
        sport: sportToTrain,
        weights,
        bias,
        trainSize,
        testSize: testData.length,
        trainedAt: new Date().toISOString()
    };

    fs.writeFileSync("model_weights.json", JSON.stringify(model, null, 2));
    console.log("[Train] Spartan Weights Saved to model_weights.json");
    console.log("[Train] Optimized Weights:", weights, "Bias:", bias);
}

// Default to football for now
const sport = process.argv[2] || "football";
train(sport)
    .catch(console.error)
    .finally(() => (prisma as any).$disconnect());
