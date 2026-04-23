import { NextRequest } from "next/server";
import { validateInternalApiKey } from "@/lib/security/validateInternalApiKey";
import { runSecurityAgent } from "@/security/agent";

export async function GET(req: NextRequest) {
  if (!validateInternalApiKey(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const findings = runSecurityAgent();

  return Response.json({
    status: "ok",
    generatedAt: new Date().toISOString(),
    findings,
  });
}
