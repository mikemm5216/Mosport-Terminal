import { NextResponse } from "next/server";

export async function GET() {
    try {
        const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
        const host = process.env.VERCEL_URL || 'localhost:3001';
        const signalsUrl = `${protocol}://${host}/api/signals`;

        // Trigger the signals API to populate the database
        const res = await fetch(signalsUrl, { cache: 'no-store' });
        const data = await res.json();

        return NextResponse.json({
            success: true,
            message: "GENESIS SYNC TRIGGERED",
            stats: {
                matches_processed: data.count || 0,
                source: signalsUrl
            }
        });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
