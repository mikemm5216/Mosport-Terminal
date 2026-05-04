export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(
    {
      ok: false,
      service: "ingest-worker",
      error: "STALE_ROUTE_DISABLED",
      message: "This API route is not part of the ingest-worker production runtime."
    },
    { status: 410 }
  );
}

export async function POST() {
  return Response.json(
    {
      ok: false,
      service: "ingest-worker",
      error: "STALE_ROUTE_DISABLED",
      message: "This API route is not part of the ingest-worker production runtime."
    },
    { status: 410 }
  );
}

