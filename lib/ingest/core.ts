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
    const existingRaw = await prisma.rawEvent.findUnique({
        where: { extId_provider: { extId, provider } },
    });

    if (existingRaw && existingRaw.hash === hash) {
        metrics.skippedUnchangedCount++;
        return;
    }

    // 2. Upsert RawEvent
    await prisma.rawEvent.upsert({
        where: { extId_provider: { extId, provider } },
        update: { payload: data, hash, processed: false },
        create: { extId, provider, sport, league, payload: data, hash },
    });

    try {
        // 3. Create Canonical Match (keyed by extId used as match_id for provider records)
        const matchId = `${provider}_${extId}`;
        await prisma.match.upsert({
            where: { match_id: matchId },
            update: {
                sourceUpdatedAt: new Date(),
            },
            create: {
                match_id: matchId,
                home_team_id: data.home_team_id || "unknown",
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
                matchId,
                provider,
                odds_json: data.odds || {},
            },
        });

        // Mark as processed
        await prisma.rawEvent.update({
            where: { extId_provider: { extId, provider } },
            data: { processed: true },
        });

        metrics.successCount++;
    } catch (error: any) {
        metrics.failureCount++;
        await prisma.ingestionError.create({
            data: {
                extId,
                provider,
                payload: data,
                errorMessage: error.message,
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
