import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { qstashClient, INGEST_WORKER_URL } from "@/lib/ingest/qstash";
import { getNextIngestionState } from "@/lib/ingest/core";

export async function POST() {
    try {
        const nextState = await getNextIngestionState();

        if (!nextState) {
            return NextResponse.json({ success: true, message: "No pending ingestion jobs." });
        }

        const { sport, league, currentPage } = nextState;

        // Publish to QStash
        await qstashClient.publishJSON({
            url: INGEST_WORKER_URL,
            body: {
                sport,
                league,
                page: currentPage,
                priority: 1 // TODO: Dynamic priority 
            },
        });

        return NextResponse.json({ success: true, sport, league, page: currentPage });
    } catch (error: any) {
        console.error("Trigger error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function GET() {
    return POST();
}
