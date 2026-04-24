import { routeCanonical, writeCold } from "@/lib/pipeline/router";
import type { CanonicalMatch } from "@/lib/pipeline/types";
import type { AgentCanonicalMatch } from "../types";

function toPipelineCanonical(match: AgentCanonicalMatch): CanonicalMatch {
  return {
    canonicalMatchId: match.canonicalMatchId,
    league: match.league,
    homeTeamCode: match.homeTeamCode,
    awayTeamCode: match.awayTeamCode,
    startsAt: match.startsAt,
    status: match.status,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    sourceProvider: match.provider,
    sourceConfidence: match.sourceConfidence,
    rawRefs: match.rawRefId ? [match.rawRefId] : [],
  };
}

export async function routeColdHot(params: {
  mode: "hot" | "cold";
  matches: AgentCanonicalMatch[];
}): Promise<number> {
  let upserted = 0;

  for (const match of params.matches) {
    const canonical = toPipelineCanonical(match);
    const rawRef = match.rawRefId ?? "";

    try {
      if (params.mode === "cold") {
        await writeCold(canonical, rawRef);
      } else {
        await routeCanonical(canonical, rawRef);
      }
      upserted++;
    } catch {
      // per-match routing failures bubble up as reduced upsertedCount
    }
  }

  return upserted;
}
