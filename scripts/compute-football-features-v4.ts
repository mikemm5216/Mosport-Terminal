import { prisma } from "../lib/prisma";
import { computeFootballFeatures, FootballStats } from "../lib/features/football_features";

/**
 * FOOTBALL PRODUCTION ENGINE (V4.1)
 * Stateful in-memory rolling feature computation.
 */

const teamHistory = new Map<string, FootballStats[]>();
const WINDOW = 5;

async function main() {
    console.log("[Engine] Starting Football Feature Pipeline...");
    const startTime = Date.now();

    await (prisma as any).matchFeatures.deleteMany({ where: { sport: "football", featureVersion: "FB_V1.0" } });

    let cursor: string | undefined = undefined;
    let totalProcessed = 0;
    const batchSize = 1000;

    while (true) {
        const matches = await (prisma as any).match.findMany({
            where: { sport: "football", status: "finished", footballStats: { isNot: null } },
            include: { footballStats: true, league: true },
            orderBy: [{ date: "asc" }, { id: "asc" }],
            take: batchSize,
            ...(cursor ? { skip: 1, cursor: { id: cursor } } : {})
        });

        if (matches.length === 0) break;

        const featureRecords: any[] = [];

        for (const m of matches) {
            const hHist = teamHistory.get(m.homeTeamId) || [];
            const aHist = teamHistory.get(m.awayTeamId) || [];

            const f = computeFootballFeatures(hHist, aHist, m.date);

            featureRecords.push({
                matchId: m.id,
                sport: "football",
                featureVersion: "FB_V1.0",
                worldDiff: f.worldDiff,
                homeWorld: f.homeWorld,
                awayWorld: f.awayWorld,
                physioDiff: f.physioDiff,
                homePhysio: f.homePhysio,
                awayPhysio: f.awayPhysio,
                psychoDiff: m.league?.isKnockout ? 1 : 0, // Cup match flag
                homePsycho: f.homePsycho,
                awayPsycho: f.awayPsycho
            });

            // Update History
            const s = m.footballStats;
            hHist.push({ date: m.date, xg: s.homeXG, xga: s.awayXG, poss: s.homePoss, sot: s.homeSot });
            aHist.push({ date: m.date, xg: s.awayXG, xga: s.homeXG, poss: s.awayPoss, sot: s.awaySot });

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
        console.log(`[Engine] Processed ${totalProcessed} football matches...`);
        if (matches.length < batchSize) break;
    }

    const duration = (Date.now() - startTime) / 1000;
    console.log(`[Engine] SUCCESS: Processed ${totalProcessed} matches in ${duration.toFixed(2)}s`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
