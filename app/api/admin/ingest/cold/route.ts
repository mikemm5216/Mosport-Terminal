import { NextResponse } from "next/server";
import { ingestColdData } from "@/lib/ingest/coldIngest";

export async function GET(req: Request) {
  // Vercel Cron sends a secret header we can check if needed
  // CRON_SECRET is automatically injected by Vercel if configured
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await ingestColdData();
    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
