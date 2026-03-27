import { prisma } from "../lib/prisma";
import { Matrix } from "ml-matrix";
import { MultinomialModel, toOneHot } from "../lib/ml/multinomial";

async function main() {
    console.log("[Train] Starting league-aware baseball training...");

    const features = await (prisma as any).matchFeatures.findMany({
        where: { sport: "baseball", featureVersion: "BB_V1.0" },
        include: { match: true },
        orderBy: { match: { date: "asc" } }
    });

    if (features.length < 100) {
        console.error("Insufficient data.");
        return;
    }

    // PARTITION: MLB vs Multinomial Leagues
    const mlbFeatures = features.filter(f => f.match.leagueId === "MLB");
    const internationalFeatures = features.filter(f => ["CPBL", "NPB", "KBO"].includes(f.match.leagueId || ""));

    console.log(`[Train] MLB Samples: ${mlbFeatures.length}`);
    console.log(`[Train] International Samples: ${internationalFeatures.length}`);

    // 1. Train MLB (Binary logic - simplified using multinomial with 2 classes or just home/away)
    if (mlbFeatures.length > 50) {
        runTraining("MLB", mlbFeatures, 2);
    }

    // 2. Train International (Multinomial 3 classes)
    if (internationalFeatures.length > 50) {
        runTraining("Asian Leagues", internationalFeatures, 3);
    }
}

async function runTraining(label: string, data: any[], classes: number) {
    const X = new Matrix(data.length, 6);
    const labels: number[] = [];

    data.forEach((f, i) => {
        X.set(i, 0, f.worldDiff || 0);
        X.set(i, 1, f.homeWorld || 0);
        X.set(i, 2, f.awayWorld || 0);
        X.set(i, 3, f.physioDiff || 0);
        X.set(i, 4, f.psychoDiff || 0);
        X.set(i, 5, f.homePsycho || 0);

        const res = f.match.matchResult;
        if (classes === 2) {
            labels.push(res === "HOME_WIN" ? 0 : 1);
        } else {
            if (res === "HOME_WIN") labels.push(0);
            else if (res === "DRAW") labels.push(1);
            else labels.push(2);
        }
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

    const split = Math.floor(data.length * 0.8);
    const trainX = X.subMatrix(0, split - 1, 0, 5);
    const testX = X.subMatrix(split, data.length - 1, 0, 5);
    const trainY = toOneHot(labels.slice(0, split), classes);
    const testY = labels.slice(split);

    const freqs = [0, 0, 0];
    labels.forEach(l => freqs[l]++);
    const total = labels.length || 1;
    const priors = freqs.map(f => f / total);

    const maxFreq = Math.max(...freqs);
    const weights = freqs.map(f => (f > 0 ? maxFreq / f : 1.0));

    console.log(`[Train] Priors: [H: ${priors[0].toFixed(3)}, D: ${priors[1].toFixed(3)}, A: ${priors[2].toFixed(3)}]`);

    const model = new MultinomialModel(6, classes);
    model.setBiasFromPriors(priors);
    model.train(trainX, trainY, 0.05, 1000, 64, weights);

    const preds = model.predict(testX);
    let correct = 0;
    let logLoss = 0;
    let sumPredDraw = 0;
    let actualDraws = 0;

    for (let i = 0; i < testX.rows; i++) {
        const row = preds.getRow(i);
        const predClass = row.indexOf(Math.max(...row));
        if (predClass === testY[i]) correct++;
        logLoss -= Math.log(Math.max(row[testY[i]], 1e-15));

        if (classes === 3) {
            sumPredDraw += row[1]; // Index 1 is DRAW
            if (testY[i] === 1) actualDraws++;
        }
    }

    console.log(`\n--- ${label} RESULTS ---`);
    console.log(`Accuracy: ${(correct / testX.rows * 100).toFixed(2)}%`);
    console.log(`LogLoss: ${(logLoss / testX.rows).toFixed(4)}`);

    if (classes === 3) {
        console.log(`[Calibration] Draw Class:`);
        console.log(`  Avg Pred: ${(sumPredDraw / testX.rows * 100).toFixed(2)}%`);
        console.log(`  Actual Rate: ${(actualDraws / testX.rows * 100).toFixed(2)}%`);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
