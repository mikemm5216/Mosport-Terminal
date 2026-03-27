import { prisma } from "../lib/prisma";
import { Matrix } from "ml-matrix";
import { computeFootballFeaturesV6, FootballStatsV2 } from "../lib/features/football_features_v2";
import { SkellamGoalModel } from "../lib/ml/skellam_kernel";

async function main() {
    console.log("[Train] Starting Football V7.1 (Skellam Kernel) Training...");
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
        const hElo = teamElo.get(m.homeTeamId) || 1500;
        const aElo = teamElo.get(m.awayTeamId) || 1500;
        const hHist = teamHistory.get(m.homeTeamId) || [];
        const aHist = teamHistory.get(m.awayTeamId) || [];

        const f = computeFootballFeaturesV6(hHist, aHist, m.date, hElo, aElo);

        // 8 Features (with cross terms)
        const xRaw = [f.eloRating_diff, 1.0, f.fixtureCongestion_score, f.attack_form_xG, f.net_xg_diff];
        const xExp = [...xRaw, xRaw[0] * xRaw[0], xRaw[4] * xRaw[4], xRaw[0] * xRaw[4]];

        features.push({
            x: xExp,
            yH: m.homeScore || 0,
            yA: m.awayScore || 0,
            result: m.matchResult,
            date: m.date
        });

        // Elo Update
        const actualH = m.matchResult === "HOME_WIN" ? 1 : (m.matchResult === "DRAW" ? 0.5 : 0);
        const expectedH = 1 / (1 + Math.pow(10, (aElo - hElo) / 400));
        teamElo.set(m.homeTeamId, hElo + 32 * (actualH - expectedH));
        teamElo.set(m.awayTeamId, aElo + 32 * ((1 - actualH) - (1 - expectedH)));

        // History Update
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
    const YH = new Matrix(features.length, 1);
    const YA = new Matrix(features.length, 1);

    features.forEach((f, i) => {
        f.x.forEach((v: number, j: number) => X.set(i, j, v));
        YH.set(i, 0, f.yH);
        YA.set(i, 0, f.yA);
    });

    // Z-Score Norm
    for (let j = 0; j < X.columns; j++) {
        const col = X.getColumn(j);
        const mean = col.reduce((a, b) => a + b, 0) / col.length;
        const std = Math.sqrt(col.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / col.length) || 1;
        for (let i = 0; i < X.rows; i++) X.set(i, j, (X.get(i, j) - mean) / std);
    }

    const trainX = X.subMatrix(0, split1 - 1, 0, 7);
    const trainYH = YH.subMatrix(0, split1 - 1, 0, 0);
    const trainYA = YA.subMatrix(0, split1 - 1, 0, 0);

    const model = new SkellamGoalModel(8, 32);
    model.train(trainX, trainYH, trainYA, 0.05, 1500);

    // --- TEST ---
    const testX = X.subMatrix(split2, N - 1, 0, 7);
    const testLabels = features.slice(split2).map(f => f.result === "HOME_WIN" ? 0 : (f.result === "DRAW" ? 1 : 2));

    const probs = model.predictProbs(testX);
    let correct = 0; let logLoss = 0; let brierSum = 0;

    for (let i = 0; i < testX.rows; i++) {
        const row = [probs.get(i, 0), probs.get(i, 1), probs.get(i, 2)];
        const predClass = row.indexOf(Math.max(...row));
        if (predClass === testLabels[i]) correct++;

        const p = Math.max(row[testLabels[i]], 1e-15);
        logLoss -= Math.log(p);

        let rb = 0;
        for (let k = 0; k < 3; k++) rb += Math.pow(row[k] - (k === testLabels[i] ? 1 : 0), 2);
        brierSum += rb;
    }

    console.log("\n--- FOOTBALL V7.1 (SKELLAM GENERATIVE) RESULTS ---");
    console.log(`Accuracy: ${(correct / testX.rows * 100).toFixed(2)}%`);
    console.log(`LogLoss: ${(logLoss / testX.rows).toFixed(4)}`);
    console.log(`Brier Score: ${(brierSum / testX.rows).toFixed(4)}`);
    console.log(`Total Samples: ${N}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
