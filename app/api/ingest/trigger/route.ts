import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { qstashClient, INGEST_WORKER_URL } from "@/lib/ingest/qstash";

export async function POST() {
    try {
        // 1. Find the next pending/failed job across all providers
        // Priority: TheSportsDB first, then The Odds API
        const job = await prisma.ingestionState.findFirst({
            where: {
                status: { in: ["pending", "failed"] },
            },
            orderBy: [
                { provider: "asc" }, // "thesportsdb" before "theoddsapi"
                { lastRunAt: "asc" },
            ],
        });

        if (!job) {
            return NextResponse.json({ message: "No pending ingestion jobs found." });
        }

        // 2. Enqueue via QStash
        if (qstashClient) {
            await qstashClient.publishJSON({
                url: INGEST_WORKER_URL,
                body: {
                    provider: job.provider,
                    sport: job.sport,
                    league: job.league,
                    page: job.currentPage,
                },
            });

            // Update state to running
            await prisma.ingestionState.update({
                where: { id: job.id },
                data: { status: "running", lastRunAt: new Date() },
            });

            return NextResponse.json({
                message: "Ingestion triggered.",
                job: { provider: job.provider, sport: job.sport, league: job.league },
            });
        }

        return NextResponse.json(
            { error: "QStash client not configured." },
            { status: 500 }
        );
    } catch (error: any) {
        console.error("Dispatcher error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
