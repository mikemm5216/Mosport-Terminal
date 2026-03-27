import { PrismaClient } from "@prisma/client";
import { createHash } from "crypto";

/**
 * GHOST LAYER TRACKING SERVICE (V13.0 REFINED)
 * Immutable Behavioral Backbone
 */

const prisma = new PrismaClient();

export function generateSignalHash(
    matchId: string,
    timestamp: number,
    prob: number,
    odds: number
): string {
    const data = `${matchId}|${timestamp}|${prob.toFixed(4)}|${odds.toFixed(2)}`;
    return createHash("sha256").update(data).digest("hex");
}

export async function trackUserDecision(
    userId: string,
    matchId: string,
    action: "VIEW" | "FOLLOW" | "IGNORE",
    signalMetadata: { prob: number; odds: number; timestamp: number },
    customMetadata: any = {}
) {
    const signalId = generateSignalHash(
        matchId,
        signalMetadata.timestamp,
        signalMetadata.prob,
        signalMetadata.odds
    );

    try {
        await prisma.userDecisionLog.create({
            data: {
                userId,
                matchId,
                action,
                metadata: {
                    ...customMetadata,
                    signalId,
                    ...signalMetadata
                }
            }
        });
        return { success: true, signalId };
    } catch (e) {
        console.error("[Ghost] Failed to track decision:", e);
        return { success: false };
    }
}

export async function recordStrategySnapshot(
    strategyName: string,
    metrics: any
) {
    try {
        await prisma.strategyPerformanceSnapshot.create({
            data: {
                strategyName,
                metrics
            }
        });
    } catch (e) {
        console.error("[Ghost] Failed to record snapshot:", e);
    }
}
