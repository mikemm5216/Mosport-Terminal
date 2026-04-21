import { PrismaClient } from "@prisma/client";

/**
 * GHOST LAYER PROFILE SERVICE (V13.0)
 * User Behavior Vectorization & Risk Profiling
 */

const prisma = new PrismaClient();

const LAMBDA = 0.1; // Decay constant (higher = faster decay)

function calculateDecayedMetric(values: { val: number; timestamp: Date }[]): number {
    if (values.length === 0) return 0;

    const now = new Date().getTime();
    let weightedSum = 0;
    let totalWeight = 0;

    values.forEach(v => {
        const dt = (now - v.timestamp.getTime()) / (1000 * 60 * 60 * 24); // Days
        const weight = Math.exp(-LAMBDA * dt);
        weightedSum += v.val * weight;
        totalWeight += weight;
    });

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

export async function auditUserProfile(userId: string) {
    const logs = await prisma.userEventLog.findMany({
        where: { userId },
        take: 200,
        orderBy: { createdAt: "desc" }
    });

    const follows = logs.filter(l => l.action === "FOLLOW");

    // 1. Odds Preference (Decayed)
    const oddsValues = follows.map(l => ({
        val: (l.metadata as any)?.odds || 2.0,
        timestamp: l.createdAt
    }));
    const oddsPreference = Number(calculateDecayedMetric(oddsValues).toFixed(2)) || 2.0;

    // 2. Edge Preference (Decayed)
    const edgeValues = follows.map(l => ({
        val: (l.metadata as any)?.edge || 0.03,
        timestamp: l.createdAt
    }));
    const edgePreference = Number(calculateDecayedMetric(edgeValues).toFixed(4)) || 0.03;

    // 3. Risk Preference (Engagement Proxy - Decayed)
    const engagementValues = logs.map(l => ({
        val: l.action === "FOLLOW" ? 1.0 : 0.0,
        timestamp: l.createdAt
    }));
    const riskPreference = Number(calculateDecayedMetric(engagementValues).toFixed(2)) || 0.5;

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
