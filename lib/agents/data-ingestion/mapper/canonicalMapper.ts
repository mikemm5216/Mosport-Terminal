import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { ESPNAdapter } from "@/lib/ingest/adapters/espn";
import { SportradarAdapter } from "@/lib/ingest/adapters/sportradar";
import { resolveMatch } from "@/services/matchResolver";
import type { AgentProviderResult, AgentCanonicalMatch, AgentLeague, AgentProvider } from "../types";
import type { SportType } from "@/lib/ingest/types";

const SPORT_MAP: Record<AgentLeague, SportType> = {
  MLB: "baseball",
  NBA: "basketball",
  EPL: "football",
};

const STATUS_MAP: Record<string, AgentCanonicalMatch["status"]> = {
  scheduled: "scheduled",
  live: "live",
  closed: "closed",
  postponed: "postponed",
  cancelled: "cancelled",
};

function extractExtId(rawEvent: unknown, provider: AgentProvider): string {
  const e = rawEvent as Record<string, unknown>;
  return provider === "espn" ? String(e.id ?? "") : String(e.idEvent ?? "");
}

function getAdapter(provider: AgentProvider) {
  return provider === "espn" ? new ESPNAdapter() : new SportradarAdapter();
}

export async function saveRawEvents(result: AgentProviderResult): Promise<Map<string, string>> {
  const rawIdMap = new Map<string, string>();

  for (const rawEvent of result.rawEvents) {
    const extId = extractExtId(rawEvent, result.provider);
    if (!extId) continue;

    const hash = crypto.createHash("sha256").update(JSON.stringify(rawEvent)).digest("hex");

    const raw = await prisma.rawEvent.upsert({
      where: { extId_provider: { extId, provider: result.provider } },
      update: { payload: rawEvent as any, hash, fetchedAt: new Date(), status: "raw" },
      create: {
        extId,
        provider: result.provider,
        sport: SPORT_MAP[result.league],
        league: result.league,
        payload: rawEvent as any,
        hash,
        processed: false,
        fetchedAt: new Date(),
        status: "raw",
      },
    });

    rawIdMap.set(extId, raw.id);
  }

  return rawIdMap;
}

export async function mapToCanonical(
  result: AgentProviderResult,
  rawIdMap: Map<string, string>,
): Promise<AgentCanonicalMatch[]> {
  const adapter = getAdapter(result.provider);
  const sport = SPORT_MAP[result.league];
  const job = { sport, league: result.league, currentPage: 1 };
  const canonical: AgentCanonicalMatch[] = [];

  for (const rawEvent of result.rawEvents) {
    const extId = extractExtId(rawEvent, result.provider);
    if (!extId) continue;

    try {
      const normalized = adapter.normalize(rawEvent, job);

      const resolution = await resolveMatch({
        provider: result.provider,
        extId,
        sport,
        league: result.league,
        homeTeam: normalized.homeTeam,
        awayTeam: normalized.awayTeam,
        startTime: normalized.startTime,
      });

      const rawRef = rawIdMap.get(extId);

      if (rawRef) {
        await prisma.rawEvent.update({
          where: { id: rawRef },
          data: { processed: true, status: "mapped" },
        });
      }

      canonical.push({
        provider: result.provider,
        providerEventId: extId,
        canonicalMatchId: resolution.matchId,
        league: result.league,
        homeTeamCode: normalized.homeTeam,
        awayTeamCode: normalized.awayTeam,
        startsAt: normalized.startTime.toISOString(),
        status: STATUS_MAP[normalized.status ?? "scheduled"] ?? "scheduled",
        homeScore: normalized.homeScore,
        awayScore: normalized.awayScore,
        rawRefId: rawRef,
        sourceConfidence: resolution.score,
      });
    } catch {
      // per-event failures are counted at the league level by the agent
    }
  }

  return canonical;
}
