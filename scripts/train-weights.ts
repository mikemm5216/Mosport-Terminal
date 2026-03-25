import { prisma } from "../lib/prisma";
import fs from "fs";

async function train() {
    console.log("[Train] Fetching data for training...");

    // 1. Fetch all finished matches with features
    const matches = await prisma.matches.findMany({
        where: {
            status: "finished",
            features: { some: { featureVersion: "v1.0" } }
        },
        include: {
            features: { where: { featureVersion: "v1.0", teamType: "diff" } }
        }
    });

    if (matches.length < 10) {
        console.error("[Train] Not enough data. Please run seeding first.");
        return;
    }

    console.log(`[Train] Found ${matches.length} matches.`);

    // 2. Prepare Dataset (X, Y)
    const dataset = matches.map(m => {
        const f = (m as any).features[0];
        return {
            x: [f.xgdDiff || 0, f.fatigueDiff || 0, f.motivationDiff || 0],
            y: m.home_score! > m.away_score! ? 1 : 0,
            date: m.match_date
        };
    });

    // Chronological Split (70/30) - Protect against data leakage
    dataset.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const trainSize = Math.floor(dataset.length * 0.7);
    const trainData = dataset.slice(0, trainSize);
    const testData = dataset.slice(trainSize);

    console.log(`[Train] Split (Time-based): ${trainData.length} train, ${testData.length} test (Held-out).`);

    // 3. Logistic Regression (Gradient Descent)
    let weights = [0, 0, 0];
    let bias = 0;
    const learningRate = 0.01;
    const epochs = 1000;

    const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

    console.log("[Train] Starting Gradient Descent...");

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

            // Optional: Cross-Entropy Loss
            totalLoss += - (y * Math.log(pred + 1e-15) + (1 - y) * Math.log(1 - pred + 1e-15));
        }

        // Update weights
        weights[0] -= (learningRate * dw[0]) / trainData.length;
        weights[1] -= (learningRate * dw[1]) / trainData.length;
        weights[2] -= (learningRate * dw[2]) / trainData.length;
        bias -= (learningRate * db) / trainData.length;

        if (i % 200 === 0) {
            console.log(`[Train] Epoch ${i}: Loss = ${(totalLoss / trainData.length).toFixed(4)}`);
        }
    }

    console.log("[Train] Optimization complete.");
    console.log("[Train] Final Weights:", weights);
    console.log("[Train] Final Bias:", bias);

    // 4. Save Model
    const model = {
        weights,
        bias,
        trainSize,
        testSize: testData.length,
        trainedAt: new Date().toISOString()
    };

    fs.writeFileSync("model_weights.json", JSON.stringify(model, null, 2));
    console.log("[Train] Model saved to model_weights.json");
}

train()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
