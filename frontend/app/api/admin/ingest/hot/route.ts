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
 * Hot Ingest Route (Frontend Bridge - DEPRECATED)
 * 
 * Ingestion has been moved to a dedicated 'ingest-worker' service.
 * This route remains for diagnostic redirection.
 */
export async function POST(req: Request) {
  const routeVersion = "hot-ingest-diagnostic-v2";
  const secret = req.headers.get("x-ingest-secret");

  const expectedSecret = process.env.INGEST_SECRET;

  if (!expectedSecret) {
    return NextResponse.json({ 
      ok: false,
      error: "SERVER_INGEST_SECRET_MISSING",
      routeVersion 
    }, { status: 500 });
  }

  if (!secret || !timingSafeEqual(secret, expectedSecret)) {
    return NextResponse.json({ 
      ok: false,
      error: "INVALID_INGEST_SECRET",
      routeVersion
    }, { status: 403 });
  }

  return NextResponse.json({
    ok: false,
    routeVersion,
    error: "FRONTEND_INGEST_DISABLED",
    message: "Ingestion has been moved to the dedicated 'ingest-worker' service. Update your INGEST_URL variable to point to the ingest-worker domain.",
    diagnostic: {
      redirectRequired: true,
      suggestedUrl: "https://<ingest-worker-domain>/api/admin/ingest/hot"
    }
  }, { status: 410 }); // Gone (for this purpose)
}
