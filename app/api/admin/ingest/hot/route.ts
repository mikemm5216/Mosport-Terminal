import { NextResponse } from "next/server";
import crypto from "crypto";
import { runHotIngestFull } from "../../../../../lib/ingest/runHotIngestFull";
import { runHotIngestMinimal } from "../../../../../lib/ingest/runHotIngestMinimal";

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

/**
 * Hot Ingest Route (Worker Entry Point)
 * 
 * Uses a minimal runner to avoid build-time dependency resolution issues
 * while the full ingestion agent is being consolidated.
 */
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

  if (!timingSafeEqual(secret, expectedSecret)) {
    console.warn(`[${routeVersion}] INVALID_INGEST_SECRET (mismatch)`);
    return NextResponse.json({ 
      ok: false,
      error: "INVALID_INGEST_SECRET",
      routeVersion
    }, { status: 403 });
  }

  try {
    let result;
    try {
      result = await runHotIngestFull({
        reason: "github_actions_hot_ingest",
        date: new Date().toISOString().slice(0, 10)
      });
    } catch (fullError) {
      console.warn(`[${routeVersion}] full run failed, falling back to minimal`, fullError);
      result = await runHotIngestMinimal({
        reason: "github_actions_hot_ingest_fallback",
        date: new Date().toISOString().slice(0, 10)
      });
    }

    return NextResponse.json({
      ok: result.ok,
      routeVersion,
      result
    }, { status: result.ok ? 200 : 500 });

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
