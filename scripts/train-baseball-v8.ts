import { prisma } from "../lib/prisma";
import { computeBaseballAdvancedFeatures } from "../lib/features/baseball_advanced_features";
import { routeBaseballPrediction, BaseballLeagueType } from "../lib/ml/baseball-router";

async function main() {
    console.log("[Train] Starting Baseball V8.0 (Sabermetric) Suite...");

    const matches = await (prisma as any).match.findMany({
        where: { sport: "baseball", status: "finished" },
        include: { baseballStats: true, league: true },
        orderBy: { date: "asc" }
    });

    if (matches.length === 0) {
        console.log("No finished baseball matches found. Skipping training.");
        return;
    }

    let processedCount = 0;
    let skipCount = 0;
    let correct = 0;
    let logLoss = 0;

    for (const m of matches) {
        // --- RULE: CONFIRMATION FIREWALL ---
        if (!m.baseballStats || !m.baseballStats.startingPitcherConfirmed) {
            skipCount++;
            continue;
        }

        const features = await computeBaseballAdvancedFeatures(m.id);
        if (!features) {
            skipCount++;
            continue;
        }

        const leagueType = (m.league?.id === "MLB" ? "MLB" : "CPBL") as BaseballLeagueType;
        const out = routeBaseballPrediction(leagueType, features);

        const actual = m.matchResult === "HOME_WIN" ? 0 : (m.matchResult === "DRAW" ? 1 : (out.modelType === "binary" ? 1 : 2));

        const p = Math.max(out.probabilities[actual], 1e-15);
        logLoss -= Math.log(p);

        if (out.probabilities.indexOf(Math.max(...out.probabilities)) === actual) {
            correct++;
        }
        processedCount++;
    }

    console.log("\n--- BASEBALL V8.0 RESULTS ---");
    console.log(`Processed: ${processedCount}`);
    console.log(`Skipped: ${skipCount} (Unconfirmed Pitchers)`);
    console.log(`Accuracy: ${(correct / processedCount * 100).toFixed(2)}%`);
    console.log(`LogLoss: ${(logLoss / processedCount).toFixed(4)}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
