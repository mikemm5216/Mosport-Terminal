import { prisma } from "../lib/prisma";
import { Matrix } from "ml-matrix";
import { computeFootballFeaturesV6, FootballStatsV2 } from "../lib/features/football_features_v2";
import { NeuralGoalModel } from "../lib/ml/hierarchical_poisson";

async function main() {
    console.log("[Train] Starting Football V6.2 (Neural Engine) Training...");
    const startTime = Date.now();

    const matches = await (prisma as any).match.findMany({
        where: { sport: "football", status: "finished", footballStats: { isNot: null } },
        include: { footballStats: true, league: true },
        orderBy: { date: "asc" }
    });

    const teamHistory = new Map<string, FootballStatsV2[]>();
    const teamElo = new Map<string, number>();
    const features: any[] = [];

    matches.forEach(m => {
        const hId = m.homeTeamId;
        const aId = m.awayTeamId;
        const hElo = teamElo.get(hId) || 1500;
        const aElo = teamElo.get(aId) || 1500;
        const hHist = teamHistory.get(hId) || [];
        const aHist = teamHistory.get(aId) || [];

        const f = computeFootballFeaturesV6(hHist, aHist, m.date, hElo, aElo);

        // --- FEATURE EXPANSION ---
        const xRaw = [f.eloRating_diff, f.homeAdvantage_bias, f.fixtureCongestion_score, f.attack_form_xG, f.net_xg_diff];
        const xExp = [...xRaw, xRaw[0] * xRaw[0], xRaw[4] * xRaw[4], xRaw[0] * xRaw[4]];

        features.push({
            x: xExp,
            y: (m.homeScore || 0) - (m.awayScore || 0),
            result: m.matchResult,
            date: m.date
        });

        const actualH = m.matchResult === "HOME_WIN" ? 1 : (m.matchResult === "DRAW" ? 0.5 : 0);
        const expectedH = 1 / (1 + Math.pow(10, (aElo - hElo) / 400));
        const K = 32;
        teamElo.set(hId, hElo + K * (actualH - expectedH));
        teamElo.set(aId, aElo + K * ((1 - actualH) - (1 - expectedH)));

        const s = m.footballStats;
        hHist.push({ date: m.date, xg: s.homeXG, xga: s.awayXG, goals: m.homeScore || 0, goalsConceded: m.awayScore || 0, poss: s.homePoss, sot: s.homeSot });
        aHist.push({ date: m.date, xg: s.awayXG, xga: s.homeXG, goals: m.awayScore || 0, goalsConceded: m.homeScore || 0, poss: s.awayPoss, sot: s.awaySot });
        if (hHist.length > 10) hHist.shift();
        if (aHist.length > 10) aHist.shift();
    });

    const N = features.length;
    const split1 = Math.floor(N * 0.7);
    const split2 = Math.floor(N * 0.85);

    const X = new Matrix(features.length, 8);
    const Y_diff = new Matrix(features.length, 1);
    const Y_draw = new Matrix(features.length, 1);

    features.forEach((f, i) => {
        f.x.forEach((val: number, j: number) => X.set(i, j, val));
        Y_diff.set(i, 0, f.y);
        Y_draw.set(i, 0, f.result === "DRAW" ? 1 : 0);
    });

    for (let j = 0; j < X.columns; j++) {
        const col = X.getColumn(j);
        const mean = col.reduce((a, b) => a + b, 0) / col.length;
        const std = Math.sqrt(col.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / col.length) || 1;
        for (let i = 0; i < X.rows; i++) X.set(i, j, (X.get(i, j) - mean) / std);
    }

    const trainX = X.subMatrix(0, split1 - 1, 0, 7);
    const trainY_diff = Y_diff.subMatrix(0, split1 - 1, 0, 0);
    const trainY_draw = Y_draw.subMatrix(0, split1 - 1, 0, 0);

    const model = new NeuralGoalModel(8);
    model.train(trainX, trainY_diff, trainY_draw, 0.2, 3000);

    // --- CALIBRATION ---
    const calX = X.subMatrix(split1, split2 - 1, 0, 7);
    const calLabels = features.slice(split1, split2).map(f => f.result === "HOME_WIN" ? 0 : (f.result === "DRAW" ? 1 : 2));
    const calProbs = model.predictProbs(calX);
    let bestDrawMulti = 1.0;
    let minLogLoss = Infinity;

    for (let m = 0.5; m <= 2.0; m += 0.05) {
        let currentLL = 0;
        for (let i = 0; i < calX.rows; i++) {
            let pD = Math.min(0.95, calProbs.get(i, 1) * m);
            let pH_raw = calProbs.get(i, 0);
            let pA_raw = calProbs.get(i, 2);
            let pH = (1 - pD) * (pH_raw / (pH_raw + pA_raw + 1e-9));
            let pA = 1 - pD - pH;
            const pArr = [pH, pD, pA];
            currentLL -= Math.log(Math.max(pArr[calLabels[i]], 1e-15));
        }
        if (currentLL < minLogLoss) { minLogLoss = currentLL; bestDrawMulti = m; }
    }
    console.log(`[Calibration] Draw Scaler: ${bestDrawMulti.toFixed(2)}`);

    // --- TEST ---
    const testX = X.subMatrix(split2, N - 1, 0, 7);
    const testLabels = features.slice(split2).map(f => f.result === "HOME_WIN" ? 0 : (f.result === "DRAW" ? 1 : 2));
    const rawTestProbs = model.predictProbs(testX);
    let correct = 0; let logLoss = 0; let brierSum = 0;

    for (let i = 0; i < testX.rows; i++) {
        let pD = Math.min(0.95, rawTestProbs.get(i, 1) * bestDrawMulti);
        let pH_raw = rawTestProbs.get(i, 0);
        let pA_raw = rawTestProbs.get(i, 2);
        let pH = (1 - pD) * (pH_raw / (pH_raw + pA_raw + 1e-9));
        let pA = 1 - pD - pH;
        const row = [pH, pD, pA];
        const predClass = row.indexOf(Math.max(...row));
        if (predClass === testLabels[i]) correct++;
        logLoss -= Math.log(Math.max(row[testLabels[i]], 1e-15));

        let rowBrier = 0;
        for (let k = 0; k < 3; k++) rowBrier += Math.pow(row[k] - (k === testLabels[i] ? 1 : 0), 2);
        brierSum += rowBrier;
    }

    console.log("\n--- FOOTBALL V6.2 (NEURAL SCALED) RESULTS ---");
    console.log(`Accuracy: ${(correct / testX.rows * 100).toFixed(2)}%`);
    console.log(`LogLoss: ${(logLoss / testX.rows).toFixed(4)}`);
    console.log(`Brier Score: ${(brierSum / testX.rows).toFixed(4)}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
