import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { IngestionJob, IngestionMetrics, RawEventPayload } from "./types";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Generate a hash of the payload to detect changes.
 */
export function generatePayloadHash(payload: any): string {
    return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

/**
 * Core fetch function with rate limiting and retry logic.
 */
export async function fetchWithRetry(
    url: string,
    options: RequestInit = {},
    retries = 3,
    delay = 1000
): Promise<any> {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, options);

            if (response.status === 429) {
                const backoff = delay * Math.pow(2, i);
                console.warn(`Rate limited (429). Retrying in ${backoff}ms...`);
                await sleep(backoff);
                continue;
            }

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            if (i === retries - 1) throw error;
            const backoff = delay * Math.pow(2, i);
            await sleep(backoff);
        }
    }
}

/**
 * Process a single event payload.
 */
export async function processRawEvent(
    payload: RawEventPayload,
    metrics: IngestionMetrics
): Promise<void> {
    const { extId, provider, sport, league, data } = payload;
    const hash = generatePayloadHash(data);

    // 1. Check if RawEvent already exists and has the same hash
    const existingRaw = await prisma.rawEvents.findUnique({
        where: { extId_provider: { extId, provider } },
    });

    if (existingRaw && existingRaw.hash === hash) {
        metrics.skippedUnchangedCount++;
        return;
    }

    // 2. Upsert RawEvent
    await prisma.rawEvents.upsert({
        where: { extId_provider: { extId, provider } },
        update: { payload: data, hash, processed: false },
        create: { extId, provider, sport, league, payload: data, hash },
    });

    try {
        // 3. Upsert Canonical Match
        // Note: This is an example, actual parsing depends on the provider's schema
        await prisma.matches.upsert({
            where: { extId },
            update: {
                sourceUpdatedAt: new Date(), // Or from payload if available
                // Update other fields as needed
            },
            create: {
                extId,
                home_team_id: data.home_team_id || "unknown", // Map to internal team IDs
                away_team_id: data.away_team_id || "unknown",
                match_date: new Date(data.commence_time || data.date),
                status: "scheduled",
                sport,
                league,
            },
        });

        // 4. Save Odds (Time-series)
        await prisma.odds.create({
            data: {
                matchId: (await prisma.matches.findUnique({ where: { extId }, select: { match_id: true } }))?.match_id || "",
                provider,
                odds_json: data.odds || {},
            },
        });

        // Mark as processed
        await prisma.rawEvents.update({
            where: { extId_provider: { extId, provider } },
            data: { processed: true },
        });

        metrics.successCount++;
    } catch (error: any) {
        metrics.failureCount++;
        // log to DLQ
        await prisma.ingestionErrors.create({
            data: {
                extId,
                provider,
                payload: data,
                error: error.message,
                stack: error.stack,
                severity: "CRITICAL",
            },
        });
        throw error;
    }
}

/**
 * Get the next league based on priority.
 */
export async function getNextIngestionState() {
    const states = await prisma.ingestionState.findMany({
        orderBy: [
            { sport: "asc" }, // Simplified priority logic for now
            { league: "asc" },
        ],
        where: {
            status: { in: ["pending", "failed"] },
        },
        take: 1,
    });

    return states[0] || null;
}
