import { NextResponse } from "next/server";
import crypto from "crypto";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Pad to same length so timingSafeEqual runs, then return false
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

export async function POST(req: Request) {
  const secret = req.headers.get("x-ingest-secret") ?? "";

  if (!process.env.INGEST_SECRET) {
    return NextResponse.json({ error: "INGEST_SECRET is not configured" }, { status: 500 });
  }

  if (!timingSafeEqual(secret, process.env.INGEST_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { DataIngestionAgent } = await import(
      "@/lib/agents/data-ingestion/DataIngestionAgent"
    );

    const agent = new DataIngestionAgent();

    const report = await agent.run({
      mode: "hot",
      leagues: ["MLB", "NBA", "EPL"],
      date: new Date().toISOString().slice(0, 10),
    });

    return NextResponse.json(report);
  } catch (err) {
    console.error("[DataIngestionAgent] hot run failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
