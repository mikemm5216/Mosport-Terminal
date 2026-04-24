import { NextResponse } from "next/server";
import { syncLeagues } from "@/lib/espn-sync";

function isAuthorized(req: Request): boolean {
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && req.headers.get("authorization") === `Bearer ${cronSecret}`) return true;
    const internalKey = process.env.MOSPORT_INTERNAL_API_KEY;
    if (internalKey && req.headers.get("x-api-key") === internalKey) return true;
    return false;
}

export async function GET(req: Request) {
    if (!isAuthorized(req)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    try {
        for (let i = -1; i <= 5; i++) {
            await syncLeagues(i);
        }
        return NextResponse.json({ success: true, message: "Multi-day sync complete" });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
