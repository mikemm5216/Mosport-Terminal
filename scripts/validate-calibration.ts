import { prisma } from "../lib/prisma";
import fs from "fs";
import { sigmoid, plattScale, bucketAnalysis } from "../lib/ml/calibration";

/**
 * NBA CALIBRATION VALIDATION SUITE (PHASE 3.4)
 */

async function main() {
    console.log("[Validate] --- NBA CALIBRATION CURVE (2023-24) ---");

    if (!fs.existsSync("model_nba.json")) {
        console.error("[Validate] Error: model_nba.json not found.");
        return;
    }

    const model = JSON.parse(fs.readFileSync("model_nba.json", "utf-8"));
    const { weights, bias, calibration, normalization } = model;
    const { A, B: plattB } = calibration;
    const { means, stds } = normalization;

    const matches = await (prisma as any).match.findMany({
        where: {
            sport: "basketball",
            status: "finished",
            date: { gte: new Date("2023-10-01") },
            extId: { startsWith: "nba-real-" },
            features: { some: { featureVersion: "NBA_V3.2" } }
        },
        include: { features: { where: { featureVersion: "NBA_V3.2" } } },
        orderBy: { date: "asc" }
    });

    if (matches.length === 0) { return; }

    const winWorldDiff: number[] = [];
    const lossWorldDiff: number[] = [];

    const samples = matches.map(m => {
        const f = m.features[0];
        const xRaw = [f.worldDiff || 0, f.homeWorld || 0, f.awayWorld || 0, f.physioDiff || 0, f.homePhysio || 0, f.awayPhysio || 0, f.psychoDiff || 0, f.homePsycho || 0];

        if (m.matchResult === "HOME_WIN") winWorldDiff.push(f.worldDiff || 0);
        else lossWorldDiff.push(f.worldDiff || 0);

        const xNorm = xRaw.map((v, i) => (v - means[i]) / stds[i]);
        const z = bias + xNorm.reduce((acc, v, i) => acc + v * weights[i], 0);
        // Standard Platt Scaling uses raw logits (z)
        const pCal = plattScale(z, A, plattB);

        return { prob: pCal, actual: m.matchResult === "HOME_WIN" ? 1 : 0 };
    });

    console.log(`[Diag] Avg winWorldDiff: ${(winWorldDiff.reduce((a, b) => a + b, 0) / winWorldDiff.length).toFixed(4)}`);
    console.log(`[Diag] Avg lossWorldDiff: ${(lossWorldDiff.reduce((a, b) => a + b, 0) / lossWorldDiff.length).toFixed(4)}`);

    const probs = samples.map(s => s.prob);
    const labels = samples.map(s => s.actual);
    const results = bucketAnalysis(probs, labels);

    console.log("\nBucket      | Count | Pred   | Actual | Gap");
    console.log("------------|-------|--------|--------|------");
    results.forEach(r => {
        if (parseInt(r.count) > 0) {
            console.log(`${r.bucket.padEnd(11)} | ${r.count.toString().padEnd(5)} | ${r.avgPred} | ${r.winRate} | ${r.gap}`);
        }
    });

    const meanGap = results.reduce((acc, r) => acc + (parseInt(r.count) > 0 ? Math.abs(parseFloat(r.gap)) : 0), 0) / results.filter(r => parseInt(r.count) > 0).length;
    console.log(`\nMean Absolute Calibration Gap: ${(meanGap * 100).toFixed(2)}%`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
