import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { ingestColdData } = await import("@/lib/ingest/coldIngest");
    const result = await ingestColdData();
    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (err: any) {
    console.error("[cold ingest] failed", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
