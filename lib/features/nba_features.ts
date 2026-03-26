import { prisma } from "../prisma";

export interface NBAFeaturesRaw {
    // World Engine
    netRating_5: number;
    pace_5: number;
    ts_5: number; // True Shooting %
    turnoverRate_5: number;

    // Physio Engine
    restDays: number;
    isB2B: number;
    rotationLoad: number;

    // Psycho Engine
    isPlayoffRace: number;
    isRevengeGame: number;
    isTanking: number;
}

/**
 * Calculates NBA-specific features for probability modeling.
 */
export async function computeNBAFeatures(matchId: string) {
    const match = await (prisma as any).match.findUnique({
        where: { id: matchId },
        include: {
            home_team: { include: { history: { take: 10, orderBy: { date: 'desc' } } } },
            away_team: { include: { history: { take: 10, orderBy: { date: 'desc' } } } }
        }
    });

    if (!match) throw new Error(`Match ${matchId} not found.`);

    // 1. World Engine (Rolling last 5)
    // NOTE: In production, these would be aggregated from Stats_NBA table.
    // Here we use simplified proxies for the demonstration.
    const hNet = calcNet(match.home_team.history.slice(0, 5));
    const aNet = calcNet(match.away_team.history.slice(0, 5));

    // 2. Physio Engine (Fatigue)
    // fatigueScore = 0.5 * exp(-0.8 * restDays) + 0.3 * isB2B + 0.2 * rotationLoad
    const hPhysio = calcPhysio(match.home_team.history, match.date);
    const aPhysio = calcPhysio(match.away_team.history, match.date);

    // 3. Psycho Engine (Motivation)
    const hPsycho = calcPsycho(match.home_team.history);
    const aPsycho = calcPsycho(match.away_team.history);

    // Final DIFF Features (for training)
    // worldDiff = hNet - aNet
    // physioDiff = hPhysio - aPhysio
    // psychoDiff = hPsycho - aPsycho

    return (prisma as any).matchFeatures.upsert({
        where: { matchId_sport_featureVersion: { matchId, sport: "basketball", featureVersion: "NBA_V3.1" } },
        update: {},
        create: {
            matchId,
            sport: "basketball",
            featureVersion: "NBA_V3.1",
            worldDiff: hNet - aNet,
            physioDiff: hPhysio - aPhysio,
            psychoDiff: hPsycho - aPsycho,
            featureTime: new Date()
        }
    });
}

function calcNet(history: any[]): number {
    if (history.length === 0) return 0;
    return history.reduce((acc, h) => acc + (h.result === "HOME_WIN" ? 1 : -1), 0) / history.length;
}

function calcPhysio(history: any[], matchDate: Date): number {
    const lastGame = history[0];
    if (!lastGame) return 0.2; // Baseline fatigue

    const diffDays = (matchDate.getTime() - new Date(lastGame.date).getTime()) / (1000 * 3600 * 24);
    const restDays = Math.floor(diffDays);
    const isB2B = restDays === 1 ? 1 : 0;
    const rotationLoad = 0.5; // Starter concentration proxy

    // UN Hardened Formula: 0.5 * exp(-0.8 * restDays) + 0.3 * isB2B + 0.2 * rotationLoad
    return 0.5 * Math.exp(-0.8 * restDays) + 0.3 * isB2B + 0.2 * rotationLoad;
}

function calcPsycho(history: any[]): number {
    // Motivation/Streak Pressure logic
    const streak = history.reduce((acc, h, i) => {
        if (i === 0 || h.result === history[i - 1].result) return acc + 1;
        return acc;
    }, 0);
    return Math.log(1 + streak);
}
