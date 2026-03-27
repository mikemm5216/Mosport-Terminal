import { prisma } from "../lib/prisma";
import { computeBaseballFeatures, BaseballStats } from "../lib/features/baseball_features";

/**
 * BASEBALL PRODUCTION ENGINE (V4.3)
 * Sabermetrics + Confirmed Starters Only
 */

const teamHistory = new Map<string, BaseballStats[]>();
const WINDOW = 10;

async function main() {
    console.log("[Engine] Starting Baseball Feature Pipeline...");
    const startTime = Date.now();

    await (prisma as any).matchFeatures.deleteMany({ where: { sport: "baseball", featureVersion: "BB_V1.0" } });

    let cursor: string | undefined = undefined;
    let totalProcessed = 0;
    const batchSize = 1000;

    while (true) {
        const matches = await (prisma as any).match.findMany({
            where: { sport: "baseball", status: "finished", baseballStats: { isNot: null } },
            include: { baseballStats: true, league: true },
            orderBy: [{ date: "asc" }, { id: "asc" }],
            take: batchSize,
            ...(cursor ? { skip: 1, cursor: { id: cursor } } : {})
        });

        if (matches.length === 0) break;

        const featureRecords: any[] = [];

        for (const m of matches) {
            const s = m.baseballStats;

            // RULE: Automatically drop matches with unconfirmed starting pitchers
            if (!s.homeStarterId || !s.awayStarterId) continue;

            const hHist = teamHistory.get(m.homeTeamId) || [];
            const aHist = teamHistory.get(m.awayTeamId) || [];

            const f = computeBaseballFeatures(hHist, aHist);

            featureRecords.push({
                matchId: m.id,
                sport: "baseball",
                featureVersion: "BB_V1.0",
                worldDiff: f.worldDiff,
                homeWorld: f.homeWorld,
                awayWorld: f.awayWorld,
                physioDiff: f.physioDiff,
                homePhysio: f.homePhysio,
                awayPhysio: f.awayPhysio,
                psychoDiff: s.homeXFIP - s.awayXFIP, // Current Starter Diff (Direct Signal)
                homePsycho: s.homeWRC,
                awayPsycho: s.awayWRC
            });

            // Update History
            hHist.push({ date: m.date, xFIP: s.homeXFIP, wRC: s.homeWRC, bullpenxFIP: 4.0 + Math.random() });
            aHist.push({ date: m.date, xFIP: s.awayXFIP, wRC: s.awayWRC, bullpenxFIP: 4.0 + Math.random() });

            if (hHist.length > WINDOW) hHist.shift();
            if (aHist.length > WINDOW) aHist.shift();

            teamHistory.set(m.homeTeamId, hHist);
            teamHistory.set(m.awayTeamId, aHist);
            cursor = m.id;
        }

        for (let i = 0; i < featureRecords.length; i += 500) {
            const chunk = featureRecords.slice(i, i + 500);
            // @ts-ignore
            await prisma.matchFeatures.createMany({ data: chunk, skipDuplicates: true });
        }

        totalProcessed += matches.length;
        console.log(`[Engine] Processed ${totalProcessed} baseball matches...`);
        if (matches.length < batchSize) break;
    }

    const duration = (Date.now() - startTime) / 1000;
    console.log(`[Engine] SUCCESS: Processed ${totalProcessed} matches in ${duration.toFixed(2)}s`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
