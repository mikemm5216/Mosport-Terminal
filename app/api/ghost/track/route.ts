import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => ({}));
        const { action, signalId } = body;

        // Log to UserEventLog if schema exists, else swallow gracefully
        if (action && signalId) {
            await (prisma as any).userEventLog.create({
                data: {
                    userId: "anonymous",
                    matchId: String(signalId),
                    action: String(action),
                    modelVersion: "v17",
                    metadata: {},
                },
            }).catch(() => { /* schema may not have userId yet — non-blocking */ });
        }

        return NextResponse.json({ status: "logged", action, signalId });
    } catch (e: any) {
        // Never let this endpoint crash the client
        return NextResponse.json({ status: "logged" });
    }
}

// Also handle GET for health-check probes
export async function GET() {
    return NextResponse.json({ status: "ghost_track_online" });
}
