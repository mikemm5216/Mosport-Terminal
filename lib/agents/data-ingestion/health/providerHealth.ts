import { recordSuccess, recordFailure } from "@/lib/pipeline/providerHealth";
import type { AgentProvider, AgentLeague } from "../types";
import type { LeagueCode } from "@/lib/pipeline/types";

export async function updateProviderHealth(params: {
  provider: AgentProvider;
  league: AgentLeague;
  status: "healthy" | "degraded" | "down";
  latencyMs?: number;
}): Promise<void> {
  const league = params.league as LeagueCode;
  if (params.status === "healthy") {
    await recordSuccess(params.provider, league, params.latencyMs ?? 0);
  } else {
    await recordFailure(params.provider, league);
  }
}
