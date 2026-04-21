import { prisma } from "../lib/prisma";
import { Matrix } from "ml-matrix";
import { BaseballModel } from "../lib/ml/baseball_kernel";

async function main() {
    console.log("[Train] Starting Baseball V8.1 (Optimized Kernel) Suite...");

    const matches = await (prisma as any).match.findMany({
        where: { sport: "baseball", status: "finished", baseballStats: { isNot: null } },
        include: { baseballStats: true, league: true },
        orderBy: { date: "asc" }
    });

    const N = matches.length;
    const X = new Matrix(N, 5); // xFIP_diff, wRC_diff, ISO_diff, fatigue_diff, bias
    const Y = Matrix.zeros(N, 3); // Win, Draw, Loss

    matches.forEach((m: any, i: number) => {
        const s = m.baseballStats;
        const xFIP_diff = (s.awayXFIP || 4.2) - (s.homeXFIP || 4.2);
        const wRC_diff = (s.homeWRC || 100) - (s.awayWRC || 100);

        // Mock fatigue for training signal
        const hFatigue = (m.homeScore + m.awayScore) > 10 ? 1 : 0;
        const aFatigue = 0;

        X.set(i, 0, xFIP_diff);
        X.set(i, 1, wRC_diff);
        X.set(i, 2, 0); // ISO diff placeholder
        X.set(i, 3, aFatigue - hFatigue);
        X.set(i, 4, 1.0); // Bias

        const res = m.matchResult;
        if (res === "HOME_WIN") Y.set(i, 0, 1);
        else if (res === "DRAW") Y.set(i, 1, 1);
        else Y.set(i, 2, 1);
    });

    // Norm
    for (let j = 0; j < 4; j++) {
        const col = X.getColumn(j);
        const mean = col.reduce((a, b) => a + b, 0) / N;
        const std = Math.sqrt(col.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / N) || 1;
        for (let i = 0; i < N; i++) X.set(i, j, (X.get(i, j) - mean) / std);
    }

    const model = new BaseballModel(5, 3);
    model.train(X, Y, 0.1, 2000);

    const probs = model.predict(X);
    let mlbLoss = 0, mlbCorrect = 0, mlbCount = 0;
    let asianLoss = 0, asianCorrect = 0, asianCount = 0;

    for (let i = 0; i < N; i++) {
        const isMLB = matches[i].league?.id === "MLB";
        const actualIdx = Y.getRow(i).indexOf(1);
        const p = Math.max(probs.get(i, actualIdx), 1e-15);
        const isCorrect = probs.getRow(i).indexOf(Math.max(...probs.getRow(i))) === actualIdx;

        if (isMLB) {
            mlbLoss -= Math.log(p);
            if (isCorrect) mlbCorrect++;
            mlbCount++;
        } else {
            asianLoss -= Math.log(p);
            if (isCorrect) asianCorrect++;
            asianCount++;
        }
    }

    console.log("\n--- BASEBALL V8.1 SEGMENTED RESULTS ---");
    if (mlbCount > 0) {
        console.log(`MLB (Binary) -> LogLoss: ${(mlbLoss / mlbCount).toFixed(4)}, Acc: ${(mlbCorrect / mlbCount * 100).toFixed(2)}%`);
    }
    if (asianCount > 0) {
        console.log(`Asian (Multinomial) -> LogLoss: ${(asianLoss / asianCount).toFixed(4)}, Acc: ${(asianCorrect / asianCount * 100).toFixed(2)}%`);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
