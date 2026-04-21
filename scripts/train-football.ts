import { prisma } from "../lib/prisma";
import { Matrix } from "ml-matrix";
import { MultinomialModel, toOneHot } from "../lib/ml/multinomial";

async function main() {
    console.log("[Train] Starting multinomial football training...");

    const features = await (prisma as any).matchFeatures.findMany({
        where: { sport: "football", featureVersion: "FB_V1.0" },
        include: { match: true },
        orderBy: { match: { date: "asc" } }
    });

    if (features.length < 100) {
        console.error("Insufficient data for training.");
        return;
    }

    features.sort((a, b) => new Date(a.match.date).getTime() - new Date(b.match.date).getTime());

    const X = new Matrix(features.length, 6);
    const labels: number[] = [];

    features.forEach((f, i) => {
        X.set(i, 0, f.worldDiff || 0);
        X.set(i, 1, f.homeWorld || 0);
        X.set(i, 2, f.awayWorld || 0);
        X.set(i, 3, f.physioDiff || 0);
        X.set(i, 4, f.homePsycho || 0);
        X.set(i, 5, f.awayPsycho || 0);

        const res = f.match.matchResult;
        if (res === "HOME_WIN") labels.push(0);
        else if (res === "DRAW") labels.push(1);
        else labels.push(2);
    });

    // NORMALIZATION
    for (let j = 0; j < X.columns; j++) {
        const col = X.getColumn(j);
        const mean = col.reduce((a, b) => a + b, 0) / col.length;
        const std = Math.sqrt(col.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / col.length) || 1;
        for (let i = 0; i < X.rows; i++) {
            X.set(i, j, (X.get(i, j) - mean) / std);
        }
    }

    const N = features.length;
    const split1 = Math.floor(N * 0.7);
    const split2 = Math.floor(N * 0.85);

    const trainX = X.subMatrix(0, split1 - 1, 0, 5);
    const trainY = toOneHot(labels.slice(0, split1));

    const testX = X.subMatrix(split2, N - 1, 0, 5);
    const testY = labels.slice(split2);

    const model = new MultinomialModel(6, 3);
    model.train(trainX, trainY, 0.05, 1000, 64);

    const preds = model.predict(testX);
    let correct = 0;
    let logLoss = 0;
    let brierSum = 0;

    for (let i = 0; i < testX.rows; i++) {
        const row = preds.getRow(i);
        const predClass = row.indexOf(Math.max(...row));
        if (predClass === testY[i]) correct++;

        const p = Math.max(row[testY[i]], 1e-15);
        logLoss -= Math.log(p);

        let rowBrier = 0;
        for (let k = 0; k < 3; k++) {
            const actual = (k === testY[i] ? 1 : 0);
            rowBrier += Math.pow(row[k] - actual, 2);
        }
        brierSum += rowBrier;
    }

    console.log("\n--- REAL FOOTBALL BACKTEST (70/15/15) ---");
    console.log(`Accuracy: ${(correct / testX.rows * 100).toFixed(2)}%`);
    console.log(`LogLoss: ${(logLoss / testX.rows).toFixed(4)}`);
    console.log(`Brier Score: ${(brierSum / testX.rows).toFixed(4)}`);
    console.log(`Total Samples: ${features.length}`);
    console.log(`Total Samples: ${features.length}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
