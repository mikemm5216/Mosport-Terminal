import { prisma } from "../lib/prisma";

/**
 * GLOBAL BASKETBALL FEATURE ENGINE (V4.2)
 * League-Aware Isolation: NBA vs FIBA
 */

interface BbStats {
    date: Date;
    offRating: number;
    defRating: number;
    pace: number;
}

const teamHistory = new Map<string, BbStats[]>();
const leagueBaselines = new Map<string, { offMean: number, offStd: number, paceMean: number, paceStd: number }>();

const WINDOW = 5;

// Strict Exclusion List
const BANNED_LEAGUES = ["CBA"];

async function main() {
    console.log("[Engine] Starting Global Basketball Feature Pipeline...");
    const startTime = Date.now();

    await (prisma as any).matchFeatures.deleteMany({
        where: { sport: "basketball", featureVersion: "NBA_V4.0" }
    });

    // 1. Pre-calculate League Baselines (Simplified for Demo - in production use historical averages)
    leagueBaselines.set("NBA", { offMean: 115, offStd: 8, paceMean: 100, paceStd: 5 });
    leagueBaselines.set("FIBA", { offMean: 105, offStd: 10, paceMean: 85, paceStd: 6 });

    let cursor: string | undefined = undefined;
    let totalProcessed = 0;
    const batchSize = 1000;

    while (true) {
        const matches = await (prisma as any).match.findMany({
            where: {
                sport: "basketball",
                status: "finished",
                nbaStats: { isNot: null },
                NOT: { leagueId: { in: BANNED_LEAGUES } }
            },
            include: { nbaStats: true, league: true },
            orderBy: [{ date: "asc" }, { id: "asc" }],
            take: batchSize,
            ...(cursor ? { skip: 1, cursor: { id: cursor } } : {})
        });

        if (matches.length === 0) break;

        const featureRecords: any[] = [];

        for (const m of matches) {
            const leagueId = m.leagueId || "NBA";
            const baseline = leagueBaselines.get(leagueId) || leagueBaselines.get("NBA")!;

            const hHist = teamHistory.get(m.homeTeamId) || [];
            const aHist = teamHistory.get(m.awayTeamId) || [];

            // Calculate Rolling Averages
            const hRoll = hHist.slice(-WINDOW);
            const aRoll = aHist.slice(-WINDOW);

            const hOffRaw = hRoll.length > 0 ? hRoll.reduce((a, b) => a + b.offRating, 0) / hRoll.length : baseline.offMean;
            const aOffRaw = aRoll.length > 0 ? aRoll.reduce((a, b) => a + b.offRating, 0) / aRoll.length : baseline.offMean;

            // ISOLATED Z-SCORES (PARTITION BY leagueId)
            const hZ = (hOffRaw - baseline.offMean) / baseline.offStd;
            const aZ = (aOffRaw - baseline.offMean) / baseline.offStd;

            featureRecords.push({
                matchId: m.id,
                sport: "basketball",
                featureVersion: "NBA_V4.0",
                worldDiff: hZ - aZ,
                homeWorld: hZ,
                awayWorld: aZ,
                physioDiff: 0, // Simplified
                homePhysio: 0,
                awayPhysio: 0,
                psychoDiff: 0,
                homePsycho: 0,
                awayPsycho: 0
            });

            // Update History
            const s = m.nbaStats;
            const hPoss = s.homeFga + 0.44 * s.homeFta - s.homeOreb + s.homeTov;
            const aPoss = s.awayFga + 0.44 * s.awayFta - s.awayOreb + s.awayTov;

            const hOff = hPoss > 0 ? (m.homeScore / hPoss) * 100 : baseline.offMean;
            const aOff = aPoss > 0 ? (m.awayScore / aPoss) * 100 : baseline.offMean;

            hHist.push({ date: m.date, offRating: hOff, defRating: aOff, pace: hPoss });
            aHist.push({ date: m.date, offRating: aOff, defRating: hOff, pace: aPoss });

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
        console.log(`[Engine] Processed ${totalProcessed} basketball matches...`);
        if (matches.length < batchSize) break;
    }

    const duration = (Date.now() - startTime) / 1000;
    console.log(`[Engine] SUCCESS: Processed ${totalProcessed} matches in ${duration.toFixed(2)}s`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
