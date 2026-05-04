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

/**
 * Hot Ingest Route (Frontend Bridge)
 * 
 * This route exists in the frontend app to handle ingestion triggers from GitHub Actions.
 * Currently, the ingestion pipeline resides in the root/backend service.
 */
export async function POST(req: Request) {
  const routeVersion = "hot-ingest-diagnostic-v1";
  const secret = req.headers.get("x-ingest-secret");

  const expectedSecret = process.env.INGEST_SECRET;

  // 1. Validate server configuration
  if (!expectedSecret) {
    console.error(`[${routeVersion}] SERVER_INGEST_SECRET_MISSING`);
    return NextResponse.json({ 
      ok: false,
      error: "SERVER_INGEST_SECRET_MISSING",
      routeVersion 
    }, { status: 500 });
  }

  // 2. Validate request authentication
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

  // 3. Attempt to trigger ingestion or report bridge status
  // Note: On Railway, if the build root is 'frontend', the root lib/agents is unreachable.
  return NextResponse.json({
    ok: false,
    routeVersion,
    error: "INGEST_PIPELINE_NOT_WIRED",
    message: "Frontend app received trigger but ingestion pipeline is located in root service.",
    diagnostic: {
      deployment: "frontend-only",
      buildRoot: "frontend"
    }
  }, { status: 501 }); // Not Implemented (as a bridge)
}
