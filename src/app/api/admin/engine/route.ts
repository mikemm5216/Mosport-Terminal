import { NextResponse } from 'next/server';
import { execute10MinJob, execute30MinJob, execute60MinJob } from "../../../../scheduler/cron";

export async function POST(request: Request) {
  try {
    // Only allow manual trigger by admin or via Vercel Cron
    // In production, we'd check req.headers.get("Authorization")
    
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    if (type === "10min") {
      await execute10MinJob();
    } else if (type === "30min") {
      await execute30MinJob();
    } else if (type === "60min") {
      await execute60MinJob();
    } else {
      // Run all if no type is specified (manual trigger)
      await execute10MinJob();
      await execute30MinJob();
      await execute60MinJob();
    }

    return NextResponse.json({ success: true, message: `Engines triggered for ${type || 'all'}` });
  } catch (error: any) {
    console.error("[Admin Engine Route] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
