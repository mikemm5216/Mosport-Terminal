import { prisma } from "../lib/prisma";
import fs from "fs";
import { RandomForestClassifier } from "ml-random-forest";
import { trainPlatt, brierScore, logLoss, plattScale } from "../lib/ml/calibration";

/**
 * NBA TREE-BASED TRAINING ENGINE (RANDOM FOREST)
 * Phase 3.3 Alternative Trainer
 */

async function main() {
    console.log("[Train-Tree] --- NBA RANDOM FOREST (V1.0) ---");
    const start = Date.now();

    // 1. Fetch Data
    const matches = await (prisma as any).match.findMany({
        where: { sport: "basketball", status: "finished", features: { some: { featureVersion: "NBA_V3.2" } } },
        include: { features: { where: { featureVersion: "NBA_V3.2" } } },
        orderBy: { date: "asc" }
    });

    const dataset = matches.map(m => {
        const f = m.features[0];
        return {
            date: m.date,
            x: [f.worldDiff || 0, f.homeWorld || 0, f.awayWorld || 0, f.physioDiff || 0, f.homePhysio || 0, f.awayPhysio || 0, f.psychoDiff || 0, f.homePsycho || 0],
            y: m.matchResult === "HOME_WIN" ? 1 : 0
        };
    });

    // 2. Split (70/15/15)
    // No normalization needed for trees, but let's keep the split robust
    const trainEnd = Math.floor(dataset.length * 0.7);
    const calEnd = Math.floor(dataset.length * 0.85);

    const trainSet = dataset.slice(0, trainEnd);
    const calSet = dataset.slice(trainEnd, calEnd);
    const testSet = dataset.slice(calEnd);

    console.log(`[Train-Tree] Split: Train=${trainSet.length}, Cal=${calSet.length}, Test=${testSet.length}`);

    // 3. Train Random Forest
    const options = {
        seed: 42,
        maxFeatures: 3,
        replacement: true,
        nEstimators: 100,
        treeOptions: {
            maxDepth: 10
        }
    };
    const classifier = new RandomForestClassifier(options);
    classifier.train(trainSet.map(d => d.x), trainSet.map(d => d.y));

    // 4. Calibration (Platt)
    const calProbs = classifier.predictProbability(calSet.map(d => d.x), 1);
    const { A, B } = trainPlatt(calProbs, calSet.map(d => d.y));

    // 5. Evaluation
    const evalSet = (set: any[]) => {
        if (set.length === 0) return { logLoss: 0, brier: 0, acc: 0 };
        const rawProbs = classifier.predictProbability(set.map(d => d.x), 1);
        const probs = rawProbs.map(p => plattScale(p, A, B));
        const labels = set.map(d => d.y);
        return { logLoss: logLoss(probs, labels), brier: brierScore(probs, labels), acc: probs.filter((p, i) => (p >= 0.5) === (labels[i] === 1)).length / set.length };
    };

    const resTrain = evalSet(trainSet);
    const resCal = evalSet(calSet);
    const resTest = evalSet(testSet);

    console.log("\n--- TREE MODEL RESULTS ---");
    console.log(`[Train] LogLoss: ${resTrain.logLoss.toFixed(4)}, Acc: ${(resTrain.acc * 100).toFixed(2)}%`);
    console.log(`[Cal]   LogLoss: ${resCal.logLoss.toFixed(4)}, Acc: ${(resCal.acc * 100).toFixed(2)}%`);
    console.log(`[Test]  LogLoss: ${resTest.logLoss.toFixed(4)}, Acc: ${(resTest.acc * 100).toFixed(2)}%`);

    // 6. Save Tree? (Binary format or JSON)
    // ml-random-forest can be exported to JSON
    fs.writeFileSync("model_nba_tree.json", JSON.stringify({
        version: "TREE-V1.0",
        classifier: classifier.toJSON(),
        calibration: { A, B },
        trainedAt: new Date().toISOString()
    }));

    console.log(`[Train-Tree] Completed in ${((Date.now() - start) / 1000).toFixed(2)}s`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
