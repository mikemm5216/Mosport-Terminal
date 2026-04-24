import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const secret = req.headers.get("x-ingest-secret");

    if (!process.env.INGEST_SECRET) {
      return NextResponse.json({ error: "INGEST_SECRET is not configured" }, { status: 500 });
    }

    if (!secret || secret !== process.env.INGEST_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Dynamic import to prevent Prisma initialization during build phase
    const { ingestHotData } = await import("@/lib/ingest/hotIngest");
    const result = await ingestHotData();

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[hot ingest] failed", err);
    return NextResponse.json({ 
      status: "error", 
      message: err instanceof Error ? err.message : "Unknown error" 
    }, { status: 500 });
  }
}
