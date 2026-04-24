import { prisma } from "@/lib/prisma";
import { computeTeamSimilarity } from "@/utils/stringSimilarity";
import { computeTimeScore } from "@/utils/timeScore";
import crypto from "crypto";

interface ResolutionInput {
    provider: string;
    extId: string;
    sport: string;
    league: string;
    homeTeam: string;
    awayTeam: string;
    startTime: Date;
}

interface ResolutionOutput {
    matchId: string;
    score: number;
    decision: "matched" | "created";
    confidenceLevel: "high" | "medium" | "low";
}

/**
 * Resolves a match across providers or creates a new canonical record.
 * Implements sport-specific time proximity rules (SSOT).
 */
export async function resolveMatch(input: ResolutionInput): Promise<ResolutionOutput> {
    const { provider, extId, sport, league, homeTeam, awayTeam, startTime } = input;

    // STEP 1: Check ExternalMatchMap for existing mapping
    const existingMap = await prisma.externalMatchMap.findUnique({
        where: { provider_extId: { provider, extId } },
    });

    if (existingMap) {
        const output: ResolutionOutput = {
            matchId: existingMap.matchId,
            score: 1.0,
            decision: "matched",
            confidenceLevel: "high",
        };

        await logResolution(input, output, {
            teamSimilarity: 1.0,
            timeScore: 1.0,
            leagueScore: 1.0,
        });

        return output;
    }

    // STEP 2: Candidate Search with DYNAMIC Time Proximity
    // Baseball: 簣45 mins (to avoid merging doubleheaders)
    // Others (Football/Basketball): 簣2 hours
    const windowMs = sport.toLowerCase() === "baseball" ? 45 * 60 * 1000 : 2 * 60 * 60 * 1000;

    const timeLower = new Date(startTime.getTime() - windowMs);
    const timeUpper = new Date(startTime.getTime() + windowMs);

    const candidates = await prisma.match.findMany({
        where: {
            sport,
            match_date: {
                gte: timeLower,
                lte: timeUpper,
            },
        },
        include: {
            home_team: true,
            away_team: true,
        },
    });

    let bestMatch: any = null;
    let maxScore = 0;
    let bestFactors = { teamSimilarity: 0, timeScore: 0, leagueScore: 0 };

    // STEP 3: Scoring System
    for (const candidate of candidates) {
        const teamSim = (
            computeTeamSimilarity(homeTeam, candidate.home_team?.full_name ?? "") +
            computeTeamSimilarity(awayTeam, candidate.away_team?.full_name ?? "")
        ) / 2;

        const timeScore = computeTimeScore(startTime, candidate.match_date, windowMs);
        const leagueScore = (league === candidate.league) ? 1.0 : 0.0;

        // FINAL SCORE: 50% Team + 30% Time + 20% League
        const currentScore = (teamSim * 0.5) + (timeScore * 0.3) + (leagueScore * 0.2);

        if (currentScore > maxScore) {
            maxScore = currentScore;
            bestMatch = candidate;
            bestFactors = { teamSimilarity: teamSim, timeScore, leagueScore };
        }
    }

    // STEP 4: Decision Rule
    let decision: "matched" | "created";
    let finalMatchId: string;
    const confidenceLevel = maxScore >= 0.9 ? "high" : maxScore >= 0.85 ? "medium" : "low";

    if (maxScore >= 0.85 && bestMatch) {
        decision = "matched";
        finalMatchId = bestMatch.match_id;

        // Persist mapping to ExternalMatchMap
        await prisma.externalMatchMap.create({
            data: {
                matchId: finalMatchId,
                provider,
                extId,
                match_date: startTime,
                home_team: homeTeam,
                away_team: awayTeam,
            },
        });
    } else {
        // STEP 5: Create Canonical Match (SSOT Principle)
        decision = "created";

        const internalHomeTeam = await resolveInternalTeam(homeTeam, sport);
        const internalAwayTeam = await resolveInternalTeam(awayTeam, sport);

        const newMatch = await prisma.match.create({
            data: {
                sport,
                league,
                home_team_id: internalHomeTeam.team_id,
                away_team_id: internalAwayTeam.team_id,
                match_date: startTime,
                status: "scheduled",
            },
        });

        finalMatchId = newMatch.match_id;

        // Persist mapping for this provider
        await prisma.externalMatchMap.create({
            data: {
                matchId: finalMatchId,
                provider,
                extId,
                match_date: startTime,
                home_team: homeTeam,
                away_team: awayTeam,
            },
        });
    }

    const output: ResolutionOutput = {
        matchId: finalMatchId,
        score: maxScore,
        decision,
        confidenceLevel,
    };

    // STEP 6: Audit Log (Mandatory)
    await logResolution(input, output, bestFactors);

    return output;
}

/**
 * Helper to log resolution decisions.
 */
async function logResolution(
    input: ResolutionInput,
    output: ResolutionOutput,
    factors: { teamSimilarity: number; timeScore: number; leagueScore: number }
) {
    await prisma.matchResolutionLog.create({
        data: {
            inputProvider: input.provider,
            inputExtId: input.extId,
            candidateMatchId: output.decision === "matched" ? output.matchId : null,
            finalMatchId: output.matchId,
            score: output.score,
            decision: output.decision,
            factors: factors as any, // Store as JSON
            confidenceLevel: output.confidenceLevel,
        },
    });
}

/**
 * Helper to find internal team by name or create a placeholder.
 */
async function resolveInternalTeam(name: string, sport: string) {
    const leagueTypeMap: Record<string, string> = {
        "football": "SOCCER",
        "basketball": "NBA",
        "baseball": "MLB"
    };
    const leagueType = leagueTypeMap[sport.toLowerCase()] || "SOCCER";

    const team = await prisma.team.findFirst({
        where: { full_name: { contains: name, mode: "insensitive" } },
    });

    if (team) return team;

    return await prisma.team.create({
        data: {
            team_id: `ext-${crypto.randomUUID()}`,
            full_name: name,
            short_name: name.substring(0, 3).toUpperCase(),
            league_type: leagueType as any,
        },
    });
}
