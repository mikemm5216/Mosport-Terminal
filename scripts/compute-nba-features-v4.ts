import { prisma } from "../lib/prisma";

/**
 * PRODUCTION-GRADE DATA ENGINE (V4.0)
 * Stateful in-memory rolling feature computation.
 * Target: 3690 matches in < 15 seconds.
 */

interface TeamStats {
    date: Date;
    offRating: number;
    defRating: number;
    trb: number;
    ast: number;
    tovRate: number;
    ts: number;
}

const teamHistory = new Map<string, TeamStats[]>();
const WINDOW = 5;

function getRolling(history: TeamStats[]) {
    if (history.length === 0) return { off: 110, def: 110, trb: 50, ast: 25, tov: 13, ts: 0.55 };
    const slice = history.slice(-WINDOW);
    const count = slice.length;
    return {
        off: slice.reduce((a, b) => a + b.offRating, 0) / count,
        def: slice.reduce((a, b) => a + b.defRating, 0) / count,
        trb: slice.reduce((a, b) => a + b.trb, 0) / count,
        ast: slice.reduce((a, b) => a + b.ast, 0) / count,
        tov: slice.reduce((a, b) => a + b.tovRate, 0) / count,
        ts: slice.reduce((a, b) => a + b.ts, 0) / count,
        offStd: Math.sqrt(slice.reduce((a, b) => a + Math.pow(b.offRating - 110, 2), 0) / count) // Simple std proxy
    };
}

async function main() {
    console.log("[Engine] Starting Production Feature Pipeline...");
    const startTime = Date.now();

    // 1. Purge old features
    await (prisma as any).matchFeatures.deleteMany({ where: { featureVersion: "NBA_V3.2" } });

    let cursor: string | undefined = undefined;
    let totalProcessed = 0;
    const batchSize = 1000;

    while (true) {
        // 2. Fetch Batch
        const matches = await (prisma as any).match.findMany({
            where: { sport: "basketball", status: "finished", nbaStats: { isNot: null }, extId: { startsWith: "nba-real-" } },
            include: { nbaStats: true },
            orderBy: [{ date: "asc" }, { id: "asc" }],
            take: batchSize,
            ...(cursor ? { skip: 1, cursor: { id: cursor } } : {})
        });

        if (matches.length === 0) break;

        const featureRecords: any[] = [];

        // 3. In-Memory Computation
        for (const m of matches) {
            const hHist = teamHistory.get(m.homeTeamId) || [];
            const aHist = teamHistory.get(m.awayTeamId) || [];

            const hRoll = getRolling(hHist);
            const aRoll = getRolling(aHist);

            // Rest Metrics
            const hRest = hHist.length > 0 ? Math.floor((m.date.getTime() - hHist[hHist.length - 1].date.getTime()) / (1000 * 60 * 60 * 24)) : 3;
            const aRest = aHist.length > 0 ? Math.floor((m.date.getTime() - aHist[aHist.length - 1].date.getTime()) / (1000 * 60 * 60 * 24)) : 3;

            featureRecords.push({
                matchId: m.id,
                sport: "basketball",
                featureVersion: "NBA_V3.2",
                worldDiff: hRoll.off - aRoll.off,
                homeWorld: hRoll.def - aRoll.def,
                awayWorld: hRoll.tov - aRoll.tov,
                physioDiff: hRest - aRest,
                homePhysio: hRoll.trb - aRoll.trb,
                awayPhysio: hRoll.ast - aRoll.ast,
                psychoDiff: hRoll.offStd - aRoll.offStd,
                homePsycho: hRoll.ts - aRoll.ts
            });

            // 4. Update History (Stateful)
            const s = m.nbaStats;
            const hPoss = s.homeFga + 0.44 * s.homeFta - s.homeOreb + s.homeTov;
            const aPoss = s.awayFga + 0.44 * s.awayFta - s.awayOreb + s.awayTov;

            const hOff = hPoss > 0 ? (m.homeScore / hPoss) * 100 : 110;
            const aOff = aPoss > 0 ? (m.awayScore / aPoss) * 100 : 110;

            const trbTotal = s.homeReb + s.awayReb;
            const astTotal = s.homeAst + s.awayAst;

            hHist.push({
                date: m.date, offRating: hOff, defRating: aOff,
                trb: trbTotal > 0 ? (s.homeReb / trbTotal) * 100 : 50,
                ast: astTotal > 0 ? (s.homeAst / astTotal) * 100 : 50,
                tovRate: hPoss > 0 ? (s.homeTov / hPoss) * 100 : 13,
                ts: (s.homeFga + 0.44 * s.homeFta) > 0 ? m.homeScore / (2 * (s.homeFga + 0.44 * s.homeFta)) : 0.55
            });
            aHist.push({
                date: m.date, offRating: aOff, defRating: hOff,
                trb: trbTotal > 0 ? (s.awayReb / trbTotal) * 100 : 50,
                ast: astTotal > 0 ? (s.awayAst / astTotal) * 100 : 50,
                tovRate: aPoss > 0 ? (s.awayTov / aPoss) * 100 : 13,
                ts: (s.awayFga + 0.44 * s.awayFta) > 0 ? m.awayScore / (2 * (s.awayFga + 0.44 * s.awayFta)) : 0.55
            });

            if (hHist.length > WINDOW) hHist.shift();
            if (aHist.length > WINDOW) aHist.shift();

            teamHistory.set(m.homeTeamId, hHist);
            teamHistory.set(m.awayTeamId, aHist);
            cursor = m.id;
        }

        // 5. Bulk Persistence (Chunked 500)
        for (let i = 0; i < featureRecords.length; i += 500) {
            const chunk = featureRecords.slice(i, i + 500);
            // @ts-ignore
            await prisma.matchFeatures.createMany({ data: chunk, skipDuplicates: true });
        }

        totalProcessed += matches.length;
        console.log(`[Engine] Processed ${totalProcessed} matches...`);
        if (matches.length < batchSize) break;
    }

    const duration = (Date.now() - startTime) / 1000;
    console.log(`\n[Engine] SUCCESS: Processed ${totalProcessed} matches in ${duration.toFixed(2)}s`);

    // 6. Final Validation
    const featureCount = await (prisma as any).matchFeatures.count({ where: { featureVersion: "NBA_V3.2" } });
    console.log(`[Engine] Validation: ${featureCount} features in database.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
