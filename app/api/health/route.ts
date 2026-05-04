export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    ok: true,
    service: "ingest-worker",
    routeVersion: "ingest-worker-health-v1",
    timestamp: new Date().toISOString()
  });
}
