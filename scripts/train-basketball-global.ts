import { prisma } from "../lib/prisma";
import { Matrix } from "ml-matrix";
import { MultinomialModel, toOneHot } from "../lib/ml/multinomial";

async function main() {
    console.log("[Train] Starting global basketball training (NBA + FIBA)...");

    const features = await (prisma as any).matchFeatures.findMany({
        where: { sport: "basketball", featureVersion: "NBA_V4.0" },
        include: { match: true },
        orderBy: { match: { date: "asc" } }
    });

    if (features.length < 100) {
        console.error("Insufficient data.");
        return;
    }

    const X = new Matrix(features.length, 3);
    const labels: number[] = [];

    features.forEach((f, i) => {
        X.set(i, 0, f.worldDiff || 0);
        X.set(i, 1, f.homeWorld || 0);
        X.set(i, 2, f.awayWorld || 0);
        labels.push(f.match.matchResult === "HOME_WIN" ? 0 : 1);
    });

    // Normalize
    for (let j = 0; j < X.columns; j++) {
        const col = X.getColumn(j);
        const mean = col.reduce((a, b) => a + b, 0) / col.length;
        const std = Math.sqrt(col.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / col.length) || 1;
        for (let i = 0; i < X.rows; i++) {
            X.set(i, j, (X.get(i, j) - mean) / std);
        }
    }

    const split = Math.floor(features.length * 0.8);
    const trainX = X.subMatrix(0, split - 1, 0, 2);
    const testX = X.subMatrix(split, features.length - 1, 0, 2);
    const trainY = toOneHot(labels.slice(0, split), 2);
    const testY = labels.slice(split);

    const model = new MultinomialModel(3, 2);
    model.train(trainX, trainY, 0.05, 500, 32);

    const preds = model.predict(testX);
    let correct = 0;
    let logLoss = 0;

    for (let i = 0; i < testX.rows; i++) {
        const row = preds.getRow(i);
        const predClass = row.indexOf(Math.max(...row));
        if (predClass === testY[i]) correct++;
        logLoss -= Math.log(Math.max(row[testY[i]], 1e-15));
    }

    console.log("\n--- GLOBAL BASKETBALL RESULTS ---");
    console.log(`Accuracy: ${(correct / testX.rows * 100).toFixed(2)}%`);
    console.log(`LogLoss: ${(logLoss / testX.rows).toFixed(4)}`);
    console.log(`Total Samples: ${features.length}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
