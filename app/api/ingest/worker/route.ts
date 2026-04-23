import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { qstashClient, INGEST_WORKER_URL } from "@/lib/ingest/qstash";
import { TheSportsDBAdapter } from "@/lib/ingest/adapters/thesportsdb";
import { TheOddsAPIAdapter } from "@/lib/ingest/adapters/theoddsapi";
import { resolveMatch } from "@/services/matchResolver";
import { validateInternalApiKey } from "@/lib/security/validateInternalApiKey";
import { rateLimit } from "@/lib/security/rateLimit";
import { isSecurityKillSwitchEnabled } from "@/lib/security/killSwitch";
import crypto from "crypto";

const generateHash = (payload: any) =>
    crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");

/**
 * Ingestion Worker
 * Processes one page of data for a specific provider/league.
 * Orchestrates: Fetch -> Raw Storage -> Resolve -> Upsert -> Recurse.
 */
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
        // 1. Adapter Factory
        const adapter = provider === "thesportsdb"
            ? new TheSportsDBAdapter()
            : new TheOddsAPIAdapter(process.env.THE_ODDS_API_KEY || "");

        // 2. Fetch Page
        const { data, nextPage, isLastPage } = await adapter.fetchPage({
            provider, sport, league, currentPage: page
        });

        let metrics = { processed: 0, skipped: 0, failed: 0 };

        const now = Date.now();
        const threeDaysMs = 3 * 24 * 60 * 60 * 1000;

        // 3. Process Events (with strict constraints)
        const itemsToProcess = data.filter(item => {
            const normalized = adapter.normalize(item, { provider, sport, league, currentPage: page });
            const matchTime = new Date(normalized.startTime).getTime();
            return Math.abs(matchTime - now) <= threeDaysMs;
        }).slice(0, 50);

        for (const item of itemsToProcess) {
            try {
                const normalized = adapter.normalize(item, { provider, sport, league, currentPage: page });
                const hash = generateHash(normalized.rawData);

                // a. Raw Storage & Hash Check
                const existingRaw = await prisma.rawEvents.findUnique({
                    where: { extId_provider: { extId: normalized.extId, provider } }
                });

                if (existingRaw && existingRaw.hash === hash) {
                    metrics.skipped++;
                    continue;
                }

                await prisma.rawEvents.upsert({
                    where: { extId_provider: { extId: normalized.extId, provider } },
                    update: { payload: normalized.rawData, hash, processed: true },
                    create: {
                        extId: normalized.extId,
                        provider,
                        sport: normalized.sport,
                        league: normalized.league,
                        payload: normalized.rawData,
                        hash,
                        processed: true
                    }
                });

                // b. Match Resolution (SSOT)
                const resolution = await resolveMatch({
                    provider,
                    extId: normalized.extId,
                    sport: normalized.sport,
                    league: normalized.league,
                    homeTeam: normalized.homeTeam,
                    awayTeam: normalized.awayTeam,
                    startTime: normalized.startTime
                });

                // c. Provider-Specific Upsert
                if (provider === "thesportsdb") {
                    // Priority source for metadata
                    await prisma.matches.update({
                        where: { match_id: resolution.matchId },
                        data: {
                            sourceUpdatedAt: new Date(),
                            // Only overwrite if it's the primary source
                            status: normalized.rawData.strStatus === "Match Finished" ? "finished" : "scheduled",
                        }
                    });
                } else if (provider === "theoddsapi") {
                    // Attach/Update Odds
                    await prisma.odds.create({
                        data: {
                            matchId: resolution.matchId,
                            provider,
                            odds_json: normalized.rawData,
                            fetched_at: new Date()
                        }
                    });
                }

                metrics.processed++;
            } catch (err: any) {
                console.error(`Error processing item ${item.id || "unknown"}:`, err);
                metrics.failed++;

                // Push to DLQ
                await prisma.ingestionErrors.create({
                    data: {
                        provider,
                        extId: item.id || null,
                        errorMessage: err.message,
                        payload: item
                    }
                });
            }

            // Rate limit delay
            await new Promise(r => setTimeout(r, 500));
        }

        // 4. Update IngestionState & Recurse
        const status = isLastPage ? "done" : "running";
        const nextP = isLastPage ? 1 : (nextPage || page + 1);

        await prisma.ingestionState.update({
            where: { provider_sport_league: { provider, sport, league } },
            data: {
                status,
                currentPage: nextP,
                lastRunAt: new Date(),
                retryCount: 0
            }
        });

        /* 
        if (!isLastPage && qstashClient) {
            await qstashClient.publishJSON({
                url: INGEST_WORKER_URL,
                body: { provider, sport, league, page: nextP }
            });
        }
        */

        return NextResponse.json({ provider, sport, league, metrics, nextP, status });

    } catch (error: any) {
        console.error("Worker fatal error:", error);

        // Handle retries
        const state = await prisma.ingestionState.findUnique({
            where: { provider_sport_league: { provider, sport, league } }
        });

        if (state && state.retryCount < 3) {
            await prisma.ingestionState.update({
                where: { id: state.id },
                data: { retryCount: state.retryCount + 1, status: "failed" }
            });
        } else {
            await prisma.ingestionState.update({
                where: { id: state?.id },
                data: { status: "failed" } // Mark as permanently failed until manual reset
            });
        }

        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
