import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateCronAuth } from "@/lib/auth";

export async function POST(request: Request) {
    try {
        const error = await validateCronAuth(request.clone());
        if (error) return error;

        console.log("DATABASE_URL presence:", !!process.env.DATABASE_URL);
        console.log("DATABASE_URL prefix:", process.env.DATABASE_URL?.substring(0, 15));

        const providers = ["thesportsdb", "theoddsapi"];
        const leagues = [
            { sport: "Football", league: "English Premier League" },
            { sport: "Football", league: "La Liga" }
        ];

        for (const provider of providers) {
            for (const { sport, league } of leagues) {
                await prisma.ingestionState.upsert({
                    where: { provider_sport_league: { provider, sport, league } },
                    update: { currentPage: 1, status: "pending" },
                    create: { provider, sport, league, currentPage: 1, status: "pending" }
                });
            }
        }

        return NextResponse.json({ status: "ok", message: "IngestionState initialized for Cold Start" });
    } catch (e: any) {
        return NextResponse.json({ status: "error", message: e.message }, { status: 500 });
    }
}
