import { NextResponse } from "next/server";
import { validateInternalApiKey } from "@/lib/security/validateInternalApiKey";
import { DataFreshnessAgent } from "@/lib/agents/data-freshness/DataFreshnessAgent";
import type { DataFreshnessAgentLeague } from "@/lib/agents/data-freshness/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const VALID_LEAGUES: DataFreshnessAgentLeague[] = ["MLB", "NBA", "EPL", "UCL"];

function parseLeagues(url: URL): DataFreshnessAgentLeague[] | undefined {
  const raw = url.searchParams.get("leagues");
  if (!raw) return undefined;

  const requested = raw
    .split(",")
    .map((value) => value.trim().toUpperCase())
    .filter((value): value is DataFreshnessAgentLeague =>
      VALID_LEAGUES.includes(value as DataFreshnessAgentLeague),
    );

  return requested.length > 0 ? requested : undefined;
}

export async function GET(req: Request) {
  try {
    if (!validateInternalApiKey(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const agent = new DataFreshnessAgent();
    const report = await agent.run({
      leagues: parseLeagues(new URL(req.url)),
    });

    return NextResponse.json(report);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
