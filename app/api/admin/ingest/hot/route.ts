import { NextResponse } from "next/server";
import { ingestHotData } from "@/lib/ingest/hotIngest";

export async function POST(req: Request) {
  try {
    const secret = req.headers.get("x-ingest-secret");

    if (!secret || secret !== process.env.INGEST_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await ingestHotData();

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Ensure it's not cached
export const dynamic = "force-dynamic";
