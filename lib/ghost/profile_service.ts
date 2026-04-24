import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const LAMBDA = 0.1;

function calculateDecayedMetric(values: { val: number; timestamp: Date }[]): number {
    if (values.length === 0) return 0;

    const now = new Date().getTime();
    let weightedSum = 0;
    let totalWeight = 0;

    values.forEach(v => {
        const dt = (now - v.timestamp.getTime()) / (1000 * 60 * 60 * 24);
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

    const oddsPreference = Number(calculateDecayedMetric(
        follows.map(l => ({ val: (l.metadata as any)?.odds || 2.0, timestamp: l.createdAt }))
    ).toFixed(2)) || 2.0;

    const edgePreference = Number(calculateDecayedMetric(
        follows.map(l => ({ val: (l.metadata as any)?.edge || 0.03, timestamp: l.createdAt }))
    ).toFixed(4)) || 0.03;

    const riskPreference = Number(calculateDecayedMetric(
        logs.map(l => ({ val: l.action === "FOLLOW" ? 1.0 : 0.0, timestamp: l.createdAt }))
    ).toFixed(2)) || 0.5;

    const profilePayload = { riskPreference, edgePreference, oddsPreference, lastBehaviorAudit: new Date() };

    await prisma.userProfileVector.upsert({
        where: { userId },
        update: { payload: profilePayload },
        create: { userId, payload: profilePayload }
    });

    return { riskPreference, edgePreference, oddsPreference };
}
