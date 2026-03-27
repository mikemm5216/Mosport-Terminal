import { PrismaClient } from "@prisma/client";

/**
 * GHOST LAYER PROFILE SERVICE (V13.0)
 * User Behavior Vectorization & Risk Profiling
 */

const prisma = new PrismaClient();

export async function auditUserProfile(userId: string) {
    const logs = await prisma.userDecisionLog.findMany({
        where: { userId },
        take: 100
    });

    // Heuristic: Calculate mean risk/edge/odds preference from history
    const follows = logs.filter(l => l.action === "FOLLOW");

    let riskPreference = 0.5;
    let edgePreference = 0.03;
    let oddsPreference = 2.0;

    if (follows.length > 0) {
        const avgOdds = follows.reduce((sum, l: any) => sum + (l.metadata?.odds || 0), 0) / follows.length;
        const avgEdge = follows.reduce((sum, l: any) => sum + (l.metadata?.edge || 0), 0) / follows.length;

        oddsPreference = Number(avgOdds.toFixed(2));
        edgePreference = Number(avgEdge.toFixed(4));
        riskPreference = follows.length / logs.length; // Basic engagement proxy
    }

    await prisma.userProfileVector.upsert({
        where: { userId },
        update: {
            riskPreference,
            edgePreference,
            oddsPreference,
            lastBehaviorAudit: new Date()
        },
        create: {
            userId,
            riskPreference,
            edgePreference,
            oddsPreference
        }
    });

    return { riskPreference, edgePreference, oddsPreference };
}
