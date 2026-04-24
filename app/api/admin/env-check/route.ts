export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export async function GET(req: Request) {
  const secret = req.headers.get("x-ingest-secret");

  if (!process.env.INGEST_SECRET || secret !== process.env.INGEST_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  return Response.json({
    status: "ok",
    env: {
      INGEST_SECRET: Boolean(process.env.INGEST_SECRET),
      DATABASE_URL: Boolean(process.env.DATABASE_URL),
      DATABASE_READ_URL: Boolean(process.env.DATABASE_READ_URL),
      DATABASE_WRITE_URL: Boolean(process.env.DATABASE_WRITE_URL),
      SPORTRADAR_API_KEY: Boolean(process.env.SPORTRADAR_API_KEY),
      NEXT_PUBLIC_APP_URL: Boolean(process.env.NEXT_PUBLIC_APP_URL),
    },
  });
}
