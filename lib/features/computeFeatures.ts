import { prisma } from "../prisma";

export async function computeMatchFeatures(matchId: string) {
    const match = await prisma.matches.findUnique({
        where: { match_id: matchId },
        include: {
            home_team: true,
            away_team: true
        }
    });

    if (!match) throw new Error(`Match ${matchId} not found`);

    // Fetch latest TEAM_STATE snapshots for home and away teams
    const [homeState, awayState] = await Promise.all([
        prisma.eventSnapshot.findFirst({
            where: { match_id: match.home_team_id, snapshot_type: "TEAM_STATE" },
            orderBy: { created_at: "desc" }
        }),
        prisma.eventSnapshot.findFirst({
            where: { match_id: match.away_team_id, snapshot_type: "TEAM_STATE" },
            orderBy: { created_at: "desc" }
        })
    ]);

    const h = (homeState?.state_json as any) || { team_strength: 50, fatigue: 0.5, momentum: 0.5 };
    const a = (awayState?.state_json as any) || { team_strength: 50, fatigue: 0.5, momentum: 0.5 };

    // Calculate Deltas (v1.0 logic)
    const xgdDiff = h.team_strength - a.team_strength;
    const fatigueDiff = h.fatigue - a.fatigue;
    const motivationDiff = h.momentum - a.momentum;

    // Upsert MatchFeatures
    await prisma.matchFeatures.upsert({
        where: {
            match_id_featureVersion_teamType: {
                match_id: matchId,
                featureVersion: "v1.0",
                teamType: "diff"
            }
        },
        update: {
            xgdDiff,
            fatigueDiff,
            motivationDiff
        },
        create: {
            match_id: matchId,
            featureVersion: "v1.0",
            teamType: "diff",
            xgdDiff,
            fatigueDiff,
            motivationDiff
        }
    });

    return { xgdDiff, fatigueDiff, motivationDiff };
}
