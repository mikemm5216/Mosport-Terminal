import { NextResponse } from "next/server";
import { validateInternalApiKey } from "@/lib/security/validateInternalApiKey";
import { LiveDecisionAgent } from "@/lib/agents/live-decision/LiveDecisionAgent";
import type { LiveDecisionAgentInput } from "@/lib/agents/live-decision/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    if (!validateInternalApiKey(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as LiveDecisionAgentInput;
    const agent = new LiveDecisionAgent();
    const report = agent.run(body);

    return NextResponse.json(report);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
