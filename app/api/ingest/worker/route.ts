import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TheSportsDBAdapter } from "@/lib/ingest/adapters/thesportsdb";
import { TheOddsAPIAdapter } from "@/lib/ingest/adapters/theoddsapi";
import { resolveMatch } from "@/services/matchResolver";
import { validateInternalApiKey } from "@/lib/security/validateInternalApiKey";
import { rateLimit } from "@/lib/security/rateLimit";
import { isSecurityKillSwitchEnabled } from "@/lib/security/killSwitch";
import { runDataLifecyclePipeline } from "@/lib/pipeline";
import crypto from "crypto";

const generateHash = (payload: any) =>
  crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
  if (!rateLimit(ip, 30, 60_000)) {
    return Response.json({ error: "Too Many Requests" }, { status: 429 });
  }
  if (!validateInternalApiKey(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (isSecurityKillSwitchEnabled()) {
    return Response.json({ error: "Security kill switch enabled" }, { status: 503 });
  }

  const body = await req.json();
  const { provider, sport, league, page = 1 } = body;

  try {
    // ── Unified Data Lifecycle Pipeline (ESPN / Sportradar) ─────────────────────
    if (provider === "espn" || provider === "sportradar") {
      const result = await runDataLifecyclePipeline({ provider, sport, league, currentPage: page });

      await prisma.ingestionState.update({
        where: { provider_sport_league: { provider, sport, league } },
        data: { status: "done", lastRunAt: new Date(), retryCount: 0 },
      });

      return NextResponse.json({ provider, sport, league, metrics: result });
    }

    // ── Legacy Pipeline (TheSportsDB / TheOddsAPI) ──────────────────────────────
    const adapter =
      provider === "thesportsdb"
        ? new TheSportsDBAdapter()
        : new TheOddsAPIAdapter(process.env.THE_ODDS_API_KEY || "");

    const { data, nextPage, isLastPage } = await adapter.fetchPage({
      provider, sport, league, currentPage: page,
    });

    const metrics = { processed: 0, skipped: 0, failed: 0 };
    const now = Date.now();
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000;

    const itemsToProcess = data
      .filter((item) => {
        const n = adapter.normalize(item, { provider, sport, league, currentPage: page });
        return Math.abs(new Date(n.startTime).getTime() - now) <= threeDaysMs;
      })
      .slice(0, 50);

    for (const item of itemsToProcess) {
      try {
        const normalized = adapter.normalize(item, { provider, sport, league, currentPage: page });
        const hash = generateHash(normalized.rawData);

        const existingRaw = await prisma.rawEvent.findUnique({
          where: { extId_provider: { extId: normalized.extId, provider } },
        });

        if (existingRaw && existingRaw.hash === hash) {
          metrics.skipped++;
          continue;
        }

        await prisma.rawEvent.upsert({
          where: { extId_provider: { extId: normalized.extId, provider } },
          update: { payload: normalized.rawData, hash, processed: true, status: "mapped" },
          create: {
            extId: normalized.extId,
            provider,
            sport: normalized.sport,
            league: normalized.league,
            payload: normalized.rawData,
            hash,
            processed: true,
            status: "mapped",
          },
        });

        const resolution = await resolveMatch({
          provider,
          extId: normalized.extId,
          sport: normalized.sport,
          league: normalized.league,
          homeTeam: normalized.homeTeam,
          awayTeam: normalized.awayTeam,
          startTime: normalized.startTime,
        });

        if (provider === "thesportsdb") {
          await prisma.match.update({
            where: { match_id: resolution.matchId },
            data: {
              sourceUpdatedAt: new Date(),
              sourceProvider: "sportradar",
              sourceConfidence: resolution.score,
              status: normalized.rawData.strStatus === "Match Finished" ? "finished" : "scheduled",
            },
          });
        } else if (provider === "theoddsapi") {
          await prisma.odds.create({
            data: {
              matchId: resolution.matchId,
              provider,
              odds_json: normalized.rawData,
              fetched_at: new Date(),
            },
          });
        }

        metrics.processed++;
      } catch (err: any) {
        console.error(`Error processing item ${item.id || "unknown"}:`, err);
        metrics.failed++;
        await prisma.ingestionError.create({
          data: { provider, extId: item.id || null, errorMessage: err.message, payload: item },
        });
      }

      await new Promise((r) => setTimeout(r, 500));
    }

    const status = isLastPage ? "done" : "running";
    const nextP = isLastPage ? 1 : (nextPage || page + 1);

    await prisma.ingestionState.update({
      where: { provider_sport_league: { provider, sport, league } },
      data: { status, currentPage: nextP, lastRunAt: new Date(), retryCount: 0 },
    });

    return NextResponse.json({ provider, sport, league, metrics, nextP, status });
  } catch (error: any) {
    console.error("Worker fatal error:", error);

    const state = await prisma.ingestionState.findUnique({
      where: { provider_sport_league: { provider, sport, league } },
    });

    if (state) {
      await prisma.ingestionState.update({
        where: { id: state.id },
        data: {
          retryCount: state.retryCount < 3 ? state.retryCount + 1 : state.retryCount,
          status: "failed",
        },
      });
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
