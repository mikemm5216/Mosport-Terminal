import { NextResponse } from "next/server";
import { syncLeagues } from "@/lib/espn-sync";

export async function GET() {
    try {
        console.log('--- STARTING 7-DAY SYNC ENGINE ---');
        // Sync yesterday, today, and next 5 days
        for (let i = -1; i <= 5; i++) {
            await syncLeagues(i);
            console.log(`Synced day ${i}`);
        }
        return NextResponse.json({ success: true, message: "Multi-day sync complete" });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
