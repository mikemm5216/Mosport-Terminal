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
  const routeVersion = "hot-ingest-diagnostic-v1";
  const secret = req.headers.get("x-ingest-secret");

  const expectedSecret = process.env.INGEST_SECRET;

  if (!expectedSecret) {
    console.error(`[${routeVersion}] SERVER_INGEST_SECRET_MISSING`);
    return NextResponse.json({ 
      ok: false,
      error: "SERVER_INGEST_SECRET_MISSING",
      routeVersion 
    }, { status: 500 });
  }

  if (!secret) {
    console.warn(`[${routeVersion}] REQUEST_INGEST_SECRET_MISSING`);
    return NextResponse.json({ 
      ok: false,
      error: "REQUEST_INGEST_SECRET_MISSING",
      routeVersion 
    }, { status: 401 });
  }

  console.log(`[${routeVersion}] Secret check - incoming: ${secret.length} chars, expected: ${expectedSecret.length} chars`);

  if (!timingSafeEqual(secret, expectedSecret)) {
    console.warn(`[${routeVersion}] INVALID_INGEST_SECRET (mismatch)`);
    return NextResponse.json({ 
      ok: false,
      error: "INVALID_INGEST_SECRET",
      routeVersion,
      diagnostic: {
        receivedLength: secret.length,
        expectedLength: expectedSecret.length
      }
    }, { status: 403 });
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

    return NextResponse.json({
      ...report,
      routeVersion
    });
  } catch (err) {
    console.error(`[${routeVersion}] hot run failed`, err);
    return NextResponse.json(
      { 
        ok: false,
        error: err instanceof Error ? err.message : "Unknown error",
        routeVersion
      },
      { status: 500 },
    );
  }
}
