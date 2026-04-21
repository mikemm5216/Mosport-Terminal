import { prisma } from "../prisma";

export interface BaseballFeatures {
    homeXFIP: number;
    awayXFIP: number;
    homeWRCPlus: number;
    awayWRCPlus: number;
    homeISO: number;
    awayISO: number;
    homeBullpenUsage3D: number; // Avg innings pitched by bullpen last 3 days
    awayBullpenUsage3D: number;
}

/**
 * SABERMETRIC FEATURE CALCULATOR (V8.0)
 * Aggregates advanced stats for Starting Pitchers and Teams
 */
export async function computeBaseballAdvancedFeatures(matchId: string): Promise<BaseballFeatures | null> {
    const match = await (prisma as any).match.findUnique({
        where: { id: matchId },
        include: { baseballStats: true }
    });

    if (!match || !match.baseballStats) return null;

    // --- RULE: NO CONFIRMATION, NO PREDICTION ---
    if (!match.baseballStats.startingPitcherConfirmed) {
        console.warn(`[Baseball] Match ${matchId} skipped: Starting pitcher NOT confirmed.`);
        return null;
    }

    const { homeStarterId, awayStarterId, homeXFIP, awayXFIP, homeWRC, awayWRC } = match.baseballStats;

    // In a real production scenario, we'd fetch the rolling average based on starter ID.
    // For Phase 8.0, we use the values provided in the MatchStatsBaseball record 
    // which represent the "Pre-Game Projected Sabermetrics".

    return {
        homeXFIP: homeXFIP || 4.20,
        awayXFIP: awayXFIP || 4.20,
        homeWRCPlus: homeWRC || 100,
        awayWRCPlus: awayWRC || 100,
        homeISO: 0.160,
        awayISO: 0.160,
        homeBullpenUsage3D: 4.0, // Default baseline
        awayBullpenUsage3D: 4.0
    };
}
