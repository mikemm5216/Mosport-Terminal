import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processRawEvent, fetchWithRetry } from "@/lib/ingest/core";
import { qstashClient, INGEST_WORKER_URL } from "@/lib/ingest/qstash";
import { IngestionJob, IngestionMetrics } from "@/lib/ingest/types";

async function handler(req: Request) {
    const body = (await req.json()) as IngestionJob;
    const { sport, league, page, priority } = body;

    const metrics: IngestionMetrics = {
        successCount: 0,
        failureCount: 0,
        retryCount: 0,
        skippedUnchangedCount: 0,
        alignmentFailures: 0,
    };

    try {
        // 1. Update status to 'running'
        await prisma.ingestionState.upsert({
            where: { sport_league: { sport, league } },
            update: { status: "running", lastRunAt: new Date(), currentPage: page },
            create: { sport, league, status: "running", lastRunAt: new Date(), currentPage: page },
        });

        // 2. Fetch External Data
        // For now, using a placeholder endpoint. In production, this would use league-specific URLs.
        const url = `https://www.thesportsdb.com/api/v1/json/3/eventsday.php?d=2026-03-25`;
        const data = await fetchWithRetry(url);
        const events = data.events || [];

        // 3. Process Events
        for (const event of events) {
            try {
                await processRawEvent({
                    extId: String(event.idEvent),
                    provider: "TheSportsDB",
                    sport,
                    league,
                    data: event,
                }, metrics);
            } catch (e) {
                console.error(`Failed to process event ${event.idEvent}:`, e);
            }
        }

        // 4. Handle Pagination / Next Job
        const hasMorePages = false; // Placeholder for actual pagination logic
        if (hasMorePages) {
            await qstashClient.publishJSON({
                url: INGEST_WORKER_URL,
                body: { sport, league, page: page + 1, priority },
            });
        } else {
            await prisma.ingestionState.update({
                where: { sport_league: { sport, league } },
                data: { status: "done", lastRunAt: new Date(), currentPage: 1 },
            });

            // Trigger next job (could be another league)
            await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/ingest/trigger`, { method: "POST" });
        }

        return NextResponse.json({ success: true, metrics });
    } catch (error: any) {
        console.error("Worker error:", error);

        // Fail-safe: Mark as failed
        await prisma.ingestionState.update({
            where: { sport_league: { sport, league } },
            data: { status: "failed", lastRunAt: new Date() },
        });

        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export const POST = handler;
