import { prisma } from "../prisma";

/**
 * Computes scientifically strict NBA features for FINAL HARDENING.
 * 1. World: NetRating, TS%, Pace (Rolling 5)
 * 2. Physio: Rest Days, B2B
 * 3. Psycho: DROPPED
 */
export async function computeNBAFeaturesHardened(matchId: string) {
    const match = await (prisma as any).match.findUnique({
        where: { id: matchId },
        include: { nbaStats: true }
    });

    if (!match) throw new Error(`Match ${matchId} not found.`);

    // 1. Get Rolling Stats (Real Data Only)
    const hStats = await getTeamScientificStats(match.homeTeamId, match.date);
    const aStats = await getTeamScientificStats(match.awayTeamId, match.date);

    // 2. Final Output Dimensions (Aggregated post-training or individually for training)
    // For now, we store them individually in dedicated slots for the GD trainer.
    return (prisma as any).matchFeatures.upsert({
        where: { matchId_sport_featureVersion: { matchId, sport: "basketball", featureVersion: "NBA_V3.3" } },
        update: {
            worldDiff: hStats.netRating - aStats.netRating,
            homeWorld: hStats.tsPct - aStats.tsPct, // tsDiff
            awayWorld: hStats.pace - aStats.pace,   // paceDiff
            physioDiff: hStats.restDays - aStats.restDays,
            homePhysio: hStats.isB2B - aStats.isB2B, // b2bDiff
            psychoDiff: 0, // DROPPED
            featureVersion: "NBA_V3.3"
        },
        create: {
            matchId,
            sport: "basketball",
            featureVersion: "NBA_V3.3",
            worldDiff: hStats.netRating - aStats.netRating,
            homeWorld: hStats.tsPct - aStats.tsPct,
            awayWorld: hStats.pace - aStats.pace,
            physioDiff: hStats.restDays - aStats.restDays,
            homePhysio: hStats.isB2B - aStats.isB2B,
            psychoDiff: 0,
            featureTime: new Date()
        }
    });
}

async function getTeamScientificStats(teamId: string, beforeDate: Date) {
    const history = await (prisma as any).match.findMany({
        where: {
            OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
            date: { lt: beforeDate },
            status: "finished"
        },
        orderBy: { date: "desc" },
        take: 5,
        include: { nbaStats: true }
    });

    if (history.length === 0) {
        return { netRating: 0, tsPct: 0.5, pace: 100, restDays: 3, isB2B: 0 };
    }

    let totalPts = 0, totalOppPts = 0, totalPoss = 0, totalTSNum = 0, totalTSDenom = 0;

    for (const m of history) {
        const s = m.nbaStats;
        if (!s) continue;

        const isHome = m.homeTeamId === teamId;
        const pts = isHome ? m.homeScore : m.awayScore;
        const oppPts = isHome ? m.awayScore : m.homeScore;
        const fga = isHome ? s.homeFga : s.awayFga;
        const fta = isHome ? s.homeFta : s.awayFta;
        const tov = isHome ? s.homeTov : s.awayTov;
        const oreb = isHome ? s.homeOreb : s.awayOreb;

        const pos = fga + 0.44 * fta + tov - oreb;
        totalPts += pts;
        totalOppPts += oppPts;
        totalPoss += pos;
        totalTSNum += pts;
        totalTSDenom += 2 * (fga + 0.44 * fta);
    }

    const netRating = totalPoss > 0 ? (totalPts - totalOppPts) / totalPoss * 100 : 0;
    const tsPct = totalTSDenom > 0 ? totalTSNum / totalTSDenom : 0.5;
    const pace = totalPoss / ((history.length * 48) / 48) * 100; // Simplified pace proxy

    const lastDate = new Date(history[0].date);
    const restDays = Math.min(10, Math.floor((beforeDate.getTime() - lastDate.getTime()) / (1000 * 3600 * 24)));
    const isB2B = restDays === 1 ? 1 : 0;

    return { netRating, tsPct, pace, restDays, isB2B };
}
