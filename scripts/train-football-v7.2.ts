import { prisma } from "../lib/prisma";
import { Matrix } from "ml-matrix";
import { computeFootballFeaturesV6, FootballStatsV2 } from "../lib/features/football_features_v2";
import { SkellamGoalModel } from "../lib/ml/skellam_kernel";
import { IsotonicCalibrator } from "../lib/ml/isotonic";
import { bucketAnalysis } from "../lib/ml/calibration";

async function main() {
    console.log("[Train] Starting Football V7.2 (Calibrated Skellam) Suite...");

    const matches = await (prisma as any).match.findMany({
        where: { sport: "football", status: "finished", footballStats: { isNot: null } },
        include: { footballStats: true },
        orderBy: { date: "asc" }
    });

    const teamHistory = new Map<string, FootballStatsV2[]>();
    const teamElo = new Map<string, number>();
    const features: any[] = [];
    let actualGoalsSum = 0;

    matches.forEach(m => {
        const hElo = teamElo.get(m.homeTeamId) || 1500;
        const aElo = teamElo.get(m.awayTeamId) || 1500;
        const hHist = teamHistory.get(m.homeTeamId) || [];
        const aHist = teamHistory.get(m.awayTeamId) || [];

        const f = computeFootballFeaturesV6(hHist, aHist, m.date, hElo, aElo);
        const xRaw = [f.eloRating_diff, 1.0, f.fixtureCongestion_score, f.attack_form_xG, f.net_xg_diff];
        const xExp = [...xRaw, xRaw[0] * xRaw[0], xRaw[4] * xRaw[4], xRaw[0] * xRaw[4]];

        features.push({
            x: xExp,
            yH: m.homeScore || 0,
            yA: m.awayScore || 0,
            result: m.matchResult,
            date: m.date
        });

        actualGoalsSum += (m.homeScore || 0) + (m.awayScore || 0);

        // Update loop...
        const actualH = m.matchResult === "HOME_WIN" ? 1 : (m.matchResult === "DRAW" ? 0.5 : 0);
        const expectedH = 1 / (1 + Math.pow(10, (aElo - hElo) / 400));
        teamElo.set(m.homeTeamId, hElo + 32 * (actualH - expectedH));
        teamElo.set(m.awayTeamId, aElo + 32 * ((1 - actualH) - (1 - expectedH)));
        const s = m.footballStats;
        hHist.push({ date: m.date, xg: s.homeXG, xga: s.awayXG, goals: m.homeScore || 0, goalsConceded: m.awayScore || 0, poss: s.homePoss, sot: s.homeSot });
        aHist.push({ date: m.date, xg: s.awayXG, xga: s.homeXG, goals: m.awayScore || 0, goalsConceded: m.homeScore || 0, poss: s.awayPoss, sot: s.awaySot });
        if (hHist.length > 10) hHist.shift();
        if (aHist.length > 10) aHist.shift();
        teamHistory.set(m.homeTeamId, hHist);
        teamHistory.set(m.awayTeamId, aHist);
    });

    const N = features.length;
    const split1 = Math.floor(N * 0.7);
    const split2 = Math.floor(N * 0.85);

    const X = new Matrix(N, 8);
    features.forEach((f, i) => f.x.forEach((v: number, j: number) => X.set(i, j, v)));

    // Norm
    for (let j = 0; j < 8; j++) {
        const col = X.getColumn(j);
        const mean = col.reduce((a, b) => a + b, 0) / N;
        const std = Math.sqrt(col.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / N) || 1;
        for (let i = 0; i < N; i++) X.set(i, j, (X.get(i, j) - mean) / std);
    }

    const trainX = X.subMatrix(0, split1 - 1, 0, 7);
    const trainYH = new Matrix(split1, 1);
    const trainYA = new Matrix(split1, 1);
    for (let i = 0; i < split1; i++) {
        trainYH.set(i, 0, features[i].yH);
        trainYA.set(i, 0, features[i].yA);
    }

    const model = new SkellamGoalModel(8, 32);
    model.train(trainX, trainYH, trainYA, 0.05, 2000);

    // --- PHASE 1: λ SANITY ANCHOR ---
    const { lambdaH, lambdaA } = model.forward(X);
    let predGoalsSum = 0;
    for (let i = 0; i < N; i++) predGoalsSum += lambdaH.get(i, 0) + lambdaA.get(i, 0);
    const actualAvg = actualGoalsSum / N;
    const predAvg = predGoalsSum / N;
    const drift = Math.abs(predAvg - actualAvg) / actualAvg;
    console.log(`[Anchor] Actual Avg Goals: ${actualAvg.toFixed(2)}, Predicted: ${predAvg.toFixed(2)}, Drift: ${(drift * 100).toFixed(2)}%`);

    // --- PHASE 2: ISOTONIC CALIBRATION ---
    const calX = X.subMatrix(split1, split2 - 1, 0, 7);
    const rawCalProbs = model.predictProbs(calX);
    const isoWin = new IsotonicCalibrator();
    const isoDraw = new IsotonicCalibrator();

    const calWinLabels = features.slice(split1, split2).map(f => f.result === "HOME_WIN" ? 1 : 0);
    const calDrawLabels = features.slice(split1, split2).map(f => f.result === "DRAW" ? 1 : 0);

    isoWin.fit(rawCalProbs.getColumn(0), calWinLabels);
    isoDraw.fit(rawCalProbs.getColumn(1), calDrawLabels);

    // --- PHASE 3: FINAL VALIDATION ---
    const testX = X.subMatrix(split2, N - 1, 0, 7);
    const testSamples = features.slice(split2);
    const rawTestProbs = model.predictProbs(testX);

    let logLoss = 0;
    let correct = 0;
    const testPWin: number[] = [];
    const testLWin: number[] = [];

    for (let i = 0; i < testX.rows; i++) {
        let pw = isoWin.transform(rawTestProbs.get(i, 0));
        let pd = isoDraw.transform(rawTestProbs.get(i, 1));
        let pa_raw = rawTestProbs.get(i, 2);

        // Norm
        const sum = pw + pd + pa_raw;
        pw /= sum; pd /= sum;
        const pa = 1 - pw - pd;

        const row = [pw, pd, pa];
        const res = testSamples[i].result;
        const labelIdx = res === "HOME_WIN" ? 0 : (res === "DRAW" ? 1 : 2);

        logLoss -= Math.log(Math.max(row[labelIdx], 1e-15));
        if (row.indexOf(Math.max(...row)) === labelIdx) correct++;

        testPWin.push(pw);
        testLWin.push(labelIdx === 0 ? 1 : 0);
    }

    console.log("\n--- CALIBRATION REPORT (HOME WIN) ---");
    console.table(bucketAnalysis(testPWin, testLWin));

    console.log("\n--- V7.2 FINAL CERTIFICATION ---");
    console.log(`LogLoss: ${(logLoss / testX.rows).toFixed(4)}`);
    console.log(`Accuracy: ${(correct / testX.rows * 100).toFixed(2)}%`);

    // --- BASELINE B: NON-NEURAL POISSON (Historical Averages) ---
    let bLoss = 0;
    testSamples.forEach(s => {
        const la = actualAvg / 2; // Simple historical avg
        // P(Draw) approx via simple poisson...
        // For baseline, use 3-way random or historical priors
        const pArr = [0.45, 0.25, 0.30]; // EPL historical avg
        const labelIdx = s.result === "HOME_WIN" ? 0 : (s.result === "DRAW" ? 1 : 2);
        bLoss -= Math.log(pArr[labelIdx]);
    });
    console.log(`Baseline B (Historical): ${(bLoss / testX.rows).toFixed(4)}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
