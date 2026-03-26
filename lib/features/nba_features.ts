import { prisma } from "../prisma";

export interface NBAFeaturesV33 {
    // World Engine
    netRatingDiff: number;
    tsDiff: number;
    paceDiff: number;

    // Physio Engine
    restDaysDiff: number;
    isB2BDiff: number;
    rotationLoadDiff: number;

    // Lineup
    starterConsistency: number; // 0 or 1
}

/**
 * Computes hardened NBA features for V3.3 Scientific Mode.
 */
export async function computeNBAFeaturesV33(matchId: string) {
    const match = await (prisma as any).match.findUnique({
        where: { id: matchId },
        include: {
            nbaStats: true,
            home_team: { include: { matches_home: { take: 6, orderBy: { date: 'desc' } }, matches_away: { take: 6, orderBy: { date: 'desc' } } } },
            away_team: { include: { matches_home: { take: 6, orderBy: { date: 'desc' } }, matches_away: { take: 6, orderBy: { date: 'desc' } } } }
        }
    });

    if (!match) throw new Error(`Match ${matchId} not found.`);

    const hStats = await getTeamRollingStats(match.homeTeamId, match.date);
    const aStats = await getTeamRollingStats(match.awayTeamId, match.date);

    const world = {
        netRatingDiff: hStats.netRating - aStats.netRating,
        tsDiff: hStats.tsPct - aStats.tsPct,
        paceDiff: hStats.pace - aStats.pace
    };

    const physio = {
        restDaysDiff: hStats.restDays - aStats.restDays,
        isB2BDiff: hStats.isB2B - aStats.isB2B,
        rotationLoadDiff: hStats.rotationLoad - aStats.rotationLoad
    };

    const starterConsistency = hStats.starterConsistency; // Simple home-side proxy or diff

    // Save for training
    return (prisma as any).matchFeatures.upsert({
        where: { matchId_sport_featureVersion: { matchId, sport: "basketball", featureVersion: "NBA_V3.3" } },
        update: {
            worldDiff: world.netRatingDiff,
            physioDiff: physio.restDaysDiff,
            psychoDiff: starterConsistency,
            // We store the full vector for the training script to find
            homeWorld: world.tsDiff, // re-purposing for more slots
            awayWorld: world.paceDiff,
            homePhysio: physio.isB2BDiff,
            awayPhysio: physio.rotationLoadDiff
        },
        create: {
            matchId,
            sport: "basketball",
            featureVersion: "NBA_V3.3",
            worldDiff: world.netRatingDiff,
            physioDiff: physio.restDaysDiff,
            psychoDiff: starterConsistency,
            homeWorld: world.tsDiff,
            awayWorld: world.paceDiff,
            homePhysio: physio.isB2BDiff,
            awayPhysio: physio.rotationLoadDiff
        }
    });
}

async function getTeamRollingStats(teamId: string, beforeDate: Date) {
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
        return { netRating: 0, tsPct: 0.5, pace: 100, restDays: 3, isB2B: 0, rotationLoad: 0.5, starterConsistency: 0 };
    }

    let totalPoints = 0;
    let totalOppPoints = 0;
    let totalPossessions = 0;
    let totalTSNumer = 0;
    let totalTSDenom = 0;

    for (const m of history) {
        const stats = m.nbaStats;
        if (!stats) continue;

        const isHome = m.homeTeamId === teamId;
        const pts = isHome ? m.homeScore : m.awayScore;
        const oppPts = isHome ? m.awayScore : m.homeScore;
        const fga = isHome ? stats.homeFga : stats.awayFga;
        const fta = isHome ? stats.homeFta : stats.awayFta;
        const tov = isHome ? stats.homeTov : stats.awayTov;
        const oreb = isHome ? stats.homeOreb : stats.awayOreb;

        const pos = fga + 0.44 * fta + tov - oreb;
        totalPoints += pts;
        totalOppPoints += oppPts;
        totalPossessions += pos;
        totalTSNumer += pts;
        totalTSDenom += 2 * (fga + 0.44 * fta);
    }

    const netRating = totalPossessions > 0 ? (totalPoints - totalOppPoints) / totalPossessions * 100 : 0;
    const tsPct = totalTSDenom > 0 ? totalTSNumer / totalTSDenom : 0.5;
    const pace = totalPossessions / (history.length * 48 / 48) * 100; // Simplified

    const lastGame = history[0];
    const diffDays = (beforeDate.getTime() - new Date(lastGame.date).getTime()) / (1000 * 3600 * 24);
    const restDays = Math.min(10, Math.floor(diffDays));
    const isB2B = restDays === 1 ? 1 : 0;
    const rotationLoad = 0.5; // Fixed for now

    // Starter Consistency Proxy
    let starterConsistency = 0;
    if (history.length >= 2) {
        const currentRoster = history[0].homeTeamId === teamId ? history[0].nbaStats?.homePlayerIds : history[0].nbaStats?.awayPlayerIds;
        const prevRoster = history[1].homeTeamId === teamId ? history[1].nbaStats?.homePlayerIds : history[1].nbaStats?.awayPlayerIds;
        if (currentRoster && prevRoster) {
            const currentStarters = currentRoster.slice(0, 5).sort().join(",");
            const prevStarters = prevRoster.slice(0, 5).sort().join(",");
            starterConsistency = currentStarters === prevStarters ? 1 : 0;
        }
    }

    return { netRating, tsPct, pace, restDays, isB2B, rotationLoad, starterConsistency };
}
