import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateCronAuth } from "@/lib/auth";
import { validateInternalApiKey } from "@/lib/security/validateInternalApiKey";
import { rateLimit } from "@/lib/security/rateLimit";

export async function POST(request: Request) {
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    if (!rateLimit(ip, 30, 60_000)) {
      return Response.json({ error: "Too Many Requests" }, { status: 429 });
    }
    if (!validateInternalApiKey(request)) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    try {
        const error = await validateCronAuth(request.clone());
        if (error) return error;

        console.log("DATABASE_URL presence:", !!process.env.DATABASE_URL);
        console.log("DATABASE_URL prefix:", process.env.DATABASE_URL?.substring(0, 15));

        // Legacy providers
        const legacyProviders = ["thesportsdb", "theoddsapi"];
        const legacyLeagues = [
            { sport: "Football", league: "English Premier League" },
            { sport: "Football", league: "La Liga" }
        ];

        for (const provider of legacyProviders) {
            for (const { sport, league } of legacyLeagues) {
                await prisma.ingestionState.upsert({
                    where: { provider_sport_league: { provider, sport, league } },
                    update: { currentPage: 1, status: "pending" },
                    create: { provider, sport, league, currentPage: 1, status: "pending" }
                });
            }
        }

        // Unified pipeline providers (ESPN primary / Sportradar backup)
        const pipelineLeagues = [
            { sport: "football", league: "EPL" },
            { sport: "basketball", league: "NBA" },
            { sport: "baseball", league: "MLB" },
        ];

        for (const { sport, league } of pipelineLeagues) {
            await prisma.ingestionState.upsert({
                where: { provider_sport_league: { provider: "espn", sport, league } },
                update: { currentPage: 1, status: "pending" },
                create: { provider: "espn", sport, league, currentPage: 1, status: "pending" }
            });
        }

        return NextResponse.json({ status: "ok", message: "IngestionState initialized for Cold Start (legacy + pipeline)" });
    } catch (e: any) {
        return NextResponse.json({ status: "error", message: e.message }, { status: 500 });
    }
}
