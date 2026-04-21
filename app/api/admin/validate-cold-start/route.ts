import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateCronAuth } from "@/lib/auth";

export async function GET(request: Request) {
    try {
        const error = await validateCronAuth(request.clone());
        if (error) return error;

        // 1. Total matches inserted (last hour)
        const matches = await prisma.matches.findMany({
            where: { created_at: { gte: new Date(Date.now() - 3600000) } },
            include: {
                mappings: true,
                odds: true
            },
            take: 100
        });

        // 2. Resolver stats
        const logs = await prisma.matchResolutionLog.findMany({
            where: { created_at: { gte: new Date(Date.now() - 3600000) } }
        });

        const resolverStats = {
            matchedCount: logs.filter(l => l.decision === "matched").length,
            createdCount: logs.filter(l => l.decision === "created").length,
            avgConfidence: logs.length > 0
                ? logs.reduce((acc, curr) => acc + (curr.score || 0), 0) / logs.length
                : 0
        };

        // 3. Samples
        const samples = matches.slice(0, 5).map(m => ({
            matchId: m.match_id,
            sport: m.sport,
            league: m.league,
            date: m.match_date,
            mappings: m.mappings.map(map => ({ provider: map.provider, extId: map.extId })),
            oddsCount: m.odds.length
        }));

        // 4. Failed alignments
        const failedAlignments = await prisma.ingestionErrors.count({
            where: { createdAt: { gte: new Date(Date.now() - 3600000) } }
        });

        return NextResponse.json({
            phase: "Controlled Cold Start Checkpoint",
            timestamp: new Date().toISOString(),
            metrics: {
                totalMatchesInserted: matches.length,
                resolverStats,
                samples,
                failedAlignmentsCount: failedAlignments
            }
        });

    } catch (e: any) {
        return NextResponse.json({ status: "error", message: e.message }, { status: 500 });
    }
}
